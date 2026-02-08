// Sarvam TTS Background Service Worker
import { 
  API_ENDPOINT, 
  DEFAULT_SAMPLE_RATE,
  MESSAGE_TYPES, 
  PLAYBACK_STATES,
  STORAGE_KEYS,
  DEFAULTS
} from '../shared/constants.js';
import { logger } from '../shared/logger.js';

// State
let currentState = PLAYBACK_STATES.IDLE;
let offscreenDocumentExists = false;

// Chunk playback state
let textChunks = [];
let currentChunkIndex = 0;
let playbackSettings = null;
let currentAbortController = null;

// Max characters per chunk (API limit is ~2500, we use 2000 to be safe)
const MAX_CHUNK_SIZE = 2000;

// Split text into chunks at sentence boundaries
function splitTextIntoChunks(text) {
  if (text.length <= MAX_CHUNK_SIZE) {
    return [text];
  }
  
  const chunks = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_SIZE) {
      chunks.push(remaining.trim());
      break;
    }
    
    // Find a good break point (sentence end, then comma, then space)
    let breakPoint = -1;
    const searchEnd = Math.min(remaining.length, MAX_CHUNK_SIZE);
    
    // Look for sentence endings (. ! ?)
    for (let i = searchEnd - 1; i > MAX_CHUNK_SIZE * 0.5; i--) {
      if (['.', '!', '?', '।'].includes(remaining[i]) && remaining[i + 1] === ' ') {
        breakPoint = i + 1;
        break;
      }
    }
    
    // Fallback to comma or space
    if (breakPoint === -1) {
      for (let i = searchEnd - 1; i > MAX_CHUNK_SIZE * 0.5; i--) {
        if (remaining[i] === ',' || remaining[i] === ' ') {
          breakPoint = i + 1;
          break;
        }
      }
    }
    
    // Last resort: hard cut
    if (breakPoint === -1) {
      breakPoint = MAX_CHUNK_SIZE;
    }
    
    chunks.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return chunks;
}

// ========================================
// Context Menu Setup
// ========================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sarvam-read-text',
    title: 'Read with Sarvam TTS',
    contexts: ['selection']
  });
  
  logger.log('Sarvam TTS extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'sarvam-read-text' && info.selectionText) {
    await handlePlayRequest(info.selectionText);
  }
});

// ========================================
// Message Handling
// ========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case MESSAGE_TYPES.GET_PLAYBACK_STATE:
        // Return current playback state to popup
        sendResponse({ state: currentState });
        return;
        
      case MESSAGE_TYPES.PLAY_TTS:
        await handlePlayRequest(message.text, message.language, message.speaker, message.pace, message.model);
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.PAUSE_TTS:
        await sendToOffscreen(MESSAGE_TYPES.PAUSE_AUDIO);
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.RESUME_TTS:
        await sendToOffscreen(MESSAGE_TYPES.RESUME_AUDIO);
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.STOP_TTS:
        // Abort any in-flight API request
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = null;
        }
        // Clear chunk queue when stopping
        textChunks = [];
        currentChunkIndex = 0;
        playbackSettings = null;
        await sendToOffscreen(MESSAGE_TYPES.STOP_AUDIO);
        sendResponse({ success: true });
        break;
        
      case MESSAGE_TYPES.AUDIO_STATE_UPDATE:
        // Forward state update from offscreen to popup
        currentState = message.state;
        
        // If audio ended and there are more chunks, play next
        if (message.state === PLAYBACK_STATES.IDLE && textChunks.length > 0 && currentChunkIndex < textChunks.length) {
          // Play next chunk
          await playCurrentChunk();
        } else if (message.state === PLAYBACK_STATES.IDLE) {
          // All chunks done, clear state
          textChunks = [];
          currentChunkIndex = 0;
          playbackSettings = null;
          // Close offscreen document to free resources (await to prevent race)
          await closeOffscreenDocument();
          broadcastStateUpdate(message.state, message.error);
        } else {
          broadcastStateUpdate(message.state, message.error);
        }
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
        break;
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ========================================
// TTS API Integration
// ========================================

async function handlePlayRequest(text, language, speaker, pace, model) {
  try {
    // Update state to loading
    broadcastStateUpdate(PLAYBACK_STATES.LOADING);
    
    // Get API key
    const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
    const apiKey = result[STORAGE_KEYS.API_KEY];
    
    if (!apiKey) {
      broadcastStateUpdate(PLAYBACK_STATES.ERROR, 'API key not configured');
      return;
    }
    
    // Get settings if not provided
    if (!language || !speaker || pace === undefined || !model) {
      const settings = await chrome.storage.local.get([
        STORAGE_KEYS.LANGUAGE,
        STORAGE_KEYS.SPEAKER,
        STORAGE_KEYS.PACE,
        STORAGE_KEYS.MODEL
      ]);
      language = language || settings[STORAGE_KEYS.LANGUAGE] || DEFAULTS.language;
      speaker = speaker || settings[STORAGE_KEYS.SPEAKER] || DEFAULTS.speaker;
      pace = pace ?? settings[STORAGE_KEYS.PACE] ?? DEFAULTS.pace;
      model = model || settings[STORAGE_KEYS.MODEL] || DEFAULTS.model;
    }
    
    // Split text into chunks for long content
    textChunks = splitTextIntoChunks(text);
    currentChunkIndex = 0;
    playbackSettings = { apiKey, language, speaker, pace, model };
    
    logger.log(`Playing ${textChunks.length} chunk(s)`);
    
    // Play first chunk
    await playCurrentChunk();
    
  } catch (error) {
    logger.error('TTS request failed:', error);
    textChunks = [];
    currentChunkIndex = 0;
    playbackSettings = null;
    broadcastStateUpdate(PLAYBACK_STATES.ERROR, sanitizeError(error.message));
  }
}

// Play the current chunk
async function playCurrentChunk() {
  if (currentChunkIndex >= textChunks.length || !playbackSettings) {
    return;
  }
  
  try {
    broadcastStateUpdate(PLAYBACK_STATES.LOADING);
    
    // Create abort controller for this request
    currentAbortController = new AbortController();
    
    const chunkText = textChunks[currentChunkIndex];
    currentChunkIndex++;
    
    const audio = await fetchTTSAudio(
      playbackSettings.apiKey,
      chunkText,
      playbackSettings.language,
      playbackSettings.speaker,
      playbackSettings.pace,
      playbackSettings.model,
      currentAbortController.signal
    );
    
    currentAbortController = null;
    
    if (audio) {
      await ensureOffscreenDocument();
      await sendToOffscreen(MESSAGE_TYPES.PLAY_AUDIO, { audio, codec: 'wav' });
    }
  } catch (error) {
    currentAbortController = null;
    if (error.name === 'AbortError') return;
    logger.error('Chunk playback failed:', error);
    textChunks = [];
    currentChunkIndex = 0;
    playbackSettings = null;
    broadcastStateUpdate(PLAYBACK_STATES.ERROR, sanitizeError(error.message));
  }
}

async function fetchTTSAudio(apiKey, text, language, speaker, pace, model, signal) {
  const payload = {
    text: text,
    target_language_code: language,
    speaker: speaker,
    model: model || DEFAULTS.model,
    speech_sample_rate: DEFAULT_SAMPLE_RATE,
    output_audio_codec: 'wav',
    pace: pace
  };
  
  logger.log('Sending TTS request:', { ...payload, text: text.substring(0, 50) + '...' });
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey
    },
    body: JSON.stringify(payload),
    signal
  });
  
  if (!response.ok) {
    // Log error response but don't include in user-facing message
    const errorText = await response.text();
    const truncatedError = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
    logger.error('API error:', response.status, truncatedError);
    
    if (response.status === 403) {
      throw new Error('Invalid API key');
    } else if (response.status === 429) {
      throw new Error('API quota exceeded');
    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Sarvam API temporarily unavailable. Please try again in a moment.');
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  }
  
  // Parse JSON response with error handling
  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    logger.error('Failed to parse API response:', parseError);
    throw new Error('Invalid response from API');
  }
  
  if (data.audios && data.audios.length > 0) {
    const audio = data.audios[0];
    // Validate audio data
    if (typeof audio !== 'string' || audio.length === 0) {
      throw new Error('Invalid audio data received from API');
    }
    // Reject unreasonably large payloads (> 50MB base64)
    if (audio.length > 50 * 1024 * 1024) {
      throw new Error('Audio data exceeds maximum size limit');
    }
    return audio;
  }
  
  throw new Error('No audio returned from API');
}

// ========================================
// Offscreen Document Management
// ========================================

async function ensureOffscreenDocument() {
  // Always verify with Chrome API to handle stale flag
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length > 0) {
    offscreenDocumentExists = true;
    return;
  }
  
  offscreenDocumentExists = false;
  
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play TTS audio from Sarvam API'
  });
  
  offscreenDocumentExists = true;
  
  // Wait for offscreen script to register its message listener
  await new Promise(resolve => setTimeout(resolve, 50));
  
  logger.log('Created offscreen document');
}

async function closeOffscreenDocument() {
  if (!offscreenDocumentExists) return;
  try {
    await chrome.offscreen.closeDocument();
  } catch (e) {
    // Ignore - document may already be closed
  }
  offscreenDocumentExists = false;
}

// Sanitize error messages to avoid leaking internal details
function sanitizeError(message) {
  if (!message) return 'An unknown error occurred';
  const safeMessages = [
    'Invalid API key',
    'API quota exceeded',
    'No audio returned from API',
    'Invalid audio data received from API',
    'Audio data exceeds maximum size limit',
    'Invalid response from API',
    'Sarvam API temporarily unavailable. Please try again in a moment.',
    'API key not configured'
  ];
  for (const safe of safeMessages) {
    if (message.includes(safe)) return safe;
  }
  // Only allow "API error: <number>" format, nothing else
  if (message.startsWith('API error:')) {
    const statusMatch = message.match(/^API error:\s*(\d{3})$/);
    if (statusMatch) {
      return `API error: ${statusMatch[1]}`;
    }
    // If it doesn't match the expected format, return generic message
    return 'TTS request failed. Please try again.';
  }
  return 'TTS request failed. Please try again.';
}

async function sendToOffscreen(type, data = {}) {
  try {
    await ensureOffscreenDocument();
    // Don't await - offscreen doesn't send a response
    chrome.runtime.sendMessage({ type, ...data });
  } catch (error) {
    logger.error('Failed to send to offscreen:', error);
  }
}

// ========================================
// State Broadcasting
// ========================================

// Cache active tab to avoid repeated queries
let cachedActiveTab = null;
let tabCacheTimeout = null;

function invalidateTabCache() {
  cachedActiveTab = null;
  if (tabCacheTimeout) {
    clearTimeout(tabCacheTimeout);
    tabCacheTimeout = null;
  }
}

async function getActiveTab() {
  if (cachedActiveTab) return cachedActiveTab;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      cachedActiveTab = tab;
      // Invalidate cache after 2 seconds
      tabCacheTimeout = setTimeout(invalidateTabCache, 2000);
    }
    return tab;
  } catch (e) {
    return null;
  }
}

// Invalidate tab cache on tab/window changes
chrome.tabs.onActivated?.addListener(() => invalidateTabCache());
chrome.windows.onFocusChanged?.addListener(() => invalidateTabCache());

async function broadcastStateUpdate(state, error = null) {
  currentState = state;
  
  // Broadcast to all extension pages (popup, etc.)
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.PLAYBACK_STATE_UPDATE,
    state,
    error
  }).catch(() => {});
  
  // Get tab once and use for both broadcast and highlighting
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
    return;
  }
  
  // Broadcast to content scripts
  chrome.tabs.sendMessage(tab.id, {
    type: MESSAGE_TYPES.PLAYBACK_STATE_UPDATE,
    state,
    error
  }).catch(() => {});
  
  // Handle highlighting
  if (state === PLAYBACK_STATES.PLAYING) {
    chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.HIGHLIGHT_TEXT }).catch(() => {});
  } else if (state === PLAYBACK_STATES.IDLE || state === PLAYBACK_STATES.ERROR) {
    chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.CLEAR_HIGHLIGHT }).catch(() => {});
  }
}


logger.log('Sarvam TTS Background service worker started');

//  Vani: Indic TTS Popup Script
import { 
  LANGUAGES,
  MODELS,
  MODEL_SPEAKERS,
  DEFAULTS, 
  MESSAGE_TYPES, 
  PLAYBACK_STATES,
  STORAGE_KEYS,
  MODEL_LIMITS,
  DEFAULT_TEXT_LIMIT
} from '../shared/constants.js';
import { logger } from '../shared/logger.js';

// DOM Elements
const elements = {
  // API Section
  apiSection: document.getElementById('apiSection'),
  toggleApiSection: document.getElementById('toggleApiSection'),
  apiContent: document.getElementById('apiContent'),
  apiKey: document.getElementById('apiKey'),
  togglePassword: document.getElementById('togglePassword'),
  saveApiKey: document.getElementById('saveApiKey'),
  apiStatus: document.getElementById('apiStatus'),
  badge: document.querySelector('.badge'),
  
  // Settings
  model: document.getElementById('model'),
  language: document.getElementById('language'),
  speaker: document.getElementById('speaker'),
  pace: document.getElementById('pace'),
  paceValue: document.getElementById('paceValue'),
  detectedLang: document.getElementById('detectedLang'),
  
  // Text Display
  selectedText: document.getElementById('selectedText'),
  charCount: document.getElementById('charCount'),
  
  // Controls
  playPauseBtn: document.getElementById('playPauseBtn'),
  playIcon: document.getElementById('playIcon'),
  pauseIcon: document.getElementById('pauseIcon'),
  stopBtn: document.getElementById('stopBtn'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  statusMessage: document.getElementById('statusMessage')
};

// State
let currentState = PLAYBACK_STATES.IDLE;
let currentText = '';

// Initialize popup
async function init() {
  const settings = await loadSettings();
  const storedModel = settings[STORAGE_KEYS.MODEL] || DEFAULTS.model;
  populateDropdowns(storedModel);
  setupEventListeners();
  await fetchSelectedText();
  
  // Sync playback state with background (for when popup is reopened during playback)
  await syncPlaybackState();
  
  // Detect page language and auto-select if available
  await detectPageLanguage();
  
  // Check if API key exists
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  if (result[STORAGE_KEYS.API_KEY]) {
    elements.apiSection.classList.add('collapsed');
    showApiStatus('API key configured', 'success');
  }
}

// Sync playback state with background service worker
async function syncPlaybackState() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_PLAYBACK_STATE
    });
    if (response?.state) {
      updatePlaybackState(response.state);
    }
  } catch (error) {
    logger.log('Could not get playback state:', error);
  }
}

// Detect page language and auto-select in dropdown
async function detectPageLanguage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) return;
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_PAGE_LANGUAGE
    });
    
    if (response?.language) {
      // Normalize the language code (e.g., "hi" -> "hi-IN", "en" -> "en-IN")
      const detectedLang = normalizeLanguageCode(response.language);
      
      if (detectedLang) {
        // Auto-select detected language (prioritize over saved preference)
        const currentLang = elements.language.value;
        if (currentLang !== detectedLang) {
          elements.language.value = detectedLang;
          // Note: We don't save to storage here to avoid overwriting user's global preference
          // with a page-specific one. The dropdown update is enough for playback.
        }
        
        // Show detected language indicator
        const langName = LANGUAGES.find(l => l.code === detectedLang)?.label || detectedLang;
        elements.detectedLang.textContent = `(Detected: ${langName.split(' ')[0]})`;
      }
    }
  } catch (error) {
    logger.log('Could not detect page language:', error);
  }
}

// Normalize language codes to match our supported languages
function normalizeLanguageCode(langCode) {
  if (!langCode) return null;
  
  // Extract base language (e.g., "hi-IN" -> "hi", "en-US" -> "en")
  const baseLang = langCode.split('-')[0].toLowerCase();
  
  // Map to our supported language codes
  const langMap = {
    'hi': 'hi-IN',
    'en': 'en-IN',
    'bn': 'bn-IN',
    'gu': 'gu-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'mr': 'mr-IN',
    'or': 'od-IN',  // Odia
    'od': 'od-IN',
    'pa': 'pa-IN',
    'ta': 'ta-IN',
    'te': 'te-IN'
  };
  
  // If the exact code matches, use it
  if (LANGUAGES.some(l => l.code === langCode)) {
    return langCode;
  }
  
  // Otherwise try to map base language
  return langMap[baseLang] || null;
}

// Load saved settings
async function loadSettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.LANGUAGE,
    STORAGE_KEYS.SPEAKER,
    STORAGE_KEYS.PACE,
    STORAGE_KEYS.MODEL
  ]);
  
  if (result[STORAGE_KEYS.API_KEY]) {
    elements.apiKey.value = result[STORAGE_KEYS.API_KEY];
  }
  
  // Load pace setting
  const pace = result[STORAGE_KEYS.PACE] || DEFAULTS.pace;
  elements.pace.value = pace;
  updatePaceDisplay(pace);
  
  return result;
}

// Populate language and speaker dropdowns
function populateDropdowns(modelId = DEFAULTS.model) {
  // Models (only populate if empty)
  if (elements.model.options.length === 0) {
    MODELS.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      option.title = model.description;
      elements.model.appendChild(option);
    });
  }

  // Languages (only populate if empty)
  if (elements.language.options.length === 0) {
    LANGUAGES.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.label;
      elements.language.appendChild(option);
    });
  }
  
  // Speakers - repopulate based on model
  elements.speaker.innerHTML = '';
  const speakers = MODEL_SPEAKERS[modelId] || MODEL_SPEAKERS[DEFAULTS.model];
  
  speakers.forEach(speaker => {
    const option = document.createElement('option');
    option.value = speaker.id;
    option.textContent = `${speaker.name} (${speaker.gender})`;
    elements.speaker.appendChild(option);
  });
  
  // Restore saved selections or defaults
  chrome.storage.local.get([STORAGE_KEYS.LANGUAGE, STORAGE_KEYS.SPEAKER, STORAGE_KEYS.MODEL], (result) => {
    // Only set values if they match the options (to avoid invalid selections)
    if (!elements.language.value) {
      elements.language.value = result[STORAGE_KEYS.LANGUAGE] || DEFAULTS.language;
    }
    
    // Set model if not already set (or if we're repopulating due to change)
    if (elements.model.value !== modelId) {
       elements.model.value = modelId;
    } else if (!elements.model.value) {
       elements.model.value = result[STORAGE_KEYS.MODEL] || DEFAULTS.model;
    }

    // Try to restore speaker, fallback to first available if not found in new list
    const savedSpeaker = result[STORAGE_KEYS.SPEAKER];
    if (savedSpeaker && speakers.some(s => s.id === savedSpeaker)) {
      elements.speaker.value = savedSpeaker;
    } else if (speakers.length > 0) {
      elements.speaker.value = speakers[0].id;
      // Update storage with valid speaker for this model
      chrome.storage.local.set({ [STORAGE_KEYS.SPEAKER]: speakers[0].id });
    }
  });
}

// Update model badge text
function updateModelBadge(modelId) {
  const model = MODELS.find(m => m.id === modelId);
  if (model && elements.badge) {
    elements.badge.textContent = model.name;
  }
}

// Setup event listeners
function setupEventListeners() {
  // API Section toggle
  elements.toggleApiSection.addEventListener('click', () => {
    elements.apiSection.classList.toggle('collapsed');
  });
  
  // Toggle password visibility
  elements.togglePassword.addEventListener('click', () => {
    const type = elements.apiKey.type === 'password' ? 'text' : 'password';
    elements.apiKey.type = type;
  });
  
  // Save API key
  elements.saveApiKey.addEventListener('click', saveApiKey);
  
  // Settings changes
  elements.model.addEventListener('change', () => {
    const newModel = elements.model.value;
    chrome.storage.local.set({ [STORAGE_KEYS.MODEL]: newModel });
    updateModelBadge(newModel);
    
    // Repopulate speakers for the new model
    populateDropdowns(newModel);
    
    // Re-validate text length with new model limit
    updateTextDisplay(currentText);
  });

  elements.language.addEventListener('change', () => {
    chrome.storage.local.set({ [STORAGE_KEYS.LANGUAGE]: elements.language.value });
  });
  
  elements.speaker.addEventListener('change', () => {
    chrome.storage.local.set({ [STORAGE_KEYS.SPEAKER]: elements.speaker.value });
  });
  
  // Pace slider - debounce storage writes
  let paceDebounceTimer = null;
  elements.pace.addEventListener('input', () => {
    const pace = parseFloat(elements.pace.value);
    updatePaceDisplay(pace);
    if (paceDebounceTimer) clearTimeout(paceDebounceTimer);
    paceDebounceTimer = setTimeout(() => {
      chrome.storage.local.set({ [STORAGE_KEYS.PACE]: pace });
      paceDebounceTimer = null;
    }, 300);
  });
  
  // Playback controls
  elements.playPauseBtn.addEventListener('click', handlePlayPause);
  elements.stopBtn.addEventListener('click', handleStop);
  
  // Listen for state updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.PLAYBACK_STATE_UPDATE) {
      updatePlaybackState(message.state, message.error);
    }
  });
}

// Save API key
async function saveApiKey() {
  const key = elements.apiKey.value.trim();
  
  if (!key) {
    showApiStatus('Please enter an API key', 'error');
    return;
  }
  
  // Validate API key format
  if (key.length < 10 || key.length > 256) {
    showApiStatus('Invalid API key length', 'error');
    return;
  }
  if (!/^[a-zA-Z0-9_\-.:]+$/.test(key)) {
    showApiStatus('API key contains invalid characters', 'error');
    return;
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: key });
  showApiStatus('API key saved successfully', 'success');
  
  setTimeout(() => {
    elements.apiSection.classList.add('collapsed');
  }, 1000);
}

function showApiStatus(message, type) {
  elements.apiStatus.textContent = message;
  elements.apiStatus.className = `hint ${type}`;
}

// Fetch selected text from active tab
async function fetchSelectedText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      updateTextDisplay('');
      return;
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: MESSAGE_TYPES.GET_SELECTED_TEXT 
    });
    
    if (response?.text) {
      updateTextDisplay(response.text);
    }
  } catch (error) {
    logger.log('Could not get selected text:', error);
    updateTextDisplay('');
  }
}

// Get max length for current model
function getMaxLength() {
  const modelId = elements.model.value || DEFAULTS.model;
  return MODEL_LIMITS[modelId] || DEFAULT_TEXT_LIMIT;
}

// Update text display
function updateTextDisplay(text) {
  currentText = text;
  
  if (text) {
    elements.selectedText.innerHTML = `<p>${escapeHtml(text)}</p>`;
    
    const charCount = text.length;
    const limit = getMaxLength();
    elements.charCount.textContent = `${charCount} / ${limit} characters`;
    
    if (charCount > limit) {
      elements.charCount.className = 'char-count error';
    } else if (charCount > limit * 0.8) {
      elements.charCount.className = 'char-count warning';
    } else {
      elements.charCount.className = 'char-count';
    }
  } else {
    elements.selectedText.innerHTML = '<p class="placeholder">Click Play to read page content, or select text first</p>';
    elements.charCount.textContent = '';
  }
}

// Handle play/pause button
async function handlePlayPause() {
  // Check for API key
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  if (!result[STORAGE_KEYS.API_KEY]) {
    elements.apiSection.classList.remove('collapsed');
    showStatus('Please configure your API key first', 'error');
    return;
  }
  
  if (currentState === PLAYBACK_STATES.PLAYING) {
    // Pause
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.PAUSE_TTS }).catch(console.error);
  } else if (currentState === PLAYBACK_STATES.PAUSED) {
    // Resume
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESUME_TTS }).catch(console.error);
  } else {
    // Play new - if no text selected, try to get page content
    let textToRead = currentText;
    let isAutoRead = false;
    
    if (!textToRead) {
      showStatus('Getting page content...', 'info');
      textToRead = await fetchPageContent();
      isAutoRead = true;
      
      if (textToRead) {
        updateTextDisplay(textToRead);
      }
    }
    
    if (!textToRead) {
      showStatus('No text available to read', 'error');
      return;
    }
    
    // Check limit before playing (skip for auto-read - background handles chunking)
    if (!isAutoRead) {
      const limit = getMaxLength();
      if (textToRead.length > limit) {
        showStatus(`Text exceeds ${limit} character limit for this model`, 'error');
        return;
      }
    }
    
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.PLAY_TTS,
      text: textToRead,
      model: elements.model.value,
      language: elements.language.value,
      speaker: elements.speaker.value,
      pace: parseFloat(elements.pace.value)
    }).catch(console.error);
  }
}

// Fetch page content when no text is selected
async function fetchPageContent() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      logger.log('No active tab found');
      return '';
    }
    
    // Check if page is accessible
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      logger.log('Cannot access content on this page:', tab.url);
      showStatus('Cannot read content from this page', 'error');
      return '';
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: MESSAGE_TYPES.GET_PAGE_CONTENT 
    });
    
    if (response?.text) {
      logger.log('Retrieved page content:', response.text.substring(0, 100) + '...');
      return response.text;
    }
    
    logger.log('No text content returned from page');
    return '';
  } catch (error) {
    logger.error('Could not get page content:', error);
    // Content script might not be loaded yet
    if (error.message?.includes('Receiving end does not exist')) {
      showStatus('Content script not ready. Please refresh the page.', 'error');
    }
    return '';
  }
}

// Handle stop button
function handleStop() {
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.STOP_TTS }).catch(console.error);
}

// Update UI based on playback state
function updatePlaybackState(state, error = null) {
  currentState = state;
  
  // Update buttons
  const isPlaying = state === PLAYBACK_STATES.PLAYING;
  const isPaused = state === PLAYBACK_STATES.PAUSED;
  const isLoading = state === PLAYBACK_STATES.LOADING;
  
  elements.playIcon.style.display = isPlaying ? 'none' : 'block';
  elements.pauseIcon.style.display = isPlaying ? 'block' : 'none';
  
  elements.playPauseBtn.disabled = isLoading;
  elements.stopBtn.disabled = state === PLAYBACK_STATES.IDLE;
  
  // Loading indicator
  elements.loadingIndicator.style.display = isLoading ? 'flex' : 'none';
  
  // Status message
  if (error) {
    showStatus(error, 'error');
  } else if (isPlaying) {
    showStatus('Playing...', 'success');
  } else if (isPaused) {
    showStatus('Paused', '');
  } else if (isLoading) {
    showStatus('', '');
  } else {
    showStatus('', '');
  }
}

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
}

// Update pace display value
function updatePaceDisplay(pace) {
  elements.paceValue.textContent = `${pace.toFixed(1)}x`;
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

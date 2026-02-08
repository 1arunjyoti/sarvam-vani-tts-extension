// Sarvam TTS Offscreen Audio Player
import { MESSAGE_TYPES, PLAYBACK_STATES } from '../shared/constants.js';
import { logger } from '../shared/logger.js';

let audioElement = null;

// Send state update to background
function sendStateUpdate(state, error = null) {
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.AUDIO_STATE_UPDATE,
    state,
    error
  }).catch(() => {
    // Ignore - we don't need a response for state updates
  });
}

// Play audio from base64 data
async function playAudio(base64Audio, codec = 'wav') {
  try {
    // Stop any existing audio
    stopAudio();
    
    // Validate base64 input
    if (typeof base64Audio !== 'string' || base64Audio.length === 0) {
      throw new Error('Invalid audio data');
    }
    
    // Decode base64 to binary
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and URL
    const mimeType = getMimeType(codec);
    const blob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);
    
    // Create and configure audio element
    audioElement = new Audio(audioUrl);
    
    audioElement.onplay = () => {
      sendStateUpdate(PLAYBACK_STATES.PLAYING);
    };
    
    audioElement.onpause = () => {
      if (!audioElement.ended) {
        sendStateUpdate(PLAYBACK_STATES.PAUSED);
      }
    };
    
    audioElement.onended = () => {
      sendStateUpdate(PLAYBACK_STATES.IDLE);
      cleanup();
    };
    
    audioElement.onerror = (e) => {
      const mediaError = e.target?.error;
      const errorMessage = mediaError ? `${mediaError.code}: ${mediaError.message}` : 'Unknown audio error';
      logger.error('Audio playback error:', errorMessage, mediaError);
      sendStateUpdate(PLAYBACK_STATES.ERROR, 'Failed to play audio: ' + errorMessage);
      cleanup();
    };
    
    // Play the audio
    await audioElement.play();
    
  } catch (error) {
    logger.error('Error playing audio:', error);
    sendStateUpdate(PLAYBACK_STATES.ERROR, error.message);
    cleanup();
  }
}

// Pause audio
function pauseAudio() {
  if (audioElement && !audioElement.paused) {
    audioElement.pause();
  }
}

// Resume audio
function resumeAudio() {
  if (audioElement && audioElement.paused) {
    audioElement.play().catch((error) => {
      logger.error('Resume failed:', error);
      sendStateUpdate(PLAYBACK_STATES.ERROR, 'Failed to resume audio');
      cleanup();
    });
  }
}

// Stop audio
function stopAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    cleanup();
    sendStateUpdate(PLAYBACK_STATES.IDLE);
  }
}

// Cleanup resources
function cleanup() {
  if (audioElement) {
    // Remove event handlers FIRST to prevent false error triggers
    audioElement.onplay = null;
    audioElement.onpause = null;
    audioElement.onended = null;
    audioElement.onerror = null;
    
    const src = audioElement.src;
    audioElement.src = '';
    audioElement = null;
    
    if (src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  }
}

// Get MIME type for codec
function getMimeType(codec) {
  const mimeTypes = {
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg',
    'opus': 'audio/opus',
    'flac': 'audio/flac',
    'aac': 'audio/aac'
  };
  return mimeTypes[codec] || 'audio/wav';
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MESSAGE_TYPES.PLAY_AUDIO:
      playAudio(message.audio, message.codec);
      return false; // Handled synchronously, no async response needed
      
    case MESSAGE_TYPES.PAUSE_AUDIO:
      pauseAudio();
      return false;
      
    case MESSAGE_TYPES.RESUME_AUDIO:
      resumeAudio();
      return false;
      
    case MESSAGE_TYPES.STOP_AUDIO:
      stopAudio();
      return false;
  }
  
  // Message not handled by this listener
  return false;
});

logger.log('Sarvam TTS Offscreen document ready');

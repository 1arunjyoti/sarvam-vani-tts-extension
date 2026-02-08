// Vani: Indic TTS API Configuration
export const API_ENDPOINT = "https://api.sarvam.ai/text-to-speech";
export const DEFAULT_SAMPLE_RATE = 24000;

// Available Models
export const MODELS = [
  { id: "bulbul:v3", name: "Bulbul v3", description: "Latest model with improved quality" },
  { id: "bulbul:v2", name: "Bulbul v2", description: "Previous generation model" },
];

// Supported Languages
export const LANGUAGES = [
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
  { code: "en-IN", label: "English (India)" },
  { code: "bn-IN", label: "Bengali (বাংলা)" },
  { code: "gu-IN", label: "Gujarati (ગુજરાતી)" },
  { code: "kn-IN", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml-IN", label: "Malayalam (മലയാളം)" },
  { code: "mr-IN", label: "Marathi (मराठी)" },
  { code: "od-IN", label: "Odia (ଓଡ଼ିଆ)" },
  { code: "pa-IN", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
];

// Available Speakers for bulbul:v3
export const SPEAKERS_V3 = [
  { id: "shubh", name: "Shubh", gender: "male" },
  { id: "aditya", name: "Aditya", gender: "male" },
  { id: "ritu", name: "Ritu", gender: "female" },
  { id: "priya", name: "Priya", gender: "female" },
  { id: "neha", name: "Neha", gender: "female" },
  { id: "rahul", name: "Rahul", gender: "male" },
  { id: "pooja", name: "Pooja", gender: "female" },
  { id: "rohan", name: "Rohan", gender: "male" },
  { id: "simran", name: "Simran", gender: "female" },
  { id: "kavya", name: "Kavya", gender: "female" },
  { id: "amit", name: "Amit", gender: "male" },
  { id: "dev", name: "Dev", gender: "male" },
  { id: "ishita", name: "Ishita", gender: "female" },
  { id: "shreya", name: "Shreya", gender: "female" },
  { id: "ratan", name: "Ratan", gender: "male" },
  { id: "varun", name: "Varun", gender: "male" },
  { id: "manan", name: "Manan", gender: "male" },
  { id: "sumit", name: "Sumit", gender: "male" },
  { id: "roopa", name: "Roopa", gender: "female" },
  { id: "kabir", name: "Kabir", gender: "male" },
  { id: "aayan", name: "Aayan", gender: "male" },
  { id: "ashutosh", name: "Ashutosh", gender: "male" },
  { id: "advait", name: "Advait", gender: "male" },
  { id: "amelia", name: "Amelia", gender: "female" },
  { id: "sophia", name: "Sophia", gender: "female" },
  { id: "anand", name: "Anand", gender: "male" },
  { id: "tanya", name: "Tanya", gender: "female" },
  { id: "tarun", name: "Tarun", gender: "male" },
  { id: "sunny", name: "Sunny", gender: "male" },
  { id: "mani", name: "Mani", gender: "male" },
  { id: "gokul", name: "Gokul", gender: "male" },
  { id: "vijay", name: "Vijay", gender: "male" },
  { id: "shruti", name: "Shruti", gender: "female" },
  { id: "suhani", name: "Suhani", gender: "female" },
  { id: "mohit", name: "Mohit", gender: "male" },
  { id: "kavitha", name: "Kavitha", gender: "female" },
  { id: "rehan", name: "Rehan", gender: "male" },
  { id: "soham", name: "Soham", gender: "male" },
  { id: "rupali", name: "Rupali", gender: "female" },
];

// Available Speakers for bulbul:v2
export const SPEAKERS_V2 = [
  { id: "anushka", name: "Anushka", gender: "female" },
  { id: "manisha", name: "Manisha", gender: "female" },
  { id: "vidya", name: "Vidya", gender: "female" },
  { id: "arya", name: "Arya", gender: "female" },
  { id: "abhilash", name: "Abhilash", gender: "male" },
  { id: "karun", name: "Karun", gender: "male" },
  { id: "hitesh", name: "Hitesh", gender: "male" },
];

// Default export for backward compatibility
export const SPEAKERS = SPEAKERS_V3;

// Map models to speakers
export const MODEL_SPEAKERS = {
  "bulbul:v3": SPEAKERS_V3,
  "bulbul:v2": SPEAKERS_V2,
};

// Default Settings
export const DEFAULTS = {
  language: "hi-IN",
  speaker: "shubh",
  pace: 1.0,
  model: "bulbul:v3",
};

// Message Types for inter-component communication
export const MESSAGE_TYPES = {
  // Popup -> Background
  GET_SELECTED_TEXT: "GET_SELECTED_TEXT",
  GET_PLAYBACK_STATE: "GET_PLAYBACK_STATE",
  GET_PAGE_LANGUAGE: "GET_PAGE_LANGUAGE",
  PLAY_TTS: "PLAY_TTS",
  PAUSE_TTS: "PAUSE_TTS",
  RESUME_TTS: "RESUME_TTS",
  STOP_TTS: "STOP_TTS",
  
  // Content Script -> Background (Highlighting)
  HIGHLIGHT_TEXT: "HIGHLIGHT_TEXT",
  CLEAR_HIGHLIGHT: "CLEAR_HIGHLIGHT",
  
  // Content extraction
  GET_PAGE_CONTENT: "GET_PAGE_CONTENT",

  // Background -> Offscreen
  PLAY_AUDIO: "PLAY_AUDIO",
  PAUSE_AUDIO: "PAUSE_AUDIO",
  RESUME_AUDIO: "RESUME_AUDIO",
  STOP_AUDIO: "STOP_AUDIO",

  // Offscreen -> Background (state updates)
  AUDIO_STATE_UPDATE: "AUDIO_STATE_UPDATE",

  // Background -> Popup (state updates)
  PLAYBACK_STATE_UPDATE: "PLAYBACK_STATE_UPDATE",
};

// Playback States
export const PLAYBACK_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  PLAYING: "playing",
  PAUSED: "paused",
  ERROR: "error",
};

// Storage Keys
export const STORAGE_KEYS = {
  API_KEY: "sarvam_api_key",
  LANGUAGE: "selected_language",
  SPEAKER: "selected_speaker",
  PACE: "selected_pace",
  MODEL: "selected_model",
};

// Model-specific text limits (characters)
export const MODEL_LIMITS = {
  "bulbul:v3": 2500,
  "bulbul:v2": 1500,
};

// Default limit (fallback)
export const DEFAULT_TEXT_LIMIT = 2500;

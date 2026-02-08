// Conditional logging utility for development
// Set to false before publishing to production
const IS_DEV_MODE = false; // Set to false for production - CHANGE TO true FOR DEVELOPMENT

export const logger = {
  log: (...args) => {
    if (IS_DEV_MODE) console.log(...args);
  },
  
  warn: (...args) => {
    if (IS_DEV_MODE) console.warn(...args);
  },
  
  error: (...args) => {
    // Always log errors, but can be made conditional
    console.error(...args);
  },
  
  info: (...args) => {
    if (IS_DEV_MODE) console.info(...args);
  }
};

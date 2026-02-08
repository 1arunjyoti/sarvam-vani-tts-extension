//  Vani: Indic TTS Content Script
// Handles text selection and highlighting on web pages

// Inline logger for content scripts (can't use ES modules in content scripts)
const IS_DEV_MODE = false; // Set to false for production - CHANGE TO true FOR DEVELOPMENT
const logger = {
  log: (...args) => IS_DEV_MODE && console.log(...args),
  error: (...args) => console.error(...args)
};

// Message types (duplicated since content scripts can't use ES modules)
const MESSAGE_TYPES = {
  GET_SELECTED_TEXT: 'GET_SELECTED_TEXT',
  GET_PAGE_LANGUAGE: 'GET_PAGE_LANGUAGE',
  GET_PAGE_CONTENT: 'GET_PAGE_CONTENT',
  HIGHLIGHT_TEXT: 'HIGHLIGHT_TEXT',
  CLEAR_HIGHLIGHT: 'CLEAR_HIGHLIGHT'
};

// Track highlighted elements
let highlightedElements = [];

// Inject highlight styles
function injectStyles() {
  if (document.getElementById('sarvam-tts-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'sarvam-tts-styles';
  style.textContent = `
    .sarvam-tts-highlight {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%);
      border-radius: 2px;
      padding: 1px 2px;
      margin: -1px -2px;
      animation: sarvam-pulse 2s ease-in-out infinite;
    }
    
    @keyframes sarvam-pulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Remove styles when no longer needed
function removeStyles() {
  const style = document.getElementById('sarvam-tts-styles');
  if (style) {
    style.remove();
  }
}

// Get currently selected text
function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

// Get page language from HTML lang attribute
function getPageLanguage() {
  const htmlLang = document.documentElement.lang;
  if (htmlLang) return htmlLang;
  
  const metaLang = document.querySelector('meta[http-equiv="content-language"]');
  if (metaLang) return metaLang.content;
  
  return null;
}

// Extract readable content from the page
function getPageContent() {
  // Elements to skip
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'FORM', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
  // Classes commonly used to hide elements
  const hiddenClassPatterns = /\b(hidden|visually-hidden|sr-only|screen-reader|d-none|display-none|invisible|collapse|offscreen|noprint)\b/i;
  
  // Practical limit for TTS reading
  const MAX_CONTENT_LENGTH = 10000;
  
  // Try to find main content area first
  const mainContent = document.querySelector('main, article, [role="main"], .content, .post-content, .article-content, .entry-content, #mw-content-text, #bodyContent');
  const contentRoot = mainContent || document.body;
  
  if (!contentRoot) {
    return '';
  }
  
  let totalLength = 0;
  
  // Extract text from element
  function extractText(element) {
    if (!element || totalLength >= MAX_CONTENT_LENGTH) return '';
    
    // Skip certain tags
    if (skipTags.has(element.tagName)) {
      return '';
    }
    
    // Skip hidden elements
    if (element.hidden || element.getAttribute('aria-hidden') === 'true' ||
        element.style?.display === 'none' || element.style?.visibility === 'hidden' ||
        (element.className && typeof element.className === 'string' && hiddenClassPatterns.test(element.className)) ||
        element.offsetParent === null && element.tagName !== 'BODY') {
      return '';
    }
    
    // Get text from text nodes
    let text = '';
    for (const node of element.childNodes) {
      if (totalLength >= MAX_CONTENT_LENGTH) break;
      
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent;
        text += content + ' ';
        totalLength += content.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        text += extractText(node);
      }
    }
    
    return text;
  }
  
  // Get text and clean it up
  let text = extractText(contentRoot);
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Cap at max length at a word boundary
  if (text.length > MAX_CONTENT_LENGTH) {
    const cutoff = text.lastIndexOf(' ', MAX_CONTENT_LENGTH);
    text = text.substring(0, cutoff > 0 ? cutoff : MAX_CONTENT_LENGTH).trim();
  }
  
  // Get page title as prefix
  const title = document.title || '';
  if (title && !text.startsWith(title)) {
    text = title + '. ' + text;
  }
  
  return text;
}

// Highlight the current selection
function highlightSelection() {
  injectStyles();
  clearHighlights();
  
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  try {
    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    
    const span = document.createElement('span');
    span.className = 'sarvam-tts-highlight';
    
    // Wrap the selection in a highlight span
    range.surroundContents(span);
    highlightedElements.push(span);
    
    // Clear the selection so user sees the highlight
    selection.removeAllRanges();
    
    return true;
  } catch (error) {
    // surroundContents fails for complex selections spanning multiple elements
    // Fall back to simple visual indication
    logger.log('Complex selection, using simple highlight');
    return false;
  }
}

// Clear all highlights
function clearHighlights() {
  highlightedElements.forEach(el => {
    try {
      if (el.parentNode) {
        // Replace the span with its text content
        const text = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(text, el);
      }
    } catch (e) {
      // Element may be detached from DOM
    }
  });
  
  const hadHighlights = highlightedElements.length > 0;
  highlightedElements = [];
  
  // Remove styles if no highlights remain
  if (hadHighlights) {
    removeStyles();
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MESSAGE_TYPES.GET_SELECTED_TEXT:
      sendResponse({ text: getSelectedText() });
      return false;
      
    case MESSAGE_TYPES.GET_PAGE_LANGUAGE:
      sendResponse({ language: getPageLanguage() });
      return false;
      
    case MESSAGE_TYPES.HIGHLIGHT_TEXT:
      const success = highlightSelection();
      sendResponse({ success });
      return false;
      
    case MESSAGE_TYPES.CLEAR_HIGHLIGHT:
      clearHighlights();
      sendResponse({ success: true });
      return false;
      
    case MESSAGE_TYPES.GET_PAGE_CONTENT:
      sendResponse({ text: getPageContent() });
      return false;
  }
  return false;
});

logger.log('Indic TTS content script loaded');

// Initialize floating player
let floatingPlayer = null;
if (window.SarvamFloatingPlayer) {
  floatingPlayer = new window.SarvamFloatingPlayer();
}


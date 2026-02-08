// Floating Player for Sarvam TTS
// Creates a draggable mini player on the page

(function() {
  'use strict';
  
  // Message types (scoped to this IIFE to avoid conflicts)
  const MESSAGE_TYPES = {
    PAUSE_TTS: 'PAUSE_TTS',
    RESUME_TTS: 'RESUME_TTS',
    STOP_TTS: 'STOP_TTS',
    PLAYBACK_STATE_UPDATE: 'PLAYBACK_STATE_UPDATE'
  };

  const PLAYBACK_STATES = {
    IDLE: 'idle',
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ERROR: 'error'
  };

  class FloatingPlayer {
    constructor() {
      this.container = null;
      this.shadowRoot = null;
      this.currentState = PLAYBACK_STATES.IDLE;
      this.isDragging = false;
      this.dragOffset = { x: 0, y: 0 };
      this.position = { x: 20, y: 20 };
      
      this.init();
    }
    
    init() {
      // Create container with Shadow DOM for style isolation
      this.container = document.createElement('div');
      this.container.id = 'sarvam-floating-player';
      this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
      
      this.render();
      this.attachEventListeners();
      
      // Initially hidden
      this.container.style.display = 'none';
      document.body.appendChild(this.container);
      
      // Load saved position
      this.loadPosition();
    }
    
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            all: initial;
            --bg-card: #ffffff;
            --text-primary: #323232;
            --text-secondary: #6e6e6e;
            --primary: #323232;
            --primary-hover: #171717;
            --bg-button: #f7f3eb;
            --border: #e8e4db;
            --shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
          }
          
          .player {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 50px;
            box-shadow: var(--shadow);
            cursor: move;
            user-select: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            font-size: 13px;
            color: var(--text-primary);
            transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          }
          
          .player:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02);
            transform: translateY(-1px);
          }
          
          .player.dragging {
            opacity: 0.95;
            cursor: grabbing;
            transform: scale(1.02);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }
          
          .logo {
            width: 24px;
            height: 24px;
            display: flex; /* Kept for alignment, but image will be used */
            align-items: center;
            justify-content: center;
          }
          
          .logo img {
            width: 24px;
            height: 24px;
            border-radius: 4px; /* Slight rounding if needed, but icon usually handles it */
          }
          
          .status {
            color: var(--text-secondary);
            font-size: 13px;
            font-weight: 500;
            min-width: 60px;
          }
          
          .status.playing {
            color: #10b981; /* Green */
          }
          
          .status.loading {
            color: #f59e0b; /* Amber */
          }
          
          .status.paused {
            color: var(--primary);
          }
           .status.error {
            color: #ef4444;
          }
          
          .controls {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          
          button {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            background: var(--bg-button);
            color: var(--text-primary);
          }
          
          button:hover {
            background: #ebe6da; /* Slightly darker cream */
            transform: scale(1.05);
          }
          
          button:active {
            transform: scale(0.95);
          }
          
          button svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
          }
          
          button.primary {
            background: var(--primary);
            color: white;
            width: 36px;
            height: 36px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          button.primary:hover {
            background: var(--primary-hover);
            box-shadow: 0 4px 6px rgba(0,0,0,0.15);
          }
          
          .close-btn {
            background: transparent;
            color: var(--text-secondary);
            width: 24px;
            height: 24px;
            margin-left: 4px;
            opacity: 0.6;
          }
          
          .close-btn:hover {
            opacity: 1;
            background: rgba(0, 0, 0, 0.05);
            color: #ef4444;
          }
             
           .close-btn svg {
            width: 14px;
            height: 14px;
          }

          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
        
        <div class="player" id="player">
          <div class="logo">
            <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Logo" />
          </div>
          
          <span class="status" id="status">Ready</span>
          
          <div class="controls">
            <button class="primary" id="playPauseBtn" title="Play/Pause">
              <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
              <svg id="pauseIcon" viewBox="0 0 24 24" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              <div id="spinner" class="spinner" style="display:none"></div>
            </button>
            
            <button id="stopBtn" title="Stop">
              <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
            
            <button class="close-btn" id="closeBtn" title="Close">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>
      `;
    }
    
    attachEventListeners() {
      const player = this.shadowRoot.getElementById('player');
      const playPauseBtn = this.shadowRoot.getElementById('playPauseBtn');
      const stopBtn = this.shadowRoot.getElementById('stopBtn');
      const closeBtn = this.shadowRoot.getElementById('closeBtn');
      
      // Store bound handlers for cleanup
      this._boundDrag = (e) => this.drag(e);
      this._boundEndDrag = () => this.endDrag();
      this._boundMessageListener = (message) => {
        if (message.type === MESSAGE_TYPES.PLAYBACK_STATE_UPDATE) {
          this.updateState(message.state);
        }
      };
      
      // Drag handlers
      player.addEventListener('mousedown', (e) => this.startDrag(e));
      document.addEventListener('mousemove', this._boundDrag);
      document.addEventListener('mouseup', this._boundEndDrag);
      
      // Control handlers - stop propagation to prevent drag
      playPauseBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      stopBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      
      playPauseBtn.addEventListener('click', () => this.handlePlayPause());
      stopBtn.addEventListener('click', () => this.handleStop());
      closeBtn.addEventListener('click', () => this.hide());
      
      // Listen for state updates from background
      chrome.runtime.onMessage.addListener(this._boundMessageListener);
    }
    
    startDrag(e) {
      if (e.target.tagName === 'BUTTON') return;
      
      this.isDragging = true;
      const player = this.shadowRoot.getElementById('player');
      const rect = player.getBoundingClientRect();
      
      // Cache dimensions to avoid layout thrashing during drag
      this._playerWidth = rect.width;
      this._playerHeight = rect.height;
      
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      player.classList.add('dragging');
    }
    
    drag(e) {
      if (!this.isDragging) return;
      
      // Throttle DOM updates with requestAnimationFrame
      if (this._rafId) return;
      this._rafId = requestAnimationFrame(() => {
        this._rafId = null;
        if (!this.isDragging) return;
        
        const player = this.shadowRoot.getElementById('player');
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Use cached dimensions to avoid layout thrashing
        const maxX = window.innerWidth - (this._playerWidth || 0);
        const maxY = window.innerHeight - (this._playerHeight || 0);
        
        this.position = {
          x: Math.max(0, Math.min(x, maxX)),
          y: Math.max(0, Math.min(y, maxY))
        };
        
        player.style.left = this.position.x + 'px';
        player.style.top = this.position.y + 'px';
        player.style.right = 'auto';
      });
    }
    
    endDrag() {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      const player = this.shadowRoot.getElementById('player');
      player.classList.remove('dragging');
      
      this.savePosition();
    }
    
    async savePosition() {
      // Debounce to avoid excessive storage writes
      if (this._saveTimeout) {
        clearTimeout(this._saveTimeout);
      }
      this._saveTimeout = setTimeout(async () => {
        try {
          await chrome.storage.local.set({ 
            'sarvam_player_position': this.position 
          });
        } catch (e) {
          // Ignore storage errors
        }
        this._saveTimeout = null;
      }, 500);
    }
    
    async loadPosition() {
      try {
        const result = await chrome.storage.local.get('sarvam_player_position');
        if (result.sarvam_player_position) {
          this.position = result.sarvam_player_position;
          const player = this.shadowRoot.getElementById('player');
          player.style.left = this.position.x + 'px';
          player.style.top = this.position.y + 'px';
          player.style.right = 'auto';
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    handlePlayPause() {
      if (this.currentState === PLAYBACK_STATES.PLAYING) {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.PAUSE_TTS });
      } else if (this.currentState === PLAYBACK_STATES.PAUSED) {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESUME_TTS });
      }
    }
    
    handleStop() {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.STOP_TTS });
    }
    
    updateState(state) {
      this.currentState = state;
      
      const status = this.shadowRoot.getElementById('status');
      const playIcon = this.shadowRoot.getElementById('playIcon');
      const pauseIcon = this.shadowRoot.getElementById('pauseIcon');
      const spinner = this.shadowRoot.getElementById('spinner');
      
      // Reset display
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'none';
      spinner.style.display = 'none';
      
      status.className = 'status ' + state;
      
      switch (state) {
        case PLAYBACK_STATES.LOADING:
          status.textContent = 'Loading...';
          spinner.style.display = 'block';
          break;
        case PLAYBACK_STATES.PLAYING:
          status.textContent = 'Playing';
          pauseIcon.style.display = 'block';
          break;
        case PLAYBACK_STATES.PAUSED:
          status.textContent = 'Paused';
          playIcon.style.display = 'block';
          break;
        case PLAYBACK_STATES.ERROR:
          status.textContent = 'Error';
          playIcon.style.display = 'block';
          break;
        default:
          status.textContent = 'Ready';
          playIcon.style.display = 'block';
      }
      
      // Auto-show when playing, auto-hide when idle
      if (state === PLAYBACK_STATES.LOADING || state === PLAYBACK_STATES.PLAYING) {
        this.show();
      } else if (state === PLAYBACK_STATES.IDLE) {
        this.hide();
      }
    }
    
    show() {
      this.container.style.display = 'block';
    }
    
    hide() {
      this.container.style.display = 'none';
    }
    
    destroy() {
      // Remove global event listeners to prevent memory leaks
      if (this._boundDrag) {
        document.removeEventListener('mousemove', this._boundDrag);
      }
      if (this._boundEndDrag) {
        document.removeEventListener('mouseup', this._boundEndDrag);
      }
      if (this._boundMessageListener) {
        chrome.runtime.onMessage.removeListener(this._boundMessageListener);
      }
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._saveTimeout) {
        clearTimeout(this._saveTimeout);
        this._saveTimeout = null;
      }
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
  }

  // Export for content script
  window.SarvamFloatingPlayer = FloatingPlayer;
})();


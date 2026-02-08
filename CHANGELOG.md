# Changelog

All notable changes to Vani: Indic TTS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added
- Initial release of Vani: Indic TTS
- Support for 11 Indian languages (Hindi, English-IN, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu)
- 39 natural-sounding voices for Bulbul v3 model
- 7 voices for Bulbul v2 model
- Variable playback speed (0.5x to 2.0x)
- Context menu integration ("Read with Vani: Indic TTS")
- Text highlighting during playback
- Auto page content reading when no text selected
- Automatic page language detection
- Chunk-based playback for long texts (>2000 characters)
- Secure local API key storage
- Play/Pause/Resume/Stop controls
- Model and voice selection in popup
- Real-time character count with model-specific limits
- Error handling with user-friendly messages

### Security
- API keys stored locally only (chrome.storage.local)
- Content Security Policy enforced
- Input validation for API keys
- Error message sanitization to prevent data leaks
- Proper async message handling to prevent channel errors

### Technical
- Manifest V3 compliant
- Offscreen document for audio playback
- Service worker architecture
- ES6 modules throughout
- Proper error boundaries and recovery

---

## Future Planned Features

### Version 1.1.0 (Planned)
- [ ] Keyboard shortcuts for play/pause/stop
- [ ] Save/load multiple API key profiles
- [ ] Reading progress indicator
- [ ] Word-by-word highlighting
- [ ] Custom pronunciation dictionary
- [ ] Reading queue for multiple selections
- [ ] Browser action badge showing state

### Version 1.2.0 (Planned)
- [ ] Floating player enhancements
- [ ] Bookmarks for frequently read content
- [ ] Reading history
- [ ] Statistics (words read, time listened)
- [ ] Dark mode for popup

---

## Version History

- **1.0.0** - Initial public release

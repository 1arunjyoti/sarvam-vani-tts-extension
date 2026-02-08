# Vani: Indic TTS

Fast, natural Text-to-Speech for Indian languages. Powered by Sarvam.ai's "Bulbul" models (`bulbul:v3`).

**Note:** This extension is not affiliated with, endorsed by, or sponsored by Sarvam AI.

## Overview

**Vani: Indic TTS** is a Chrome browser extension that allows you to listen to selected text on any webpage in naturally spoken Indian languages. It leverages the powerful `bulbul:v3` API from Sarvam AI to provide high-quality speech synthesis with support for multiple regional languages and speakers.

## Features

- **Indic Language Support**: Seamless TTS for Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, and Indian English.
- **Multiple Speakers**: Choose from a variety of natural-sounding voices (e.g., Shubh, Meera, Aditya).
- **Control Your Experience**: Adjust playback speed (0.5x to 2.0x).
- **Smart Integration**:
  - Right-click context menu to read selected text with **Vani: Indic TTS**.
  - Floating player on the webpage for easy control.
  - Text highlighting to follow along as it reads.
- **Secure**: API keys are stored locally in your browser (`chrome.storage.local`).

## Project Structure

```text
vani-tts-extension/
├── background/             # Service worker for extension events
│   └── service-worker.js
├── content/                # Scripts injected into webpages
│   ├── content.js          # Text highlighting & innovative UI
│   └── floating-player.js  # Floating playback controls
├── icons/                  # Extension icons (16, 48, 128px)
├── offscreen/              # Hidden document for audio playback
│   ├── offscreen.html
│   └── offscreen.js
├── popup/                  # Main extension popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── scripts/                # Utility scripts (icons, build)
├── manifest.json           # Extension configuration (Manifest V3)
└── README.md               # Project documentation
```

## Screenshots

View screenshots of the extension in the `screenshots/` folder: [Screenshots](screenshots/)

## Setup & Installation

### Getting Your Sarvam AI API Key

Before using this extension, you'll need a Sarvam AI API key:

1. Visit [Sarvam AI](https://www.sarvam.ai/)
2. Sign up for an account or log in
3. Navigate to the API section in your dashboard
4. Generate a new API key
5. Copy the key (you'll need it for the extension setup)

**Note:** Sarvam AI may require account verification or have usage limits. Check their documentation for details.

### Installing the Extension

#### Option A: From Chrome Web Store (Recommended)
*Coming soon!*

#### Option B: Install from Source

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/1arunjyoti/vani-tts-extension.git
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/` in your browser.
   - Enable **Developer mode** (toggle in the top right).
   
3. **Load Unpacked**:
   - Click **"Load unpacked"**.
   - Select the project folder (`indic-tts-extension`).
   
4. **Pin the Extension**:
   - Click the puzzle piece icon in your toolbar and pin **Vani: Indic TTS**.

## Usage

1. **Configure API Key**:
   - Click the extension icon to open the popup.
   - Open the **API Configuration** section.
   - Enter your Sarvam AI API Key and click **Save Key**.
2. **Read Text**:
   - **Option A**: Select text on any webpage, right-click, and choose **"Read with Vani: Indic TTS"**.
   - **Option B**: Open the extension popup, click the **Play** button and it will start reading the website text.
3. **Controls**:
   - Use the popup or the floating player on the page to **Pause**, **Resume**, or **Stop** playback.
   - Change the **Voice**, **Language**, or **Speed** in the popup settings.

## Supported Languages

- 🇮🇳 **Hindi** (हिन्दी)
- 🇮🇳 **English** (Indian English)
- 🇮🇳 **Bengali** (বাংলা)
- 🇮🇳 **Gujarati** (ગુજરાતી)
- 🇮🇳 **Kannada** (ಕನ್ನಡ)
- 🇮🇳 **Malayalam** (മലയാളം)
- 🇮🇳 **Marathi** (मराठी)
- 🇮🇳 **Odia** (ଓଡ଼ିଆ)
- 🇮🇳 **Punjabi** (ਪੰਜਾਬੀ)
- 🇮🇳 **Tamil** (தமிழ்)
- 🇮🇳 **Telugu** (తెలుగు)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy

Your privacy is important. This extension:
- Stores API keys and preferences **locally only**
- Does NOT collect or transmit personal data
- Does NOT track your browsing
- Only sends selected text to Sarvam AI for TTS conversion

Read our full [Privacy Policy](PRIVACY.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## Support

- 🐛 [Report a bug](https://github.com/1arunjyoti/vani-tts-extension/issues)
- 💡 [Request a feature](https://github.com/1arunjyoti/vani-tts-extension/issues)
- 📖 [Read the docs](https://github.com/1arunjyoti/vani-tts-extension)

## Acknowledgments

- Powered by [Sarvam AI](https://www.sarvam.ai/) Bulbul TTS models
- Inspired by the need for better accessibility and language support in TTS tools

## License

MIT License.

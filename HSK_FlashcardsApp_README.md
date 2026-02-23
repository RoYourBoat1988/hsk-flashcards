# 漢字 · HSK Flashcards

A beautiful, self-contained Chinese vocabulary learning app built as a single HTML file. No installation, no server, no account — just open it in your browser and start studying. Can also be installed as a home-screen app on iPhone and Android.

---

## Getting Started

1. Download `chinese-flashcards_2.html` (and the companion files `manifest.json`, `sw.js`, and the icon PNGs if you want PWA/iOS support)
2. Open `chinese-flashcards_2.html` in any modern web browser (Chrome recommended for best audio support)
3. On the welcome screen, choose your **deck** — HSK Vocabulary or Sentence Starters
4. Click **开始学习 · Begin**
5. Tap a flashcard to flip it and reveal the answer, then rate your recall

Your progress is automatically saved in your browser's local storage and persists between sessions.

---

## Decks

The app supports two independent study decks, selected from the intro screen. You can also switch decks at any time using the **⇄ Deck** button in the header.

### HSK Vocabulary
The official Hanyu Shuiping Kaoshi (汉语水平考试) curriculum, covering approximately 500 words across six proficiency levels. Use the level bar below the header to filter by a specific level or study all levels together.

| Level | Description | Approximate vocabulary |
|---|---|---|
| HSK 1 | Absolute beginner | ~150 words |
| HSK 2 | Elementary | ~150 words |
| HSK 3 | Pre-intermediate | ~50 words |
| HSK 4 | Intermediate | ~50 words |
| HSK 5 | Upper-intermediate | ~25 words |
| HSK 6 | Advanced | ~21 words |

Cards are introduced in order: HSK 1 first, then HSK 2, and so on. Within each level, words appear sequentially.

### Sentence Starters
49 essential Chinese sentence-chunk patterns for natural, fluent-sounding conversation — phrases like *对我来说…* ("For me…"), *虽然…但是…* ("Although… but…"), and *毫无疑问…* ("Without a doubt…"). Each card shows the sentence pattern on the front and its English meaning, pinyin, and a full example sentence on the back.

Progress for each deck is tracked separately, so switching decks never disrupts your HSK review schedule and vice versa.

---

## Features

### Flashcards

**HSK cards:**
- **Front** — Simplified and traditional Chinese characters
- **Back** — Pinyin romanisation, English meaning, example sentence (Chinese / pinyin / English), and a character-by-character breakdown for multi-character words

**Sentence Starter cards:**
- **Front** — The Chinese sentence pattern in large characters, with pinyin below
- **Back** — English meaning, and a full example sentence showing the pattern in use

Tap or click the card to flip it.

### Spaced Repetition (SM-2 Algorithm)

Cards are scheduled using the SM-2 algorithm — the same system used by Anki. The better you know a card, the longer the gap before it appears again. Cards you struggle with come back sooner.

After flipping a card, rate it with one of four buttons:

| Button | Quality | What it means | Next review |
|---|---|---|---|
| ✗ **Forgot** | 0 | Couldn't recall it | Reappears later in the same session |
| ◑ **Hard** | 2 | Recalled but with difficulty | 1–2 days; card returns within 4 cards |
| ✓ **Good** | 3 | Recalled correctly | Standard SM-2 interval progression |
| ★ **Easy** | 5 | Recalled instantly | Boosted interval; easiness factor improves |

### Audio Pronunciation

When a card is flipped, the word (or phrase) plays automatically, followed by the example sentence. You can also tap the **Speak word / Speak phrase** and **Speak sentence / Speak example** buttons manually.

Audio uses the Web Speech API with intelligent voice selection — it automatically picks the highest-quality Chinese (zh-CN) voice available on your device. Click the **🔊 Voice** indicator in the header to cycle through all available voices and hear a sample.

For sentence starters, trailing ellipses ("…") are automatically stripped before the phrase is spoken, so the TTS engine speaks the characters naturally.

**For the best audio quality:**
- **macOS** — Go to System Settings → Accessibility → Spoken Content → System Voice → Manage Voices. Install *Ting-Ting (Enhanced)* or *Mei-Jia (Enhanced)* under Chinese.
- **Windows** — Go to Settings → Time & Language → Language & Region → Add Chinese (Simplified). Windows 11 includes neural voices (Xiaoxiao, Yunxi) automatically.
- **Chrome on any platform** — Google's cloud Chinese voice is available when you're online; no installation needed.

---

## Analytics

Click **📈 Analytics** in the header to open the analytics panel. It is available at any time.

The panel has two tabs:

**Summary tab:**
- Current session cards reviewed and current streak
- Longest streak ever recorded
- Knowledge snapshot — how many of your cards were last rated Forgot / Hard / Good / Easy (a horizontal stacked bar shows the proportion at a glance)
- All-time rating distribution — total lifetime counts across all four ratings

**Activity tab:**
Switch between three time windows using the Daily / Weekly / Monthly buttons:
- **Daily** — last 7 days, one bar per day
- **Weekly** — last 8 weeks, one bar per week
- **Monthly** — last 6 months, one bar per month

Each bar is split into reviews (blue) and new cards introduced (red), with the exact count shown to the right. Periods with no activity display a dash.

---

## Settings

Click **⚙ Settings** in the header to open the settings panel.

### New cards per day
Controls how many brand-new (unseen) words are introduced in each session. Default is **20**. Lower this if you're feeling overwhelmed; raise it to progress faster. Range: 5–100.

### Reviews per day
Caps the number of due cards shown per session. Set to **0** for unlimited (all due cards appear). Useful for lighter study days. Range: 0–500.

Settings are saved automatically and persist between sessions.

---

## Installing as a Home-Screen App (iOS & Android)

The app is a **Progressive Web App (PWA)** — you can add it to your phone's home screen and use it offline exactly like a native app.

**On iPhone / iPad (Safari):**
1. Open `chinese-flashcards_2.html` in Safari (the file must be served over a local or remote web server — see note below)
2. Tap the **Share** button (the box with an arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

The app icon (漢 on a warm paper background) will appear on your home screen. Opening it launches full-screen with no browser chrome.

**On Android (Chrome):**
1. Open the app in Chrome
2. Tap the three-dot menu → **Add to Home screen** (or accept the install banner if it appears)
3. Tap **Add**

**Note on serving the file:** Browsers require a web server (not a `file://` URL) to register a service worker and enable full offline PWA support. The simplest way is to run a local server — for example, in the app folder: `python3 -m http.server 8080` — then open `http://localhost:8080/chinese-flashcards_2.html` in your browser.

Once installed, the app works fully offline. All vocabulary data, styles, and scripts are cached by the service worker on first load.

---

## How Progress is Saved

All data is stored in your browser's **localStorage** under the key `hsk_srs_v1`. This means:

- Progress persists as long as you use the same browser on the same device
- Clearing your browser's site data or cache will erase your progress
- Progress does not sync across devices or browsers

To back up your progress, open the browser console (`F12` → Console) and run:

```javascript
copy(localStorage.getItem('hsk_srs_v1'))
```

This copies your full progress as JSON. To restore it, run:

```javascript
localStorage.setItem('hsk_srs_v1', '<paste your JSON here>')
```

---

## Technical Details

- **Single-file app** — All HTML, CSS, JavaScript, and vocabulary data are in one `.html` file. Companion files (`manifest.json`, `sw.js`, icons) enable PWA installation but are not required for the core study experience.
- **Two decks** — HSK vocabulary (HSK_DATA) and Sentence Starters (SENTENCES_DATA) are bundled in the same file. Deck progress is tracked via separate card key prefixes (`hsk{level}_{idx}` and `sent_{idx}`).
- **Spaced repetition** — Implements the SM-2 algorithm with quality scores 0, 2, 3, and 5. The easiness factor starts at 2.5 and is adjusted after each rating.
- **Analytics** — Rating history and daily activity are tracked in the `history` object within the state, persisted to `localStorage` alongside SRS data.
- **Audio** — Uses the Web Speech API (`speechSynthesis`). Voices are scored and ranked automatically by quality; premium/enhanced/neural voices score higher than compact ones. Ellipses in sentence starters are stripped before synthesis.
- **PWA** — A `manifest.json` and service worker (`sw.js`) enable home-screen installation and offline use. The service worker uses cache-first for app shell assets and network-first for Google Fonts.
- **Fonts** — Noto Serif SC / TC for Chinese characters, Cormorant Garamond for Latin text (loaded from Google Fonts).
- **Browser compatibility** — Works in all modern browsers. Chrome offers the widest range of Chinese voices. Safari and Firefox work but may have fewer voice options. Safari is required for iOS PWA installation.

---

## License

This project is provided as-is for personal study use. The HSK vocabulary data is based on the official Hanyu Shuiping Kaoshi (汉语水平考试) word lists. The sentence starters deck is based on *50 Mandarin Sentence Starters*.

# 漢字 · HSK Flashcards — Architecture Reference

This document describes the internal structure and logic of `chinese-flashcards_2.html` for developers who want to understand, extend, or modify the app.

---

## Overview

The entire application is a **single self-contained HTML file** — no build tools, no frameworks, no external dependencies beyond Google Fonts. The file is structured in three sequential sections:

```
chinese-flashcards_2.html
├── <head>          — Fonts, CSS custom properties, all styles (~1100 lines)
├── <body>          — Static HTML shells (intro screen, deck overlay, header, panels)
└── <script>        — Vocabulary data + all application logic (~1600 lines)
```

The app uses **vanilla JavaScript with direct DOM manipulation**. There is no virtual DOM, no reactive state system, and no component model. When something needs to change on screen, the relevant DOM node is written to directly via `innerHTML` or `textContent`.

Companion files required for PWA / home-screen installation:
- `manifest.json` — Web App Manifest (name, icons, display mode)
- `sw.js` — Service worker (offline caching)
- `icon-180.png`, `icon-192.png`, `icon-512.png` — App icons

---

## File Structure at a Glance

```
Line 1–17     DOCTYPE, meta, PWA meta tags, Google Fonts link
Line 18–1130  <style> block
Line 1131+    Static HTML:
  ├─ #intro-screen        — Welcome screen with deck selector cards
  ├─ #deck-overlay        — Modal for switching decks mid-session
  ├─ <header>             — Logo, ⇄ Deck, 📈 Analytics, ⚙ Settings, stats
  ├─ #level-bar           — HSK level filter buttons (hidden for Sentences deck)
  ├─ <main>               — Queue info bar + #card-container
  ├─ .settings-panel      — Slide-in settings panel
  ├─ .analytics-overlay   — Analytics modal overlay
  └─ #toast               — Toast notification element
Line XXXX+    <script> block
  ├─ HSK_DATA            — HSK vocabulary database (levels 1–6)
  ├─ SENTENCES_DATA      — Sentence starters deck (49 entries)
  ├─ sm2()               — Spaced repetition algorithm
  ├─ State management    — state, saveState(), loadState()
  ├─ Settings panel      — openSettings(), saveSettings(), etc.
  ├─ Card key helpers    — getCardKey(), getCardSRS(), isDue()
  ├─ Session variables   — currentDeck, currentLevel, queue, currentCardIdx, etc.
  ├─ Queue management    — buildQueue(), updateStats()
  ├─ Card rendering      — showCard(), buildSentenceCardHTML(), flipCard(), highlightWord()
  ├─ Audio system        — loadVoices(), speak(), stripEllipsis(), autoPlaySequence(), etc.
  ├─ Rating handler      — rateCard()
  ├─ Level selection     — setLevel()
  ├─ Empty state         — showEmptyState(), resetSession()
  ├─ Toast               — showToast()
  ├─ Analytics panel     — openAnalytics(), renderAnalyticsPanel(), buildSummaryHTML(), etc.
  ├─ Deck selection      — introDeckSelect(), openDeckOverlay(), switchDeck(), closeDeckOverlay()
  ├─ Init                — startApp(), loadState(), buildQueue()
  └─ SW registration     — Service worker registration (separate <script> tag)
```

---

## Vocabulary Databases

### HSK_DATA

```javascript
const HSK_DATA = {
  1: [ /* array of word objects */ ],
  2: [ /* ... */ ],
  // ... through 6
};
```

Each HSK word is a plain object:

```javascript
{
  simp:       "学习",          // simplified Chinese characters
  trad:       "學習",          // traditional Chinese characters
  pinyin:     "xuéxí",         // romanisation with tone marks
  meaning:    "to study; to learn",
  example_zh: "我每天学习中文。",
  example_py: "Wǒ měitiān xuéxí Zhōngwén.",
  example_en: "I study Chinese every day.",
  chars: [                     // character-by-character breakdown (optional for single chars)
    { s: "学", t: "學", m: "to learn, school" },
    { s: "习", t: "習", m: "to practice, habit" }
  ]
}
```

### SENTENCES_DATA

```javascript
const SENTENCES_DATA = [ /* array of 49 sentence starter objects */ ];
```

Each sentence starter is a plain object:

```javascript
{
  simp:       "对我来说...",            // Chinese pattern, may include trailing "..."
  pinyin:     "Duì wǒ lái shuō...",
  meaning:    "For me... / As far as I'm concerned...",
  example_zh: "对我来说，家人是最重要的。",
  example_py: "Duì wǒ lái shuō, jiārén shì zuì zhòng yào de.",
  example_en: "For me, family is the most important thing."
}
```

Note: sentence starters do not have `trad` or `chars` fields. The card renderer branches on `currentDeck` to avoid accessing these missing fields.

### Card Identity and Key Format

A card's **position in its source array is its permanent identity**. SRS data is stored using:
- HSK cards: `hsk{level}_{index}` (e.g. `hsk1_5`, `hsk3_0`)
- Sentence cards: `sent_{index}` (e.g. `sent_0`, `sent_12`)

`getCardKey(level, idx)` returns the correct format based on the `level` argument — passing the string `'sentences'` produces the `sent_` prefix; passing a number produces the `hsk` prefix.

**The order of entries in either array must never change** once a user has begun studying, or SRS data will be mismatched to the wrong cards. Always append to the end when adding new entries.

---

## Persistent State (`localStorage`)

All persistent data is stored under the key `hsk_srs_v1` as a single JSON blob. The structure:

```javascript
{
  cards: {
    "hsk1_0": {
      srs: {
        interval:    14,              // days until next review
        repetitions: 3,               // successful review count
        easiness:    2.6,             // SM-2 ease factor (min 1.3)
        nextReview:  "2026-03-01T...", // ISO date string
        lastReview:  "2026-02-15T..."
      },
      lastRating: 3                   // quality of most recent rating (0/2/3/5)
    },
    "sent_4": {
      srs: { /* same shape */ },
      lastRating: 5
    },
    // one entry per card that has been seen at least once
  },
  session: {
    reviewed:      0,                 // total all-time reviews (reserved)
    streak:        7,                 // current consecutive study-day streak
    longestStreak: 12,                // all-time longest streak
    lastStudyDate: "Mon Feb 22 2026"  // Date.toDateString() format
  },
  settings: {
    newCardsPerDay:    20,            // max new cards per session
    reviewCardsPerDay: 0              // max reviews per session (0 = unlimited)
  },
  history: {
    ratingCounts: {                   // all-time rating totals across both decks
      forgot: 14,
      hard:   32,
      good:   210,
      easy:   88
    },
    dailyLog: {                       // keyed by ISO date string "YYYY-MM-DD"
      "2026-02-22": { reviews: 24, newCards: 8 },
      "2026-02-21": { reviews: 18, newCards: 0 }
    }
  }
}
```

`saveState()` serialises the whole object to JSON and writes it. `loadState()` reads and deep-merges it — new top-level fields and nested fields (e.g. `history.ratingCounts`) are merged with spread syntax so old saved states missing new fields are handled gracefully.

Cards that have **never been seen** have no entry in `state.cards` at all. `getCardSRS()` creates a default SRS entry on first access. A `null` `nextReview` is the canonical signal that a card is "new" (unseen).

`lastRating` is written to `state.cards[key]` on every call to `rateCard()`. It stores the raw quality value (0/2/3/5) and is used by the Analytics panel's knowledge-snapshot feature to show how each card was last rated.

---

## The SM-2 Algorithm (`sm2()`)

The standard [SuperMemo SM-2](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-achieved-in-working-with-the-supermemo-method) algorithm, with one extension for the "Hard" rating.

```javascript
function sm2(card, quality)
```

**Quality values:**

| Button | Quality | Meaning |
|---|---|---|
| Forgot | 0 | Complete blackout |
| Hard   | 2 | Correct but very difficult |
| Good   | 3 | Correct with some effort |
| Easy   | 5 | Perfect recall |

**Algorithm logic:**

```
if quality == 0 (Forgot):
    repetitions = 0
    interval    = 1 day

else if quality == 2 (Hard):
    interval = clamp(interval * 0.5, min=1, max=2)
    repetitions unchanged  ← custom extension, not standard SM-2

else (Good or Easy):
    if repetitions == 0: interval = 1
    if repetitions == 1: interval = 6
    else:                interval = round(interval * easiness)
    repetitions += 1

easiness = max(1.3,  easiness + 0.1 − (5 − quality) × (0.08 + (5 − quality) × 0.02))
nextReview = today + interval days
```

The "Hard" path intentionally does **not** increment `repetitions`. This prevents the card from jumping to a 6-day interval on the next Good rating when it hasn't truly been learned. It stays in "early learning" until a Good or Easy rating promotes it.

---

## Deck System

### currentDeck variable

```javascript
let currentDeck = 'hsk'; // 'hsk' | 'sentences'
```

This single variable gates all deck-sensitive logic. It is set on the intro screen via `introDeckSelect()` and updated mid-session via `switchDeck()`.

### Intro-screen deck selection

The intro screen contains two `.deck-card` elements (`#deck-card-hsk` and `#deck-card-sentences`). Clicking one calls `introDeckSelect(deck)`, which updates `currentDeck` and toggles the `.selected` CSS class for visual feedback. `startApp()` reads `currentDeck` to show/hide the level bar and build the correct queue.

### Mid-session deck switching

The header **⇄ Deck** button opens a modal overlay (`#deck-overlay`) containing the same two deck cards. Clicking one calls `switchDeck(deck)`, which:
1. Closes the overlay
2. Updates `currentDeck`
3. Shows/hides the level bar (`id="level-bar"`) — only visible for the HSK deck
4. Resets `currentCardIdx` and `sessionReviewed`
5. Calls `buildQueue()` and `showCard()`
6. Shows a toast confirming the switch

### buildQueue() — deck branching

```javascript
if (currentDeck === 'sentences') {
  SENTENCES_DATA.forEach((word, idx) => {
    const srs = getCardSRS('sentences', idx);
    // ...push to newCards or reviewCards
  });
} else {
  const levels = currentLevel === 'all' ? [1,2,3,4,5,6] : [parseInt(currentLevel)];
  for (const level of levels) { /* HSK_DATA walk */ }
}
```

The same new/review split and daily limits apply to both decks.

---

## Queue Management

The queue is a plain JavaScript array of **queue items**, rebuilt whenever the deck/level changes or settings are saved:

```javascript
{
  level: 2,            // HSK level number, OR the string 'sentences'
  idx:   14,           // index into HSK_DATA[level] or SENTENCES_DATA
  word:  { ... },      // reference to the word/phrase object
  srs:   { ... }       // snapshot of SRS data at queue-build time
}
```

**Build order:**
1. Walk all words in the selected deck/level(s)
2. Separate into `newCards` (no `nextReview`) and `reviewCards` (`nextReview` ≤ today)
3. Slice `newCards` to `settings.newCardsPerDay` limit
4. Slice `reviewCards` to `settings.reviewCardsPerDay` limit (0 = no limit)
5. Concatenate: `[...reviewCards, ...newCards]` — reviews always come first

**In-session mutation:**

`rateCard()` can mutate the queue mid-session:
- **Forgot (quality=0):** `queue.push(item)` — card goes to the very end for same-session retry
- **Hard (quality=2):** `queue.splice(currentCardIdx + 4, 0, item)` — card reinserted 4 positions ahead

`currentCardIdx` is only ever incremented forward; cards are never removed.

---

## Card Rendering

### showCard()

`showCard()` is the main render function. It:

1. Checks if the queue is exhausted — if so, calls `showEmptyState()`
2. Reads the current item from `queue[currentCardIdx]`
3. Updates the progress bar fill percentage
4. **If `currentDeck === 'sentences'`:** delegates to `buildSentenceCardHTML(item)` and returns early
5. Otherwise: writes the full HSK card HTML (both front and back faces) as a single `innerHTML` string into `#card-container`
6. Uses a `requestAnimationFrame` callback to measure both faces and sets an explicit `height` on the `.card` wrapper

Step 6 is critical: the back face uses `position: absolute` and occupies no document flow space. Without an explicit height on the parent, the card wrapper collapses to the front face height only, clipping the back. The height is set to `Math.max(frontFace.scrollHeight, backFace.scrollHeight)`.

### buildSentenceCardHTML(item)

Renders a sentence-starter card into `#card-container`. The structure mirrors the HSK card but:
- Front shows `.sentence-front-phrase` (the Chinese pattern, large) and `.sentence-front-pinyin` below it, with a `.sentence-badge` instead of `.hsk-badge`
- Back shows the phrase and pinyin in `.back-simplified` / `.back-traditional`, the English meaning in `.sentence-meaning`, and the example sentence — no character breakdown section
- The same rating buttons, audio row, and `requestAnimationFrame` height-measurement logic are used

### Card Flip

The flip is purely CSS: `.card.flipped { transform: rotateY(180deg) }` with `transform-style: preserve-3d` on the parent and `backface-visibility: hidden` on both faces. The back face has `transform: rotateY(180deg)` applied statically so it appears correct-side-up when the parent rotates. The rating buttons live inside the back face, not separately.

```javascript
function flipCard() {
  if (isFlipped) return;   // guard against double-flips
  isFlipped = true;
  card.classList.add('flipped');
  setTimeout(autoPlaySequence, 650);  // wait for CSS flip animation
}
```

---

## Audio System

The audio system wraps the browser's **Web Speech API** (`window.speechSynthesis`).

### Voice Selection

On startup (and again at 100ms and 1000ms delays for async voice loading), `loadVoices()` filters all voices to Chinese ones, scores them via `scoreVoice()`, sorts descending, and sets `preferredVoice` to the top result.

Scoring:
- Base of 10 for `zh-CN`, 5 for other `zh-*` locales
- +1–N bonus per name pattern in `VOICE_QUALITY_HINTS` (higher-indexed patterns score more)
- −3 penalty for "compact" or "light" variants
- +5 bonus for "premium", "enhanced", or "neural"

### Ellipsis Stripping (`stripEllipsis()`)

Sentence starter patterns end with "..." (e.g. *对我来说…*). Before passing the phrase text to the TTS engine, `stripEllipsis()` removes these:

```javascript
function stripEllipsis(text) {
  return text.replace(/\.{2,}|…+|……/g, '').trim();
}
```

This is applied in both `autoPlaySequence()` and `speakWord()` when `currentDeck === 'sentences'`. HSK card text is passed unchanged.

### Speaking

```javascript
function speak(text, rate = 0.82, onEnd = null)
```

All speech goes through this single function. It always calls `synth.cancel()` first, then uses a 50ms `setTimeout` before creating the new utterance (Chrome TTS bug workaround). Rate is slightly below 1.0 for clarity; pitch stays at 1.0 to avoid robotic artefacts.

### Auto-play sequence

When a card flips, `autoPlaySequence()` chains two `speak()` calls using `onEnd`:

```
speak(word/phrase) → onEnd → 800ms pause → speak(example_zh) → onEnd
```

---

## Rating Handler (`rateCard()`)

Called with a quality value (0/2/3/5). Key actions in order:

```javascript
const isNewCard = !item.srs.nextReview;           // true if first-ever review
const newSRS    = sm2({ srs: item.srs }, quality);

// Update card state
state.cards[key] = { ...(state.cards[key] || {}), srs: newSRS, lastRating: quality };

// Analytics tracking
state.history.dailyLog[todayKey].reviews++;
if (isNewCard) state.history.dailyLog[todayKey].newCards++;
state.history.ratingCounts[rKey]++;

// Streak logic
// (updates streak, longestStreak, lastStudyDate)

saveState();

// Queue mutation
if (quality === 0) queue.push(item);
else if (quality === 2) queue.splice(currentCardIdx + 4, 0, item);

currentCardIdx++;
updateStats();
// animate → showCard()
```

---

## Analytics Panel

The analytics panel is a centered modal overlay (as opposed to a slide-in panel). It opens via `openAnalytics()` which calls `renderAnalyticsPanel()` first, then adds the `.open` class.

### Data sources

- `state.history.ratingCounts` — all-time Forgot/Hard/Good/Easy totals
- `state.cards[key].lastRating` — last rating per card (used for knowledge snapshot)
- `state.history.dailyLog` — keyed by `"YYYY-MM-DD"` (produced by `toDateKey()`), each entry `{ reviews, newCards }`
- `state.session.streak` / `state.session.longestStreak`

### Tab system

`analyticsTab` (`'daily'` | `'weekly'` | `'monthly'`) controls which time window is rendered. `setAnalyticsTab(tab)` updates the variable and re-renders the activity section only (`document.getElementById('an-activity').innerHTML`).

### Activity chart rendering (`buildActivityRows()`)

Returns HTML for horizontal stacked mini-bars — pure CSS, no canvas. Each bar is split into a blue segment (reviews minus new cards) and a red segment (new cards). Bar widths are percentages relative to the period with the highest review count. `getActivityPeriods()` generates the correct date buckets for the selected tab.

### Knowledge snapshot (`buildSummaryHTML()`)

Walks all `state.cards` entries and buckets each card into Forgot/Hard/Good/Easy based on `lastRating`. Cards that have never been rated (no `lastRating` field) are excluded. The result is displayed as a `.snap-bar` with four coloured segments.

---

## Session Flow

```
introDeckSelect('hsk' | 'sentences')
  └─ sets currentDeck, updates intro UI

startApp()
  ├─ hides intro screen
  ├─ shows/hides level bar based on currentDeck
  ├─ loadVoices() × 3 (immediate + 300ms + 1000ms)
  ├─ buildQueue()
  └─ showCard()
        │
        ▼
   [user taps card]
        │
        ▼
   flipCard()
        ├─ add .flipped class (CSS animation)
        └─ autoPlaySequence() after 650ms
        │
        ▼
   [user taps a rating button]
        │
        ▼
   rateCard(quality)
        ├─ sm2() → new SRS values
        ├─ state.cards[key] = { srs, lastRating }
        ├─ history tracking (dailyLog, ratingCounts)
        ├─ streak + longestStreak update
        ├─ saveState()
        ├─ queue mutation (Forgot / Hard)
        ├─ currentCardIdx++
        ├─ updateStats()
        └─ animate → showCard() (or showEmptyState)
```

---

## Panels

### Settings panel
Slides in from the right. Reads slider values from `state.settings` on open; writes back and calls `buildQueue()` + `showCard()` on Apply.

### Analytics panel
Centered modal with scale+opacity transition. Re-renders fully on open; tab switches re-render only the activity section.

### Deck overlay
Centered modal for mid-session deck switching. Shows current deck as `.selected`. Clicking the backdrop calls `closeDeckOverlay()`.

All overlays use the same pattern: an `.overlay` element (full-screen semi-transparent backdrop) and an inner panel/modal; `.open` is toggled on both simultaneously; clicking the overlay closes it.

---

## PWA Architecture

Three files alongside the HTML enable installation and offline use:

### manifest.json

Declares app name ("漢字 · HSK Flashcards"), short name ("HSK 漢字"), display mode (`standalone`), orientation (`portrait-primary`), theme and background colours, and two icons (192px for Android, 512px for high-res/maskable).

### sw.js (Service Worker)

Uses two caching strategies:

- **Cache-first** for app shell assets (the HTML file, manifest, icons): served from `CacheStorage` if available; network fetch and cache on first visit.
- **Network-first** for Google Fonts and other CDN resources: tries the network; falls back to cache if offline; falls back to cache with stale-while-revalidate if the network is slow.

Cache name: `hsk-flashcards-v1`. To invalidate the cache after an update, bump this version string in `sw.js`.

### iOS meta tags (in `<head>`)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="HSK 漢字">
<link rel="apple-touch-icon" href="icon-180.png">
```

`viewport-fit=cover` paired with `env(safe-area-inset-*)` CSS on the header ensures content sits correctly below the iPhone notch and Dynamic Island:

```css
header {
  padding: calc(1.2rem + env(safe-area-inset-top))
           calc(2.5rem + env(safe-area-inset-right))
           1.2rem
           calc(2.5rem + env(safe-area-inset-left));
}
```

---

## CSS Architecture

All styles are in a single `<style>` block. CSS custom properties define the colour palette:

```css
:root {
  --ink:    #1a1208;   /* near-black, main text */
  --paper:  #f5f0e8;   /* warm off-white, main background */
  --paper2: #ede7d8;   /* slightly darker paper, card backs / inputs */
  --red:    #c0392b;   /* accents, pinyin, forgot button, new-card bar */
  --gold:   #b8860b;   /* logo, analytics button */
  --green:  #2d6a4f;   /* easy button */
  --blue:   #1a4a6b;   /* good/remembered button, review bar */
  --muted:  #7a6a55;   /* secondary text */
  --border: #c8b89a;   /* dividers, card borders */
}
```

Key CSS section headers: `/* HEADER */`, `/* LEVEL SELECTOR */`, `/* FLASHCARD */`, `/* AUDIO BUTTONS */`, `/* RATING BUTTONS */`, `/* SETTINGS PANEL */`, `/* INTRO SCREEN */`, `/* ANALYTICS PANEL */`, `/* DECK SELECTOR */`.

The `.deck-selector` and sentence card styles (`.sentence-front-phrase`, `.sentence-badge`, `.sentence-meaning`) are grouped together after the analytics styles.

---

## Extending the App

### Adding HSK vocabulary
Append new objects to the end of the relevant array in `HSK_DATA`. **Never insert in the middle or reorder.** Card keys are positional; existing users' SRS data would be mismatched.

### Adding a new HSK level (e.g. HSK 7)
Add a new key to `HSK_DATA`, update the `[1,2,3,4,5,6]` literal in `buildQueue()` and `updateStats()`, and add a new `<button class="level-btn">` in the HTML level bar.

### Adding a new deck
1. Define a new data array (e.g. `CHENGYU_DATA`)
2. Add a new `currentDeck` value (e.g. `'chengyu'`)
3. Add a deck card to the intro screen HTML and the deck overlay HTML
4. Add a `getCardKey()` branch for the new prefix
5. Add a `buildQueue()` / `updateStats()` branch
6. Add a `showCard()` branch (or re-use `buildSentenceCardHTML()` if the shape is similar)
7. Add a deck card to `introDeckSelect()` and `openDeckOverlay()` / `switchDeck()`

### Updating the service worker cache
After updating the HTML or any companion file, bump the cache name in `sw.js` (`hsk-flashcards-v1` → `hsk-flashcards-v2`). The old cache will be deleted on the next service worker activation.

---

## Known Limitations

- **No cross-device sync.** Progress lives in `localStorage` and is scoped to a single browser on a single device.
- **No undo.** Once a rating is submitted and `saveState()` is called, the SRS values are committed. There is no history stack.
- **Audio requires OS voices.** The Web Speech API delegates to the OS TTS engine. If no Chinese voice is installed, buttons appear but produce no sound.
- **Streak logic is date-string based.** Uses `Date.toDateString()` (e.g. `"Mon Feb 22 2026"`), which is locale-independent but timezone-sensitive. Studying across a midnight timezone boundary could theoretically double-count a day.
- **Card height is measured after render.** `showCard()` uses `requestAnimationFrame` + `scrollHeight` to size the 3D card. On very slow devices there may be a single-frame layout flash.
- **PWA requires a web server.** Service workers cannot be registered from `file://` URLs. A local HTTP server (e.g. `python3 -m http.server`) is needed for full PWA/offline functionality.
- **Analytics history is not per-deck.** `state.history.dailyLog` and `state.history.ratingCounts` aggregate across both decks. Cards are tracked per-deck via their key prefix in `state.cards`, but activity counts are global.

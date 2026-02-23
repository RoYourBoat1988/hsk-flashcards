#!/bin/bash
# ─────────────────────────────────────────────
#  HSK Flashcards — deploy to GitHub
#  Run this from the project folder:  ./deploy.sh
# ─────────────────────────────────────────────

set -e

REPO_URL="https://github.com/RoYourBoat1988/hsk-flashcards.git"
BRANCH="main"

echo ""
echo "🀄  HSK Flashcards — deploying to GitHub"
echo "──────────────────────────────────────────"

# ── 1. Init repo if needed ──────────────────
if [ ! -d ".git" ]; then
  echo "→ Initialising git repo..."
  git init
  git remote add origin "$REPO_URL"
  git fetch origin
  git checkout -b "$BRANCH" --track "origin/$BRANCH" 2>/dev/null || \
  git checkout -b "$BRANCH" 2>/dev/null || true
  echo "✓ Repo initialised"
else
  echo "✓ Git repo already set up"
fi

# ── 2. Stage all project files ──────────────
echo "→ Staging files..."
git add chinese-flashcards_2.html
git add manifest.json
git add sw.js
git add icon-180.png icon-192.png icon-512.png
git add HSK_FlashcardsApp_README.md
git add HSK_flashcard_ARCHITECTURE.md

# Optional: include this script itself
git add deploy.sh

# ── 3. Check if there's anything to commit ──
if git diff --cached --quiet; then
  echo "✓ No changes to commit — already up to date"
  exit 0
fi

# ── 4. Commit ───────────────────────────────
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
echo "→ Committing..."
git commit -m "Update flashcard app · $TIMESTAMP"
echo "✓ Committed"

# ── 5. Push ─────────────────────────────────
echo "→ Pushing to GitHub..."
git push origin "$BRANCH"

echo ""
echo "✅  Done! Changes are live at:"
echo "   https://github.com/RoYourBoat1988/hsk-flashcards"
echo ""

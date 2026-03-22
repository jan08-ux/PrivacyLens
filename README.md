# 🔏 PrivacyLens — AI Privacy Policy Summarizer

A Chrome extension that instantly analyzes and summarizes any website's privacy policy using AI. Powered by Claude via AIPipe.

---

## ✨ Features

- 🛡 **Risk Rating** — Instantly see if a policy is Low, Medium, or High risk
- 📋 **Plain English Summary** — No legal jargon, just clear language
- 🚩 **Key Concerns** — Flags red flags like data selling, tracking, unclear retention
- ✅ **Positive Aspects** — Highlights user-friendly practices
- 💡 **Bottom Line Verdict** — One-sentence takeaway on whether to trust the site
- ⚡ **Result Caching** — Re-opening the extension on the same page is instant
- 🔒 **Private** — Your API key is stored locally and never shared

---

## 🚀 Installation

### Step 1 — Download & Unzip

Download `privacy-summarizer.zip` and unzip it to a folder on your computer.

### Step 2 — Load in Chrome

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the unzipped `privacy-summarizer` folder

The extension icon (🔏) will appear in your Chrome toolbar.

---

## 🔑 Getting Your AIPipe Token (Free)

1. Go to **[aipipe.org/login](https://aipipe.org/login)**
2. Sign in with your Google account
3. Your API token is shown on the page — copy it

> AIPipe gives you free credits to get started. No credit card required.

---

## ⚙️ Setup

1. Click the **PrivacyLens** icon in Chrome toolbar
2. Click the **⚙ Settings** button (top-right of the popup)
3. Paste your AIPipe token into the field
4. Click **Save**

You're ready to go!

---

## 🧪 How to Use

1. Navigate to any website or its privacy policy page
2. Click the **PrivacyLens** extension icon
3. Click **"Analyze Privacy Policy"**
4. Wait a few seconds for the AI to analyze the page
5. View the risk rating, summary, concerns, and verdict

### Recommended Test URLs

| Site | Expected Risk | URL |
|------|--------------|-----|
| DuckDuckGo | 🟢 Low | https://duckduckgo.com/privacy |
| Notion | 🟢 Low | https://www.notion.so/privacy |
| Google | 🟡 Medium | https://policies.google.com/privacy |
| Facebook | 🔴 High | https://www.facebook.com/privacy/policy/ |
| TikTok | 🔴 High | https://www.tiktok.com/legal/page/us/privacy-policy/ |
| Zomato | 🟡 Medium | https://www.zomato.com/privacy |
| Swiggy | 🟡 Medium | https://www.swiggy.com/privacy-policy |

---

## 📁 File Structure

```
privacy-summarizer/
├── manifest.json      # Chrome extension config (Manifest V3)
├── popup.html         # Extension popup UI
├── popup.css          # Styling (dark theme)
├── popup.js           # Main logic + AIPipe API call
├── content.js         # Extracts text from the current page
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension | Chrome Manifest V3 |
| AI Model | Claude Haiku (via AIPipe) |
| API Format | OpenAI-compatible (AIPipe proxy) |
| Styling | Pure CSS with CSS variables |
| Storage | `chrome.storage.local` |

---

## 🔧 API Details

The extension calls the AIPipe API using the OpenAI-compatible endpoint:

```
POST https://aipipe.org/openrouter/v1/chat/completions
Authorization: Bearer <your-token>
Model: anthropic/claude-haiku-4-5
```

The AI returns a structured JSON response with risk level, summary, concerns, positives, and a bottom-line verdict.

---

## 🔒 Privacy & Security

- Your AIPipe token is stored in `chrome.storage.local` — only on your device
- Page text is sent to AIPipe/Anthropic for analysis (same as using Claude.ai)
- No data is stored on any external server by this extension
- Analysis results are cached locally per URL for faster repeat access

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid AIPipe token" | Re-check your token at aipipe.org/login |
| "No readable text found" | Navigate directly to the privacy policy page |
| "Could not read this page" | Refresh the page and try again |
| Extension not showing | Check `chrome://extensions` — ensure it's enabled |
| Rate limit error | Wait 30 seconds and try again |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> Built with ❤️ using Claude AI + AIPipe

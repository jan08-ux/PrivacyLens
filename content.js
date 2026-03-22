// content.js — Extracts privacy policy text from the current page

function extractPrivacyText() {
  const bodyText = document.body.innerText;

  // Try to find a privacy-specific section by heading
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"));
  const privacyKeywords = /privacy|policy|terms|data|cookies|gdpr/i;

  let bestSection = null;
  let bestScore = 0;

  for (const heading of headings) {
    if (privacyKeywords.test(heading.innerText)) {
      let text = "";
      let el = heading.nextElementSibling;
      let count = 0;
      while (el && count < 30) {
        text += el.innerText + "\n";
        el = el.nextElementSibling;
        count++;
      }
      if (text.length > bestScore) {
        bestScore = text.length;
        bestSection = heading.innerText + "\n" + text;
      }
    }
  }

  if (bestSection && bestSection.length > 300) {
    return bestSection.slice(0, 12000);
  }

  // Fallback: return full page text (trimmed)
  return bodyText.slice(0, 12000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractText") {
    const text = extractPrivacyText();
    const url = window.location.href;
    const title = document.title;
    sendResponse({ text, url, title });
  }
  return true;
});

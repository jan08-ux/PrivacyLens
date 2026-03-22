// popup.js — Privacy Summarizer extension logic

const $ = (id) => document.getElementById(id);

// ── State ──────────────────────────────────────
let currentTab = null;

// ── Init ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Load saved API key
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) $("apiKeyInput").value = apiKey;

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  try {
    const url = new URL(tab.url);
    $("siteUrl").textContent = url.hostname;
  } catch {
    $("siteUrl").textContent = tab.url || "Unknown";
  }

  // Check if we have a cached result for this URL
  const cacheKey = "cache_" + sanitizeKey(tab.url);
  const { [cacheKey]: cached } = await chrome.storage.local.get(cacheKey);
  if (cached) {
    renderResult(cached);
    return;
  }

  // Wire up buttons
  $("analyzeBtn").addEventListener("click", startAnalysis);
  $("reAnalyzeBtn").addEventListener("click", startAnalysis);
  $("retryBtn").addEventListener("click", startAnalysis);
  $("saveKey").addEventListener("click", saveApiKey);
  $("settingsToggle").addEventListener("click", toggleSettings);
});

// ── Settings ───────────────────────────────────
function toggleSettings() {
  $("settingsPanel").classList.toggle("open");
}

async function saveApiKey() {
  const key = $("apiKeyInput").value.trim();
  if (!key) return;
  await chrome.storage.local.set({ apiKey: key });
  $("settingsPanel").classList.remove("open");
  showToast("API key saved ✓");
}

// ── Analysis Flow ──────────────────────────────
async function startAnalysis() {
  // Check for API key
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    $("settingsPanel").classList.add("open");
    showError("Please add your Anthropic API key in settings first.");
    return;
  }

  showLoading("Extracting policy text…");

  let pageData;
  try {
    [pageData] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: extractText,
    });
    pageData = pageData.result;
  } catch (e) {
    showError("Could not read this page. Try refreshing and opening the extension again.");
    return;
  }

  if (!pageData?.text || pageData.text.length < 100) {
    showError("No readable text found on this page. Navigate to a privacy policy page and try again.");
    return;
  }

  setLoadingLabel("Asking AI to analyze…");

  let result;
  try {
    result = await callClaudeAPI(apiKey, pageData.text, pageData.url);
  } catch (e) {
    showError(e.message || "Failed to contact the Claude API. Check your API key and try again.");
    return;
  }

  // Cache result
  const cacheKey = "cache_" + sanitizeKey(currentTab.url);
  await chrome.storage.local.set({ [cacheKey]: result });

  renderResult(result);
}

// ── Content Extraction (runs in page context) ──
function extractText() {
  const bodyText = document.body.innerText || "";

  // Try to find privacy-specific section
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

  const finalText = (bestSection && bestSection.length > 300)
    ? bestSection.slice(0, 12000)
    : bodyText.slice(0, 12000);

  return { text: finalText, url: window.location.href, title: document.title };
}

// ── AIPipe API Call ────────────────────────────
async function callClaudeAPI(apiKey, pageText, url) {
  const prompt = `You are a privacy policy analyst. Analyze the following text from a website (URL: ${url}) and produce a structured JSON analysis.

IMPORTANT: Return ONLY valid JSON with no markdown, no code fences, no preamble. Respond with exactly this structure:
{
  "risk": "low" | "medium" | "high",
  "summary": "2-3 sentence plain English summary of the privacy policy",
  "concerns": ["concern 1", "concern 2", ...],
  "positives": ["positive 1", "positive 2", ...],
  "bottomLine": "One sentence verdict: is this policy trustworthy or concerning?"
}

Rules:
- risk: "low" = user-friendly policy, "medium" = standard but has some issues, "high" = concerning or invasive
- concerns: up to 5 specific red flags (data selling, tracking, unclear retention, etc.)
- positives: up to 4 user-friendly practices
- If the page does NOT contain a privacy policy, set risk to "medium" and note it in the summary

Page text:
${pageText}`;

  // AIPipe uses OpenAI-compatible format at aipipe.org
  const response = await fetch("https://aipipe.org/openrouter/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Invalid AIPipe token. Please check your key in settings.");
    if (response.status === 429) throw new Error("Rate limit hit. Please wait a moment and try again.");
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  // AIPipe returns OpenAI-compatible format
  const raw = data.choices?.[0]?.message?.content || "";

  let parsed;
  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned an unexpected format. Please try again.");
  }

  return parsed;
}

// ── UI Helpers ─────────────────────────────────
function showLoading(label) {
  hide("idleState"); hide("resultState"); hide("errorState");
  show("loadingState");
  setLoadingLabel(label);
}

function setLoadingLabel(label) {
  $("loadingLabel").textContent = label;
}

function showError(msg) {
  hide("idleState"); hide("resultState"); hide("loadingState");
  show("errorState");
  $("errorMsg").textContent = msg;
}

function renderResult(result) {
  hide("idleState"); hide("loadingState"); hide("errorState");
  show("resultState");

  // Risk badge
  const badge = $("riskBadge");
  badge.className = "risk-badge " + (result.risk || "medium");
  $("riskIcon").textContent = result.risk === "low" ? "●" : result.risk === "high" ? "▲" : "◆";
  $("riskLabel").textContent = result.risk === "low"
    ? "Low Risk"
    : result.risk === "high"
    ? "High Risk"
    : "Medium Risk";

  // Summary
  $("summaryText").textContent = result.summary || "No summary available.";

  // Concerns
  const concernList = $("concernList");
  concernList.innerHTML = "";
  const concerns = result.concerns || [];
  if (concerns.length === 0) {
    concernList.innerHTML = '<li style="color:var(--muted)">No major concerns identified.</li>';
  } else {
    concerns.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c;
      concernList.appendChild(li);
    });
  }

  // Positives
  const positiveList = $("positiveList");
  positiveList.innerHTML = "";
  const positives = result.positives || [];
  if (positives.length === 0) {
    positiveList.innerHTML = '<li style="color:var(--muted)">No notable positives identified.</li>';
  } else {
    positives.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      positiveList.appendChild(li);
    });
  }

  // Bottom line
  $("bottomLine").textContent = result.bottomLine || "";
}

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

function sanitizeKey(url) {
  return (url || "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 80);
}

function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "12px", left: "50%", transform: "translateX(-50%)",
    background: "var(--accent)", color: "#000", fontFamily: "var(--mono)",
    fontSize: "11px", fontWeight: "700", padding: "6px 14px", borderRadius: "6px",
    zIndex: 9999, opacity: "1", transition: "opacity 0.4s",
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; }, 1600);
  setTimeout(() => t.remove(), 2100);
}

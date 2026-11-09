// --- STATE MANAGEMENT ---
const state = {
  surahs: [],
  currentSurahId: 1,
  currentAyahIndex: 0,
  ayahs: [],
  fontSize: 34,
  isListening: false,
  recognition: null,
  wakeLock: null,
  lastMatchedWordIndex: 0,
  isTransitioning: false,
  lastProcessedTranscript: ''
};

// --- DOM ELEMENTS ---
const surahSelect = document.getElementById('surah-select');
const ayahSelect = document.getElementById('ayah-select');
const viewport = document.getElementById('mushaf-viewport');
const container = document.getElementById('quran-container');
const bismillahBox = document.getElementById('bismillah');
const micToggleBtn = document.getElementById('mic-toggle-btn');
const micLabel = document.getElementById('mic-label');
const recognizedSpeechLabel = document.getElementById('recognized-speech');
const audioDot = document.getElementById('audio-level-dot');
const pageIndicator = document.getElementById('page-indicator');
const nextPagePreview = document.getElementById('next-page-preview');
const nextPageFirstAyah = document.getElementById('next-page-first-ayah');
const btnFontInc = document.getElementById('btn-font-inc');
const btnFontDec = document.getElementById('btn-font-dec');
const fontSizeLabel = document.getElementById('font-size-label');
const btnWakeLock = document.getElementById('btn-wake-lock');

// --- ARABIC NORMALIZATION ---
function cleanArabic(str) {
  if (!str) return '';
  return str
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // Tashkeel & Tajweed marks
    .replace(/[إأآاٱ]/g, 'ا')
    .replace(/[يىئ]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/[^\u0621-\u064A\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWordMatch(wSpoken, wTarget) {
  if (!wSpoken || !wTarget) return false;
  if (wSpoken === wTarget) return true;

  // Exact prefix/suffix check (handles Arabic 'al-', 'wa-', 'bi-' attachments)
  if (wSpoken.length >= 3 && wTarget.length >= 3) {
    if (wTarget.endsWith(wSpoken) || wSpoken.endsWith(wTarget)) return true;
    if (wTarget.startsWith(wSpoken) || wSpoken.startsWith(wTarget)) return true;
  }

  // Phonetic tolerance for stretched vowels (Madd)
  let matchingChars = 0;
  const len = Math.min(wSpoken.length, wTarget.length);
  for (let i = 0; i < len; i++) {
    if (wSpoken[i] === wTarget[i]) matchingChars++;
  }
  return (matchingChars / Math.max(wSpoken.length, wTarget.length)) >= 0.75;
}

// --- INIT APP ---
async function initApp() {
  await fetchSurahList();
  await loadSurah(state.currentSurahId);
  setupEventListeners();
  initSpeechEngine();
}

async function fetchSurahList() {
  try {
    const res = await fetch('https://api.quran.com/api/v4/chapters?language=en');
    const data = await res.json();
    state.surahs

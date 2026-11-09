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
  lastProcessedTranscript: '',
  nextSurahFirstAyahWords: []
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
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // Tashkeel & Tajweed
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

  // Handles prefixes like Al-, Wa-, Fa-, Bi-
  if (wSpoken.length >= 3 && wTarget.length >= 3) {
    if (wTarget.endsWith(wSpoken) || wSpoken.endsWith(wTarget)) return true;
    if (wTarget.startsWith(wSpoken) || wSpoken.startsWith(wTarget)) return true;
  }

  // Phonetic Madd overlap
  let matchingChars = 0;
  const len = Math.min(wSpoken.length, wTarget.length);
  for (let i = 0; i < len; i++) {
    if (wSpoken[i] === wTarget[i]) matchingChars++;
  }
  return (matchingChars / Math.max(wSpoken.length, wTarget.length)) >= 0.65;
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
    state.surahs = data.chapters;

    surahSelect.innerHTML = state.surahs.map(s => 
      `<option value="${s.id}">${s.id}. ${s.name_simple} (${s.name_arabic})</option>`
    ).join('');
  } catch (err) {
    console.error('Failed to fetch chapters:', err);
    pageIndicator.innerText = 'Offline mode or API error.';
  }
}

async function loadSurah(surahId, startAyah = 1) {
  state.isTransitioning = false;
  pageIndicator.innerText = `Loading Surah ${surahId}...`;
  viewport.innerHTML = '<div class="text-center text-slate-500 py-12">Loading verses...</div>';
  
  try {
    const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`);
    const data = await res.json();
    state.ayahs = data.verses;
    state.currentSurahId = surahId;

    if (surahId !== 1 && surahId !== 9) {
      bismillahBox.classList.remove('hidden');
    } else {
      bismillahBox.classList.add('hidden');
    }

    ayahSelect.innerHTML = state.ayahs.map((_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`).join('');
    ayahSelect.value = startAyah;

    renderAyahs();
    setActiveAyah(startAyah - 1, false);
    pageIndicator.innerText = `Surah ${state.surahs[surahId - 1]?.name_simple || surahId} • ${state.ayahs.length} Verses`;
    
    // Always preload the next surah preview
    preloadNextSurahPreview();
    container.scrollTo({ top: 0, behavior: 'smooth' });
  } catch

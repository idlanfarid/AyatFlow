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
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // Tashkeel & Tajweed marks
    .replace(/[إأآاٱ]/g, 'ا') // Normalize Alef variations
    .replace(/[يىئ]/g, 'ي')  // Normalize Yaa variations
    .replace(/ة/g, 'ه')       // Normalize Taa Marbuta
    .replace(/ؤ/g, 'و')       // Normalize Waw with Hamza
    .replace(/[^\u0621-\u064A\s]/g, '') // Keep Arabic characters only
    .replace(/\s+/g, ' ')
    .trim();
}

function isWordMatch(wSpoken, wTarget) {
  if (!wSpoken || !wTarget) return false;
  if (wSpoken === wTarget) return true;

  // Handles attached prefixes (Al-, Wa-, Fa-, Bi-)
  if (wSpoken.length >= 3 && wTarget.length >= 3) {
    if (wTarget.endsWith(wSpoken) || wSpoken.endsWith(wTarget)) return true;
    if (wTarget.startsWith(wSpoken) || wSpoken.startsWith(wTarget)) return true;
  }

  // Phonetic tolerance for stretched recitation (Madd)
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
    
    surahSelect.value = state.currentSurahId;
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

    // Keep Surah Dropdown synced
    if (surahSelect.options.length > 0) {
      surahSelect.value = surahId;
    }

    // Toggle Bismillah
    if (surahId !== 1 && surahId !== 9) {
      bismillahBox.classList.remove('hidden');
    } else {
      bismillahBox.classList.add('hidden');
    }

    // Re-populate and sync Ayah Dropdown
    ayahSelect.innerHTML = state.ayahs.map((_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`).join('');
    ayahSelect.value = startAyah;

    renderAyahs();
    setActiveAyah(startAyah - 1, false);
    pageIndicator.innerText = `Surah ${state.surahs[surahId - 1]?.name_simple || surahId} • ${state.ayahs.length} Verses`;
    
    preloadNextSurahPreview();
    container.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Error loading Surah:', err);
  }
}

function renderAyahs() {
  viewport.innerHTML = state.ayahs.map((ayah, aIdx) => {
    const rawWords = ayah.text_uthmani.split(' ');
    const renderedWords = rawWords.map((w, wIdx) => 
      `<span class="ayah-word inline-block mx-[2px] transition-colors duration-150" id="word-${aIdx}-${wIdx}">${w}</span>`
    ).join(' ');

    return `
      <span id="ayah-${aIdx}" class="ayah-block inline p-1 rounded-xl transition-all duration-300 cursor-pointer" onclick="setActiveAyah(${aIdx}, true)">
        ${renderedWords}
        <span class="ayah-number">﴿${aIdx + 1}﴾</span>
      </span>
    `;
  }).join(' ');

  updateFontSize();
}

// --- 2/3 VIEWPORT SMOOTH SCROLL ---
function scrollToActiveAyah(el) {
  if (!el || !container) return;

  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  const triggerThreshold = containerRect.top + (containerRect.height * 0.60);

  if (elRect.bottom > triggerThreshold || elRect.top < containerRect.top) {
    const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - (containerRect.height * 0.25);
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }
}

function setActiveAyah(index, manualJump = false) {
  if (index < 0 || index >= state.ayahs.length) return;
  state.currentAyahIndex = index;
  state.lastMatchedWordIndex = 0;
  ayahSelect.value = index + 1;

  document.querySelectorAll('.ayah-block').forEach((el, i) => {
    if (i === index) {
      el.classList.add('active-ayah');
      scrollToActiveAyah(el);
    } else {
      el.classList.remove('active-ayah');
    }
  });

  checkPageBoundaryPreview();
}

// --- PREVIEW & AUTO-FLIP ---
async function preloadNextSurahPreview() {
  const nextSurahId = state.currentSurahId + 1;
  state.nextSurahFirstAyahWords = [];
  if (nextSurahId <= 114) {
    try {
      const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${nextSurahId}`);
      const data = await res.json();
      if (data.verses && data.verses.length > 0) {
        const firstAyahText = data.verses[0].text_uthmani;
        nextPageFirstAyah.innerText = firstAyahText + ' ﴿1﴾';
        state.nextSurahFirstAyahWords = cleanArabic(firstAyahText).split(' ').filter(Boolean);
      }
    } catch (e) {
      console.warn(e);
    }
  }
}

function checkPageBoundaryPreview() {
  if (state.currentAyahIndex >= state.ayahs.length - 2) {
    nextPagePreview.classList.remove('hidden');
  } else {
    nextPagePreview.classList.add('hidden');
  }
}

function autoFlipToNextSurah() {
  if (state.isTransitioning) return;
  state.isTransitioning = true;

  if (state.currentSurahId < 114) {
    const nextId = state.currentSurahId + 1;
    recognizedSpeechLabel.innerText = `Advancing to next Surah...`;
    
    setTimeout(() => {
      loadSurah(nextId, 1);
    }, 400);
  }
}

// --- VOICE RECOGNITION ENGINE ---
function initSpeechEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    recognizedSpeechLabel.innerText = 'Voice detection not supported on this browser. Try Chrome or Safari.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ar-SA';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    audioDot.classList.remove('bg-slate-600');
    audioDot.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
  };

  recognition.onresult = (event) => {
    if (state.isTransitioning) return;

    let currentTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      currentTranscript += ' ' + event.results[i][0].transcript;
    }

    const cleanInput = cleanArabic(currentTranscript);
    if (!cleanInput || cleanInput === state.lastProcessedTranscript) return;
    state.lastProcessedTranscript = cleanInput;

    recognizedSpeechLabel.innerText = `Heard: "${currentTranscript.trim()}"`;
    matchRecitationSequential(cleanInput);
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      alert('Microphone permission denied.');
      stopListeningUI();
    }
  };

  recognition.onend = () => {
    if (state.isListening) {
      try { recognition.start(); } catch (_) {}
    } else {
      audioDot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
      audioDot.classList.add('bg-slate-600');
    }
  };

  state.recognition = recognition;
}

// --- SEQUENTIAL MATCHING & AUTO-FLIP ---
function matchRecitationSequential(spokenText) {
  if (state.isTransitioning) return;

  const spokenTokens = spokenText.split(' ').filter(Boolean);
  const currentAyah = state.ayahs[state.currentAyahIndex];
  if (!currentAyah || spokenTokens.length === 0) return;

  const ayahClean = cleanArabic(currentAyah.text_uthmani);
  const ayahWords = ayahClean.split(' ').filter(Boolean);
  const totalWords = ayahWords.length;
  const isFinalAyahOfSurah = (state.currentAyahIndex === state.ayahs.length - 1);

  // 1. Check if user is reciting the previewed next Surah's first line (2/3 auto-flip)
  if (isFinalAyahOfSurah && state.nextSurahFirstAyahWords.length > 0) {
    let nextWordsMatched = 0;
    for (const spoken of spokenTokens) {
      for (let nw = 0; nw < state.nextSurahFirstAyahWords.length; nw++) {
        if (isWordMatch(spoken, state.nextSurahFirstAyahWords[nw])) {
          nextWordsMatched++;
          break;
        }
      }
    }
    const flipCutoff = Math.max(1, Math.floor(state.nextSurahFirstAyahWords.length * 0.60));
    if (nextWordsMatched >= flipCutoff || (state.lastMatchedWordIndex >= totalWords - 2 && nextWordsMatched >= 1)) {
      autoFlipToNextSurah();
      return;
    }
  }

  // 2. Track words in active Ayah
  const recentSpoken = spokenTokens.slice(-4);
  for (const spokenWord of recentSpoken) {
    const searchLimit = Math.min(state.lastMatchedWordIndex + 3, totalWords);

    for (let w = state.lastMatchedWordIndex; w < searchLimit; w++) {
      if (isWordMatch(spokenWord, ayahWords[w])) {
        const wordEl = document.getElementById(`word-${state.currentAyahIndex}-${w}`);
        if (wordEl) wordEl.classList.add('active-word');

        state.lastMatchedWordIndex = w + 1;

        // Auto-scroll midway
        if (w >= Math.floor(totalWords * 0.5)) {
          const ayahEl = document.getElementById(`ayah-${state.currentAyahIndex}`);
          if (ayahEl) scrollToActiveAyah(ayahEl);
        }
        break;
      }
    }
  }

  // 3. Auto-advance logic
  if (isFinalAyahOfSurah) {
    if (state.lastMatchedWordIndex >= Math.max(1, totalWords - 2)) {
      autoFlipToNextSurah();
    }
  } else {
    if (state.lastMatchedWordIndex >= Math.max(1, totalWords - 1)) {
      setTimeout(() => {
        if (!state.isTransitioning && state.currentAyahIndex < state.ayahs.length - 1) {
          setActiveAyah(state.currentAyahIndex + 1);
        }
      }, 350);
    }
  }
}

// --- CONTROLS & LISTENERS ---
function setupEventListeners() {
  surahSelect.addEventListener('change', (e) => loadSurah(parseInt(e.target.value), 1));
  ayahSelect.addEventListener('change', (e) => setActiveAyah(parseInt(e.target.value) - 1, true));
  micToggleBtn.addEventListener('click', toggleListening);

  btnFontInc.addEventListener('click', () => {
    if (state.fontSize < 64) {
      state.fontSize += 2;
      updateFontSize();
    }
  });

  btnFontDec.addEventListener('click', () => {
    if (state.fontSize > 20) {
      state.fontSize -= 2;
      updateFontSize();
    }
  });

  btnWakeLock.addEventListener('click', toggleWakeLock);
}

function updateFontSize() {
  viewport.style.fontSize = `${state.fontSize}px`;
  fontSizeLabel.innerText = `${state.fontSize}px`;
}

async function toggleWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      if (!state.wakeLock) {
        state.wakeLock = await navigator.wakeLock.request('screen');
        btnWakeLock.innerText = 'Keep Screen On: Active';
        btnWakeLock.classList.add('text-emerald-400');
      } else {
        await state.wakeLock.release();
        state.wakeLock = null;
        btnWakeLock.innerText = 'Keep Screen On: Off';
        btnWakeLock.classList.remove('text-emerald-400');
      }
    } catch (_) {}
  }
}

function stopListeningUI() {
  state.isListening = false;
  micLabel.innerText = 'Start Listening';
  micToggleBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
  micToggleBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
  audioDot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
  audioDot.classList.add('bg-slate-600');
}

function toggleListening() {
  if (!state.recognition) {
    alert('Speech recognition is not supported on this browser. Please use Google Chrome or Safari.');
    return;
  }

  if (!state.isListening) {
    try {
      state.recognition.start();
      state.isListening = true;
      micLabel.innerText = 'Listening...';
      micToggleBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
      micToggleBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
      if (!state.wakeLock) toggleWakeLock();
    } catch (e) {
      console.error(e);
    }
  } else {
    state.recognition.stop();
    stopListeningUI();
  }
}

initApp();

// --- STATE MANAGEMENT ---
const state = {
  surahs: [],
  currentSurahId: 1,
  currentAyahIndex: 0,
  ayahs: [],
  fontSize: 34,
  isListening: false,
  recognition: null,
  audioContext: null,
  analyser: null,
  wakeLock: null
};

// --- DOM ELEMENTS ---
const surahSelect = document.getElementById('surah-select');
const ayahSelect = document.getElementById('ayah-select');
const viewport = document.getElementById('mushaf-viewport');
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

// --- ARABIC NORMALIZATION (Strips Tashkeel & Unifies Letters for Speech Matching) ---
function normalizeArabic(text) {
  if (!text) return '';
  return text
    // Remove Tashkeel (vowels: Fatha, Damma, Kasra, Sukun, Shaddah, Tanween)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alef variations (أ, إ, آ -> ا)
    .replace(/[إأآا]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Yaa (ى -> ي)
    .replace(/ى/g, 'ي')
    // Remove Quranic punctuation and pause markers
    .replace(/[\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .trim();
}

// --- INITIALIZE & FETCH QURAN DATA ---
async function initApp() {
  await fetchSurahList();
  loadSurah(state.currentSurahId);
  setupEventListeners();
  setupSpeechEngine();
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
    pageIndicator.innerText = 'Offline mode or failed to connect.';
  }
}

async function loadSurah(surahId, startAyah = 1) {
  pageIndicator.innerText = `Fetching Surah ${surahId}...`;
  viewport.innerHTML = '<div class="text-center text-slate-500 py-12">Loading verses...</div>';
  
  try {
    // Fetch Uthmani text with verse keys
    const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`);
    const data = await res.json();
    state.ayahs = data.verses;

    // Show/hide Bismillah (exclude Surah 1 & 9)
    if (surahId !== 1 && surahId !== 9) {
      bismillahBox.classList.remove('hidden');
    } else {
      bismillahBox.classList.add('hidden');
    }

    // Populate Ayah selector
    ayahSelect.innerHTML = state.ayahs.map((_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`).join('');
    ayahSelect.value = startAyah;

    renderAyahs();
    setActiveAyah(startAyah - 1);
    pageIndicator.innerText = `Surah ${state.surahs[surahId - 1]?.name_simple || surahId} • ${state.ayahs.length} Verses`;
  } catch (err) {
    console.error('Error loading Surah:', err);
    viewport.innerHTML = '<div class="text-center text-red-400 py-12">Error loading Quran text.</div>';
  }
}

function renderAyahs() {
  viewport.innerHTML = state.ayahs.map((ayah, index) => {
    const words = ayah.text_uthmani.split(' ');
    const renderedWords = words.map((w, wIdx) => 
      `<span class="ayah-word" data-word-idx="${wIdx}">${w}</span>`
    ).join(' ');

    return `
      <span id="ayah-${index}" class="ayah-block inline px-1 py-1 transition-colors duration-200 cursor-pointer" onclick="jumpToAyah(${index})">
        ${renderedWords}
        <span class="ayah-number">﴿${index + 1}﴾</span>
      </span>
    `;
  }).join(' ');

  updateFontSize();
}

function setActiveAyah(index) {
  if (index < 0 || index >= state.ayahs.length) return;
  state.currentAyahIndex = index;
  ayahSelect.value = index + 1;

  document.querySelectorAll('.ayah-block').forEach((el, i) => {
    if (i === index) {
      el.classList.add('active-ayah');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.remove('active-ayah');
    }
  });

  checkPageBoundaryPreview();
}

function jumpToAyah(index) {
  setActiveAyah(index);
}

// --- NEXT PAGE / SURAH PREVIEW & 2/3 AUTO-FLIP ---
async function checkPageBoundaryPreview() {
  // If user reaches within 2 ayahs of the end of current Surah
  if (state.currentAyahIndex >= state.ayahs.length - 2) {
    const nextSurahId = state.currentSurahId + 1;
    if (nextSurahId <= 114) {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${nextSurahId}`);
        const data = await res.json();
        if (data.verses && data.verses.length > 0) {
          nextPageFirstAyah.innerText = data.verses[0].text_uthmani + ' ﴿1﴾';
          nextPagePreview.classList.remove('hidden');
        }
      } catch (e) {
        console.warn('Could not preload next surah', e);
      }
    }
  } else {
    nextPagePreview.classList.add('hidden');
  }
}

// Trigger flip when Imam recites ~2/3 of the transition target
function triggerAutoFlipNext() {
  if (state.currentSurahId < 114) {
    state.currentSurahId++;
    surahSelect.value = state.currentSurahId;
    loadSurah(state.currentSurahId, 1);
  }
}

// --- VOICE RECOGNITION & FUZZY MATCHING ENGINE ---
function setupSpeechEngine() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    recognizedSpeechLabel.innerText = 'Voice detection not supported on this browser (Use Chrome or Safari).';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ar-SA';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    
    recognizedSpeechLabel.innerText = `Heard: "${transcript}"`;
    processRecitedSpeech(transcript);
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech') {
      console.warn('Speech recognition error:', e.error);
    }
  };

  recognition.onend = () => {
    if (state.isListening) {
      try { recognition.start(); } catch (_) {}
    }
  };

  state.recognition = recognition;
}

function processRecitedSpeech(spokenText) {
  const cleanSpoken = normalizeArabic(spokenText);
  if (!cleanSpoken) return;

  const currentAyah = state.ayahs[state.currentAyahIndex];
  if (!currentAyah) return;

  const cleanCurrentAyah = normalizeArabic(currentAyah.text_uthmani);
  const currentWords = cleanCurrentAyah.split(' ');
  const spokenWords = cleanSpoken.split(' ');
  const lastSpokenWord = spokenWords[spokenWords.length - 1];

  // Check matching word within a look-ahead window
  let matchedIndex = -1;
  for (let i = 0; i < currentWords.length; i++) {
    if (currentWords[i].includes(lastSpokenWord) || lastSpokenWord.includes(currentWords[i])) {
      matchedIndex = i;
      break;
    }
  }

  // Highlight word if found
  if (matchedIndex !== -1) {
    const ayahEl = document.getElementById(`ayah-${state.currentAyahIndex}`);
    if (ayahEl) {
      const wordSpans = ayahEl.querySelectorAll('.ayah-word');
      wordSpans.forEach((span, wIdx) => {
        if (wIdx === matchedIndex) {
          span.classList.add('active-word');
        }
      });
    }

    // Auto-advance verse if match reaches near end of Ayah
    if (matchedIndex >= currentWords.length - 2) {
      if (state.currentAyahIndex < state.ayahs.length - 1) {
        setTimeout(() => setActiveAyah(state.currentAyahIndex + 1), 600);
      } else {
        // At the end of the Surah, trigger auto-flip
        setTimeout(() => triggerAutoFlipNext(), 800);
      }
    }
  }
}

// --- HARDWARE AUDIO METER & NOISE SUPPRESSION ---
async function startAudioMeter() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    const source = state.audioContext.createMediaStreamSource(stream);
    source.connect(state.analyser);
    state.analyser.fftSize = 64;

    const dataArray = new Uint8Array(state.analyser.frequencyBinCount);
    function updateMeter() {
      if (!state.isListening) return;
      state.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      let avg = sum / dataArray.length;

      // Pulse green dot based on vocal presence
      if (avg > 25) {
        audioDot.classList.remove('bg-slate-600');
        audioDot.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
      } else {
        audioDot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
        audioDot.classList.add('bg-slate-600');
      }
      requestAnimationFrame(updateMeter);
    }
    updateMeter();
  } catch (err) {
    console.warn('Audio meter initialization skipped:', err);
  }
}

// --- EVENT LISTENERS & UI HELPERS ---
function setupEventListeners() {
  surahSelect.addEventListener('change', (e) => {
    state.currentSurahId = parseInt(e.target.value);
    loadSurah(state.currentSurahId, 1);
  });

  ayahSelect.addEventListener('change', (e) => {
    setActiveAyah(parseInt(e.target.value) - 1);
  });

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
    } catch (e) {
      console.warn('Wake Lock error:', e);
    }
  }
}

function toggleListening() {
  if (!state.recognition) {
    alert('Speech recognition is not available in this browser.');
    return;
  }

  if (!state.isListening) {
    try {
      state.recognition.start();
      state.isListening = true;
      micLabel.innerText = 'Listening...';
      micToggleBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
      micToggleBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
      startAudioMeter();
      if (!state.wakeLock) toggleWakeLock();
    } catch (e) {
      console.error(e);
    }
  } else {
    state.recognition.stop();
    state.isListening = false;
    micLabel.innerText = 'Start Listening';
    micToggleBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
    micToggleBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
  }
}

// Start
initApp();

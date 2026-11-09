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

// Fallback Surahs list to ensure dropdowns always populate instantly
const FALLBACK_SURAHS = [
  { id: 1, name_simple: "Al-Fatihah", name_arabic: "الفاتحة" },
  { id: 2, name_simple: "Al-Baqarah", name_arabic: "البقرة" },
  { id: 3, name_simple: "Ali 'Imran", name_arabic: "آل عمران" },
  { id: 4, name_simple: "An-Nisa", name_arabic: "النساء" },
  { id: 5, name_simple: "Al-Ma'idah", name_arabic: "المائدة" },
  { id: 6, name_simple: "Al-An'am", name_arabic: "الأنعام" },
  { id: 7, name_simple: "Al-A'raf", name_arabic: "الأعراف" },
  { id: 8, name_simple: "Al-Anfal", name_arabic: "الأنفال" },
  { id: 9, name_simple: "At-Tawbah", name_arabic: "التوبة" },
  { id: 10, name_simple: "Yunus", name_arabic: "يونس" },
  { id: 11, name_simple: "Hud", name_arabic: "هود" },
  { id: 12, name_simple: "Yusuf", name_arabic: "يوسف" },
  { id: 13, name_simple: "Ar-Ra'd", name_arabic: "الرعد" },
  { id: 14, name_simple: "Ibrahim", name_arabic: "إبراهيم" },
  { id: 15, name_simple: "Al-Hijr", name_arabic: "الحجر" },
  { id: 16, name_simple: "An-Nahl", name_arabic: "النحل" },
  { id: 17, name_simple: "Al-Isra", name_arabic: "الإسراء" },
  { id: 18, name_simple: "Al-Kahf", name_arabic: "الكهف" },
  { id: 19, name_simple: "Maryam", name_arabic: "مريم" },
  { id: 20, name_simple: "Taha", name_arabic: "طه" },
  { id: 21, name_simple: "Al-Anbiya", name_arabic: "الأنبياء" },
  { id: 22, name_simple: "Al-Hajj", name_arabic: "الحج" },
  { id: 23, name_simple: "Al-Mu'minun", name_arabic: "المؤمنون" },
  { id: 24, name_simple: "An-Nur", name_arabic: "النور" },
  { id: 25, name_simple: "Al-Furqan", name_arabic: "الفرقان" },
  { id: 26, name_simple: "Ash-Shu'ara", name_arabic: "الشعراء" },
  { id: 27, name_simple: "An-Naml", name_arabic: "النمل" },
  { id: 28, name_simple: "Al-Qasas", name_arabic: "القصص" },
  { id: 29, name_simple: "Al-'Ankabut", name_arabic: "العنكبوت" },
  { id: 30, name_simple: "Ar-Rum", name_arabic: "الروم" },
  { id: 31, name_simple: "Luqman", name_arabic: "لقمان" },
  { id: 32, name_simple: "As-Sajdah", name_arabic: "السجدة" },
  { id: 33, name_simple: "Al-Ahzab", name_arabic: "الأحزاب" },
  { id: 34, name_simple: "Saba", name_arabic: "سبأ" },
  { id: 35, name_simple: "Fatir", name_arabic: "فاطر" },
  { id: 36, name_simple: "Ya-Sin", name_arabic: "يس" },
  { id: 37, name_simple: "As-Saffat", name_arabic: "الصافات" },
  { id: 38, name_simple: "Sad", name_arabic: "ص" },
  { id: 39, name_simple: "Az-Zumar", name_arabic: "الزمر" },
  { id: 40, name_simple: "Ghafir", name_arabic: "غافر" },
  { id: 41, name_simple: "Fussilat", name_arabic: "فصلت" },
  { id: 42, name_simple: "Ash-Shuraa", name_arabic: "الشورى" },
  { id: 43, name_simple: "Az-Zukhruf", name_arabic: "الزخرف" },
  { id: 44, name_simple: "Ad-Dukhan", name_arabic: "الدخان" },
  { id: 45, name_simple: "Al-Jathiyah", name_arabic: "الجاثية" },
  { id: 46, name_simple: "Al-Ahqaf", name_arabic: "الأحقاف" },
  { id: 47, name_simple: "Muhammad", name_arabic: "محمد" },
  { id: 48, name_simple: "Al-Fath", name_arabic: "الفتح" },
  { id: 49, name_simple: "Al-Hujurat", name_arabic: "الحجرات" },
  { id: 50, name_simple: "Qaf", name_arabic: "ق" },
  { id: 51, name_simple: "Adh-Dhariyat", name_arabic: "الذاريات" },
  { id: 52, name_simple: "At-Tur", name_arabic: "الطور" },
  { id: 53, name_simple: "An-Najm", name_arabic: "النجم" },
  { id: 54, name_simple: "Al-Qamar", name_arabic: "القمر" },
  { id: 55, name_simple: "Ar-Rahman", name_arabic: "الرحمن" },
  { id: 56, name_simple: "Al-Waqi'ah", name_arabic: "الواقعة" },
  { id: 57, name_simple: "Al-Hadid", name_arabic: "الحديد" },
  { id: 58, name_simple: "Al-Mujadila", name_arabic: "المجادلة" },
  { id: 59, name_simple: "Al-Hashr", name_arabic: "الحشر" },
  { id: 60, name_simple: "Al-Mumtahanah", name_arabic: "الممتحنة" },
  { id: 61, name_simple: "As-Saf", name_arabic: "الصف" },
  { id: 62, name_simple: "Al-Jumu'ah", name_arabic: "الجمعة" },
  { id: 63, name_simple: "Al-Munafiqun", name_arabic: "المنافقون" },
  { id: 64, name_simple: "At-Taghabun", name_arabic: "التغابن" },
  { id: 65, name_simple: "At-Talaq", name_arabic: "الطلاق" },
  { id: 66, name_simple: "At-Tahrim", name_arabic: "التحريم" },
  { id: 67, name_simple: "Al-Mulk", name_arabic: "الملك" },
  { id: 68, name_simple: "Al-Qalam", name_arabic: "القلم" },
  { id: 69, name_simple: "Al-Haqqah", name_arabic: "الحاقة" },
  { id: 70, name_simple: "Al-Ma'arij", name_arabic: "المعارج" },
  { id: 71, name_simple: "Nuh", name_arabic: "نوح" },
  { id: 72, name_simple: "Al-Jinn", name_arabic: "الجن" },
  { id: 73, name_simple: "Al-Muzzammil", name_arabic: "المزمل" },
  { id: 74, name_simple: "Al-Muddaththir", name_arabic: "المدثر" },
  { id: 75, name_simple: "Al-Qiyamah", name_arabic: "القيامة" },
  { id: 76, name_simple: "Al-Insan", name_arabic: "الإنسان" },
  { id: 77, name_simple: "Al-Mursalat", name_arabic: "المرسلات" },
  { id: 78, name_simple: "An-Naba", name_arabic: "النبأ" },
  { id: 79, name_simple: "An-Nazi'at", name_arabic: "النازعات" },
  { id: 80, name_simple: "'Abasa", name_arabic: "عبس" },
  { id: 81, name_simple: "At-Takwir", name_arabic: "التكوير" },
  { id: 82, name_simple: "Al-Infitar", name_arabic: "الانفطار" },
  { id: 83, name_simple: "Al-Mutaffifin", name_arabic: "المطففين" },
  { id: 84, name_simple: "Al-Inshiqaq", name_arabic: "الانشقاق" },
  { id: 85, name_simple: "Al-Buruj", name_arabic: "البروج" },
  { id: 86, name_simple: "At-Tariq", name_arabic: "الطارق" },
  { id: 87, name_simple: "Al-A'la", name_arabic: "الأعلى" },
  { id: 88, name_simple: "Al-Ghashiyah", name_arabic: "الغاشية" },
  { id: 89, name_simple: "Al-Fajr", name_arabic: "الفجر" },
  { id: 90, name_simple: "Al-Balad", name_arabic: "البلد" },
  { id: 91, name_simple: "Ash-Shams", name_arabic: "الشمس" },
  { id: 92, name_simple: "Al-Layl", name_arabic: "الليل" },
  { id: 93, name_simple: "Ad-Duhaa", name_arabic: "الضحى" },
  { id: 94, name_simple: "Ash-Sharh", name_arabic: "الشرح" },
  { id: 95, name_simple: "At-Tin", name_arabic: "التين" },
  { id: 96, name_simple: "Al-'Alaq", name_arabic: "العلق" },
  { id: 97, name_simple: "Al-Qadr", name_arabic: "القدر" },
  { id: 98, name_simple: "Al-Bayyinah", name_arabic: "البينة" },
  { id: 99, name_simple: "Az-Zalzalah", name_arabic: "الزلزلة" },
  { id: 100, name_simple: "Al-'Adiyat", name_arabic: "العاديات" },
  { id: 101, name_simple: "Al-Qari'ah", name_arabic: "القارعة" },
  { id: 102, name_simple: "At-Takathur", name_arabic: "التكاثر" },
  { id: 103, name_simple: "Al-'Asr", name_arabic: "العصر" },
  { id: 104, name_simple: "Al-Humazah", name_arabic: "الهمزة" },
  { id: 105, name_simple: "Al-Fil", name_arabic: "الفيل" },
  { id: 106, name_simple: "Quraysh", name_arabic: "قريش" },
  { id: 107, name_simple: "Al-Ma'un", name_arabic: "الماعون" },
  { id: 108, name_simple: "Al-Kawthar", name_arabic: "الكوثر" },
  { id: 109, name_simple: "Al-Kafirun", name_arabic: "الكافرون" },
  { id: 110, name_simple: "An-Nasr", name_arabic: "النصر" },
  { id: 111, name_simple: "Al-Masad", name_arabic: "المسد" },
  { id: 112, name_simple: "Al-Ikhlas", name_arabic: "الإخلاص" },
  { id: 113, name_simple: "Al-Falaq", name_arabic: "الفلق" },
  { id: 114, name_simple: "An-Nas", name_arabic: "الناس" }
];

// --- ARABIC NORMALIZATION ---
function cleanArabic(str) {
  if (!str) return '';
  return str
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
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

  if (wSpoken.length >= 3 && wTarget.length >= 3) {
    if (wTarget.endsWith(wSpoken) || wSpoken.endsWith(wTarget)) return true;
    if (wTarget.startsWith(wSpoken) || wSpoken.startsWith(wTarget)) return true;
  }

  let matchingChars = 0;
  const len = Math.min(wSpoken.length, wTarget.length);
  for (let i = 0; i < len; i++) {
    if (wSpoken[i] === wTarget[i]) matchingChars++;
  }
  // Tight tolerance to prevent false skipping
  return (matchingChars / Math.max(wSpoken.length, wTarget.length)) >= 0.85;
}

// --- INITIALIZATION AFTER DOM IS READY ---
document.addEventListener('DOMContentLoaded', () => {
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

  function populateSurahDropdown(list) {
    if (!surahSelect) return;
    surahSelect.innerHTML = list.map(s => 
      `<option value="${s.id}">${s.id}. ${s.name_simple} (${s.name_arabic})</option>`
    ).join('');
    surahSelect.value = state.currentSurahId;
  }

  async function fetchSurahList() {
    try {
      const res = await fetch('https://api.quran.com/api/v4/chapters?language=en');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      state.surahs = data.chapters;
      populateSurahDropdown(state.surahs);
    } catch (err) {
      console.warn('Using fallback surah list:', err);
      state.surahs = FALLBACK_SURAHS;
      populateSurahDropdown(state.surahs);
    }
  }

  async function loadSurah(surahId, startAyah = 1) {
    state.isTransitioning = false;
    if (pageIndicator) pageIndicator.innerText = `Loading Surah ${surahId}...`;
    if (viewport) viewport.innerHTML = '<div class="text-center text-slate-500 py-12">Loading verses...</div>';

    try {
      const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`);
      if (!res.ok) throw new Error('Failed to fetch verses');
      const data = await res.json();
      state.ayahs = data.verses;
      state.currentSurahId = surahId;

      if (surahSelect) surahSelect.value = surahId;

      if (bismillahBox) {
        if (surahId !== 1 && surahId !== 9) {
          bismillahBox.classList.remove('hidden');
        } else {
          bismillahBox.classList.add('hidden');
        }
      }

      if (ayahSelect) {
        ayahSelect.innerHTML = state.ayahs.map((_, i) => `<option value="${i + 1}">Ayah ${i + 1}</option>`).join('');
        ayahSelect.value = startAyah;
      }

      renderAyahs();
      setActiveAyah(startAyah - 1, false);

      const sName = state.surahs.find(s => s.id === surahId)?.name_simple || surahId;
      if (pageIndicator) pageIndicator.innerText = `Surah ${sName} • ${state.ayahs.length} Verses`;

      preloadNextSurahPreview();
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading Surah:', err);
      if (viewport) viewport.innerHTML = '<div class="text-center text-rose-400 py-12">Error loading Quran text. Check connection.</div>';
    }
  }

  function renderAyahs() {
    if (!viewport) return;
    viewport.innerHTML = state.ayahs.map((ayah, aIdx) => {
      const rawWords = ayah.text_uthmani.split(' ');
      const renderedWords = rawWords.map((w, wIdx) => 
        `<span class="ayah-word inline-block mx-[2px] transition-colors duration-150" id="word-${aIdx}-${wIdx}">${w}</span>`
      ).join(' ');

      return `
        <span id="ayah-${aIdx}" class="ayah-block inline p-1 rounded-xl transition-all duration-300 cursor-pointer" onclick="window.AyatFlowJump(${aIdx})">
          ${renderedWords}
          <span class="ayah-number">﴿${aIdx + 1}﴾</span>
        </span>
      `;
    }).join(' ');

    updateFontSize();
  }

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
    if (ayahSelect) ayahSelect.value = index + 1;

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

  window.AyatFlowJump = (idx) => setActiveAyah(idx, true);

  async function preloadNextSurahPreview() {
    const nextSurahId = state.currentSurahId + 1;
    state.nextSurahFirstAyahWords = [];
    if (nextSurahId <= 114) {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${nextSurahId}`);
        const data = await res.json();
        if (data.verses && data.verses.length > 0 && nextPageFirstAyah) {
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
    if (!nextPagePreview) return;
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
      if (recognizedSpeechLabel) recognizedSpeechLabel.innerText = `Advancing to next Surah...`;
      setTimeout(() => {
        loadSurah(nextId, 1);
      }, 400);
    }
  }

  // --- SPEECH RECOGNITION ---
  function initSpeechEngine() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (recognizedSpeechLabel) recognizedSpeechLabel.innerText = 'Voice detection not supported on this browser. Use Chrome or Safari.';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (audioDot) {
        audioDot.classList.remove('bg-slate-600');
        audioDot.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
      }
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

      if (recognizedSpeechLabel) recognizedSpeechLabel.innerText = `Heard: "${currentTranscript.trim()}"`;
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
      } else if (audioDot) {
        audioDot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
        audioDot.classList.add('bg-slate-600');
      }
    };

    state.recognition = recognition;
  }

  function matchRecitationSequential(spokenText) {
    if (state.isTransitioning) return;

    const spokenTokens = spokenText.split(' ').filter(Boolean);
    const currentAyah = state.ayahs[state.currentAyahIndex];
    if (!currentAyah || spokenTokens.length === 0) return;

    const ayahClean = cleanArabic(currentAyah.text_uthmani);
    const ayahWords = ayahClean.split(' ').filter(Boolean);
    const totalWords = ayahWords.length;
    const isFinalAyahOfSurah = (state.currentAyahIndex === state.ayahs.length - 1);

    // 1. Next page auto-flip logic (2/3 of preview line)
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
      if (nextWordsMatched >= flipCutoff || (state.lastMatchedWordIndex >= totalWords - 1 && nextWordsMatched >= 1)) {
        autoFlipToNextSurah();
        return;
      }
    }

    // 2. Track words in active Ayah
    const recentSpoken = spokenTokens.slice(-6);
    for (const spokenWord of recentSpoken) {
      // Strict Look-Ahead: Only looks at the current word or max 1 word ahead.
      const searchLimit = Math.min(state.lastMatchedWordIndex + 2, totalWords);

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
      if (state.lastMatchedWordIndex >= Math.max(1, totalWords - 1)) {
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

  function updateFontSize() {
    if (viewport) viewport.style.fontSize = `${state.fontSize}px`;
    if (fontSizeLabel) fontSizeLabel.innerText = `${state.fontSize}px`;
  }

  function stopListeningUI() {
    state.isListening = false;
    if (micLabel) micLabel.innerText = 'Start Listening';
    if (micToggleBtn) {
      micToggleBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
      micToggleBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
    }
    if (audioDot) {
      audioDot.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#34d399]');
      audioDot.classList.add('bg-slate-600');
    }
  }

  function toggleListening() {
    if (!state.recognition) {
      alert('Speech recognition is not supported on this browser. Please use Chrome or Safari.');
      return;
    }

    if (!state.isListening) {
      try {
        state.recognition.start();
        state.isListening = true;
        if (micLabel) micLabel.innerText = 'Listening...';
        if (micToggleBtn) {
          micToggleBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
          micToggleBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'animate-pulse');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      state.recognition.stop();
      stopListeningUI();
    }
  }

  // Attach event handlers safely
  if (surahSelect) {
    surahSelect.addEventListener('change', (e) => loadSurah(parseInt(e.target.value), 1));
  }
  if (ayahSelect) {
    ayahSelect.addEventListener('change', (e) => setActiveAyah(parseInt(e.target.value) - 1, true));
  }
  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', toggleListening);
  }
  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      if (state.fontSize < 64) {
        state.fontSize += 2;
        updateFontSize();
      }
    });
  }
  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      if (state.fontSize > 20) {
        state.fontSize -= 2;
        updateFontSize();
      }
    });
  }

  // Run initial setup
  populateSurahDropdown(FALLBACK_SURAHS);
  fetchSurahList();
  loadSurah(state.currentSurahId);
  initSpeechEngine();
});

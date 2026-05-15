const VOCAB_DATA = {
  no: {
    label: 'Norwegian',
    lang: 'nb-NO',
    words: [
      { en: 'Hello',      local: 'Hei' },
      { en: 'Goodbye',    local: 'Ha det' },
      { en: 'Please',     local: 'Vær så snill' },
      { en: 'Thank you',  local: 'Takk' },
      { en: 'Bathroom',   local: 'Toalett' },
    ],
  },
  nl: {
    label: 'Dutch',
    lang: 'nl-NL',
    words: [
      { en: 'Hello',      local: 'Hallo' },
      { en: 'Goodbye',    local: 'Dag' },
      { en: 'Please',     local: 'Alstublieft' },
      { en: 'Thank you',  local: 'Dank u' },
      { en: 'Bathroom',   local: 'Toilet' },
    ],
  },
  pl: {
    label: 'Polish',
    lang: 'pl-PL',
    words: [
      { en: 'Hello',      local: 'Cześć' },
      { en: 'Goodbye',    local: 'Do widzenia' },
      { en: 'Please',     local: 'Proszę' },
      { en: 'Thank you',  local: 'Dziękuję' },
      { en: 'Bathroom',   local: 'Toaleta' },
    ],
  },
  fi: {
    label: 'Finnish',
    lang: 'fi-FI',
    words: [
      { en: 'Hello',      local: 'Hei' },
      { en: 'Goodbye',    local: 'Näkemiin' },
      { en: 'Please',     local: 'Ole hyvä' },
      { en: 'Thank you',  local: 'Kiitos' },
      { en: 'Bathroom',   local: 'Vessa' },
    ],
  },
};

function detectLang(lat, lng) {
  if (lat >= 59 && lat <= 71 && lng >= 19.5 && lng <= 32)  return 'fi'; // Finland
  if (lat >= 49 && lat <= 55 && lng >= 14   && lng <= 25)  return 'pl'; // Poland
  if (lat >= 50.5 && lat <= 54 && lng >= 3  && lng <= 7.5) return 'nl'; // Netherlands
  if (lat >= 57 && lat <= 72 && lng >= 4    && lng <= 32)  return 'no'; // Norway
  return null;
}

function speakWord(text, lang) {
  if (!('speechSynthesis' in window)) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

function loadVocab(lat, lng) {
  const widget = document.getElementById('vocab-widget');
  if (!widget) return;

  const code = detectLang(lat, lng);
  if (!code) return;

  const data = VOCAB_DATA[code];
  const canSpeak = 'speechSynthesis' in window;

  const rows = data.words.map(w => {
    const wordCell = canSpeak
      ? `<button type="button" class="vocab-btn" data-text="${w.local}" data-lang="${data.lang}">${w.local} <span class="vocab-speaker" aria-hidden="true">🔊</span></button>`
      : `<span class="vocab-local">${w.local}</span>`;
    return `<div class="vocab-row"><span class="vocab-en">${w.en}</span>${wordCell}</div>`;
  }).join('');

  widget.innerHTML =
    `<div class="section-label">Vocabulary — ${data.label}</div>` +
    `<div class="vocab-card">${rows}</div>`;
  widget.classList.remove('hidden');

  widget.querySelectorAll('.vocab-btn').forEach(btn => {
    btn.addEventListener('click', () => speakWord(btn.dataset.text, btn.dataset.lang));
  });
}

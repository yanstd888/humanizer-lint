import { createBrowserAnalyzer } from './analyzer-browser.mjs';

const text = document.querySelector('#text');
const analyze = document.querySelector('#analyze');
const error = document.querySelector('#error');
const result = document.querySelector('#result');
const score = document.querySelector('#score');
const status = document.querySelector('#status');
const language = document.querySelector('#language');
const findings = document.querySelector('#findings');

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function setError(message = '') {
  error.textContent = message;
  error.hidden = !message;
}

function renderFindings(violations) {
  findings.replaceChildren();
  if (!violations.length) {
    const item = document.createElement('li');
    item.textContent = 'Tidak ada pelanggaran yang ditemukan.';
    findings.append(item);
    return;
  }
  for (const violation of violations) {
    const item = document.createElement('li');
    const type = document.createElement('strong');
    type.textContent = violation.type;
    item.append(type, ` — ${violation.location}: ${violation.fixInstruction}`);
    findings.append(item);
  }
}

function render(resultData) {
  result.hidden = false;
  score.textContent = String(resultData.score);
  status.textContent = resultData.status;
  status.dataset.status = resultData.status.toLowerCase();
  language.textContent = resultData.language;
  renderFindings(resultData.violations);
}

const [idRules, enRules, defaultProfile] = await Promise.all([
  loadJson('./rules/id-slop.json'),
  loadJson('./rules/en-slop.json'),
  loadJson('./profiles/default-human.json'),
]);
const analyzer = createBrowserAnalyzer({ rules: { id: idRules, en: enRules }, defaultProfile });
analyze.disabled = false;
analyze.textContent = 'Analisis teks';

analyze.addEventListener('click', async () => {
  setError();
  const value = text.value.trim();
  if (!value) {
    setError('Masukkan teks sebelum menganalisis.');
    text.focus();
    return;
  }
  analyze.disabled = true;
  try {
    render(await analyzer.analyzeTextAsync(value, { language: 'auto' }));
  } catch (cause) {
    setError(cause.message || 'Analisis gagal dijalankan.');
  } finally {
    analyze.disabled = false;
  }
});

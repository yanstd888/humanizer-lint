import { createBrowserAnalyzer } from './analyzer-browser.mjs';
import { I18N } from './i18n.mjs';

const LANGUAGE_KEY = 'humanizer-lint.language';
const THEME_KEY = 'humanizer-lint.theme';
const text = document.querySelector('#text');
const analyze = document.querySelector('#analyze');
const error = document.querySelector('#error');
const result = document.querySelector('#result');
const score = document.querySelector('#score');
const status = document.querySelector('#status');
const language = document.querySelector('#language');
const findings = document.querySelector('#findings');
const description = document.querySelector('meta[name="description"]');
const themeToggle = document.querySelector('#theme-toggle');
const languageButtons = [...document.querySelectorAll('[data-language]')];
let currentLanguage = 'en';
let currentTheme = 'light';
let analyzer;
let lastResult;
let ready = false;

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ponytail: preference persistence is optional when browser storage is unavailable.
  }
}

function initialLanguage() {
  const saved = stored(LANGUAGE_KEY);
  if (saved === 'en' || saved === 'id') return saved;
  return navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en';
}

function initialTheme() {
  const saved = stored(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function copy() {
  return I18N[currentLanguage];
}

function setError(message = '') {
  error.textContent = message;
  error.hidden = !message;
}

function renderFindings(violations) {
  findings.replaceChildren();
  if (!violations.length) {
    const item = document.createElement('li');
    item.textContent = copy().noFindings;
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

function applyLanguage(nextLanguage, persist = false) {
  currentLanguage = nextLanguage;
  const strings = copy();
  document.documentElement.lang = currentLanguage;
  document.title = strings.pageTitle;
  description.content = strings.description;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = strings[element.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = strings[element.dataset.i18nPlaceholder];
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', strings[element.dataset.i18nAriaLabel]);
  });
  languageButtons.forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  analyze.textContent = ready ? strings.analyze : strings.loading;
  if (lastResult) render(lastResult);
  if (persist) save(LANGUAGE_KEY, currentLanguage);
  updateThemeButton();
}

function updateThemeButton() {
  themeToggle.setAttribute('aria-label', copy()[currentTheme === 'dark' ? 'themeToLight' : 'themeToDark']);
  themeToggle.setAttribute('title', themeToggle.getAttribute('aria-label'));
}

function applyTheme(nextTheme, persist = false) {
  currentTheme = nextTheme;
  document.documentElement.classList.toggle('theme-dark', currentTheme === 'dark');
  updateThemeButton();
  if (persist) save(THEME_KEY, currentTheme);
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

applyTheme(initialTheme());
applyLanguage(initialLanguage());

languageButtons.forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.language, true)));
themeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true));

try {
  const [idRules, enRules, defaultProfile] = await Promise.all([
    loadJson('./rules/id-slop.json'),
    loadJson('./rules/en-slop.json'),
    loadJson('./profiles/default-human.json'),
  ]);
  analyzer = createBrowserAnalyzer({ rules: { id: idRules, en: enRules }, defaultProfile });
  ready = true;
  analyze.disabled = false;
  analyze.textContent = copy().analyze;
} catch {
  setError(copy().analysisFailed);
}

analyze.addEventListener('click', async () => {
  setError();
  const value = text.value.trim();
  if (!value) {
    setError(copy().emptyText);
    text.focus();
    return;
  }
  analyze.disabled = true;
  try {
    lastResult = await analyzer.analyzeTextAsync(value, { language: 'auto' });
    render(lastResult);
  } catch {
    setError(copy().analysisFailed);
  } finally {
    analyze.disabled = false;
  }
});

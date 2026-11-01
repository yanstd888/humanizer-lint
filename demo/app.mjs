import { createBrowserAnalyzer } from './analyzer-browser.mjs';
import { I18N, UI_LANGUAGE_CODES, UI_LANGUAGE_NAMES } from './i18n.mjs';
import { buildAutoFixPrompt, diagnosticExcerpt, diagnosticSelection, languageLabel, parseDemoQuery, rhythmGateSkipped } from './presentation.mjs';
import { DEMO_SAMPLES } from './samples.mjs';

const LANGUAGE_KEY = 'humanizer-lint.language';
const THEME_KEY = 'humanizer-lint.theme';
const COMMANDS = {
  skill: 'npx skills add yanstd888/humanizer-lint',
  cli: 'npx humanizer-lint --file draft.md --lang auto',
};
const text = document.querySelector('#text');
const analyze = document.querySelector('#analyze');
const error = document.querySelector('#error');
const result = document.querySelector('#result');
const score = document.querySelector('#score');
const status = document.querySelector('#status');
const language = document.querySelector('#language');
const findings = document.querySelector('#findings');
const diagnostic = document.querySelector('#diagnostic');
const diagnosticText = document.querySelector('#diagnostic-text');
const themeToggle = document.querySelector('#theme-toggle');
const langPicker = document.querySelector('#lang-picker');
const langValue = document.querySelector('#lang-picker .picker-value');
const langOptions = [...document.querySelectorAll('#lang-picker .picker-option')];
const commandButtons = [...document.querySelectorAll('[data-command]')];
const analysisPicker = document.querySelector('#analysis-picker');
const analysisValue = document.querySelector('#analysis-value');
const analysisOptions = [...document.querySelectorAll('#analysis-picker .picker-option')];
let analysisLang = 'auto';
const sampleList = document.querySelector('#sample-list');
const installCommand = document.querySelector('#install-command');
const copyInstall = document.querySelector('#copy-install');
const copyAutoFix = document.querySelector('#copy-autofix');
const copyStatus = document.querySelector('#copy-status');
const samplePicker = document.querySelector('#sample-picker');
const sampleCurrent = document.querySelector('#sample-current');
const gateSection = document.querySelector('.delivery-gate');
const gateBlocks = [...document.querySelectorAll('.gate-block')];
const gateElements = {
  rhythmAndStylometry: document.querySelector('#gate-rhythm'),
  lexicalAndMorphology: document.querySelector('#gate-lexical'),
  domainHygiene: document.querySelector('#gate-domain'),
  finalVerdict: document.querySelector('#gate-verdict'),
};
const metricElements = {
  burstiness: document.querySelector('#metric-burstiness'),
  rhythm: document.querySelector('#metric-rhythm'),
  lexical: document.querySelector('#metric-lexical'),
  slop: document.querySelector('#metric-slop'),
};
document.documentElement.classList.add('js');
const queryState = parseDemoQuery(window.location.search);
let currentLanguage = 'en';
let currentTheme = 'light';
let currentCommand = 'skill';
let analyzer;
let defaultProfile;
let lastResult;
let lastText = '';
let lastSampleId = null;
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
  if (UI_LANGUAGE_CODES.includes(saved)) return saved;
  const browserCode = navigator.language?.toLowerCase().split('-')[0];
  return UI_LANGUAGE_CODES.includes(browserCode) ? browserCode : 'en';
}

function initialTheme() {
  const saved = stored(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function copy() {
  return I18N[currentLanguage];
}

function sampleLabel(id) {
  const [kind, code] = id.split('-');
  return `${copy()[kind === 'ai' ? 'sampleAi' : 'sampleHuman']} (${UI_LANGUAGE_NAMES[code]}) · ${kind === 'ai' ? 'FAIL' : 'PASS'}`;
}

function renderSampleButtons() {
  sampleList.replaceChildren();
  for (const code of UI_LANGUAGE_CODES) {
    for (const kind of ['ai', 'human']) {
      const id = `${kind}-${code}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.sample = id;
      button.dataset.status = kind === 'ai' ? 'fail' : 'pass';
      button.textContent = sampleLabel(id);
      button.addEventListener('click', () => loadSample(id));
      sampleList.append(button);
    }
  }
}

function setupReveal() {
  const groups = document.querySelectorAll('[data-reveal-stagger]');
  for (const group of groups) {
    [...group.children].forEach((child, index) => {
      child.setAttribute('data-reveal', '');
      child.style.setProperty('--reveal-delay', `${Math.min(index * 60, 420)}ms`);
    });
  }
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  targets.forEach((element) => observer.observe(element));
}

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function setAnalysisLanguage(value) {
  analysisLang = value;
  const selected = analysisOptions.find((option) => option.dataset.value === value);
  analysisOptions.forEach((option) => option.classList.toggle('is-selected', option === selected));
  if (selected) analysisValue.textContent = selected.textContent;
}

function getAnalysisLanguage() {
  return analysisLang;
}

function updateGateToggle(block) {
  const label = block.querySelector('[data-gate-toggle]');
  if (label) label.textContent = copy()[block.open ? 'showLess' : 'showMore'];
}

function renderScore(value, animate = false) {
  if (!animate || prefersReducedMotion.matches) {
    score.textContent = String(value);
    return;
  }
  const from = Number(score.textContent);
  const start = Number.isFinite(from) && from >= 0 && from !== value ? performance.now() : 0;
  const duration = 650;
  const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);
  const frame = (now) => {
    const progress = start ? Math.min(1, (now - start) / duration) : 1;
    score.textContent = String(Math.round(start ? from + (value - from) * easeOut(progress) : value));
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function setError(message = '') {
  error.textContent = message;
  error.hidden = !message;
}

function formatNumber(value, fractionDigits = 2) {
  return new Intl.NumberFormat(currentLanguage === 'zh' ? 'zh-CN' : `${currentLanguage}-${currentLanguage === 'en' ? 'US' : currentLanguage.toUpperCase()}`, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function formatPercent(value) {
  return new Intl.NumberFormat(currentLanguage === 'zh' ? 'zh-CN' : `${currentLanguage}-${currentLanguage === 'en' ? 'US' : currentLanguage.toUpperCase()}`, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value);
}

function setMetric(element, value, detail, healthy) {
  element.replaceChildren();
  const primary = document.createElement('strong');
  primary.textContent = value;
  const secondary = document.createElement('span');
  secondary.textContent = detail;
  element.dataset.status = healthy == null ? 'skipped' : healthy ? 'optimal' : 'low';
  element.append(primary, secondary);
}

function renderMetrics(report) {
  const { metrics } = report;
  const thresholds = defaultProfile.thresholds;
  const skipped = rhythmGateSkipped(report);
  const cvTarget = report.targets.cvMin;
  const cvHealthy = metrics.burstinessCV >= cvTarget;
  setMetric(
    metricElements.burstiness,
    formatNumber(metrics.burstinessCV),
    skipped ? `SKIP · < ${report.targets.minSentencesForStats}` : `${cvHealthy ? copy().metricOptimal : copy().metricLow} · ${copy().metricTarget} ≥ ${formatNumber(cvTarget)}`,
    skipped ? null : cvHealthy,
  );

  const rhythmHealthy = metrics.adjacentDelta >= report.targets.rhythmDeltaMin
    && (metrics.sentenceCount < 8 || (metrics.shortSentenceRatio >= thresholds.shortSentenceRatio && metrics.longSentenceRatio >= thresholds.longSentenceRatio));
  setMetric(
    metricElements.rhythm,
    `Δ ${formatNumber(metrics.adjacentDelta)}`,
    skipped ? `SKIP · < ${report.targets.minSentencesForStats}` : `${rhythmHealthy ? copy().metricOptimal : copy().metricLow} · ${copy().metricShort} ${formatPercent(metrics.shortSentenceRatio)} · ${copy().metricLong} ${formatPercent(metrics.longSentenceRatio)}`,
    skipped ? null : rhythmHealthy,
  );

  const mattrTarget = report.targets.mattrMin;
  const lexicalHealthy = metrics.mattr >= mattrTarget;
  setMetric(
    metricElements.lexical,
    formatNumber(metrics.mattr),
    `${lexicalHealthy ? copy().metricOptimal : copy().metricLow} · ${copy().metricTarget} ≥ ${formatNumber(mattrTarget)}`,
    lexicalHealthy,
  );

  const slopCount = report.violations.filter((violation) => violation.type === 'SLOP_PHRASE').length;
  const morphologyTypes = new Set(['SLOP_PHRASE', 'EXCESSIVE_NOMINALIZATION', 'PASSIVE_BLOATING', 'DEFINITIONAL_OPENING']);
  const slopHealthy = !report.violations.some((violation) => morphologyTypes.has(violation.type));
  setMetric(
    metricElements.slop,
    `${slopCount} ${copy().metricPhrases}`,
    `${copy().metricNominalization} ${formatPercent(metrics.nominalizationRatio)} · ${copy().metricPassive} ${formatPercent(metrics.passiveRatio)}`,
    slopHealthy,
  );
}

function showDiagnostic(violation) {
  const excerpt = diagnosticExcerpt(lastText, violation);
  diagnosticText.textContent = excerpt;
  diagnostic.hidden = !excerpt;
  const selection = diagnosticSelection(text.value, violation);
  if (selection) {
    text.focus();
    text.setSelectionRange(selection.start, selection.end);
  }
}

function renderFindings(violations) {
  findings.replaceChildren();
  diagnostic.hidden = true;
  if (!violations.length) {
    const item = document.createElement('li');
    item.textContent = copy().noFindings;
    findings.append(item);
    return;
  }

  for (const violation of violations) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const type = document.createElement('strong');
    type.textContent = violation.type;
    const location = document.createElement('span');
    location.textContent = ` · ${violation.location}`;
    const instruction = document.createElement('span');
    instruction.textContent = `: ${violation.fixInstruction}`;
    const replacement = document.createElement('span');
    replacement.textContent = violation.suggestedReplacement ? ` Replacement: ${violation.suggestedReplacement}.` : '';
    const split = document.createElement('span');
    split.textContent = violation.splitSuggestion ? ` ${violation.splitSuggestion}` : '';
    button.type = 'button';
    button.className = 'finding-button';
    button.append(type, location, instruction, replacement, split);
    button.addEventListener('click', () => showDiagnostic(violation));
    item.append(button);
    findings.append(item);
  }
}

function render(report, animate = false) {
  result.hidden = false;
  gateSection.hidden = false;
  renderScore(report.score, animate);
  status.textContent = report.status;
  status.dataset.status = report.status.toLowerCase();
  language.textContent = languageLabel(report.language);
  renderMetrics(report);
  for (const [name, element] of Object.entries(gateElements)) {
    const json = JSON.stringify(report.deliveryGate[name], null, 2);
    element.textContent = json;
    const statusHost = element.closest('.gate-block')?.querySelector('[data-gate-status]');
    if (statusHost) {
      let gateStatus = '';
      try { gateStatus = String(JSON.parse(json).status ?? ''); } catch { gateStatus = ''; }
      statusHost.textContent = gateStatus;
      statusHost.hidden = !gateStatus;
      statusHost.dataset.state = /^PASS|^\d+\//.test(gateStatus) ? 'pass' : /^SKIP/i.test(gateStatus) ? 'skip' : 'info';
    }
  }
  renderFindings(report.violations);
  copyAutoFix.hidden = !report.violations.length;
}

function updateCommand() {
  installCommand.textContent = COMMANDS[currentCommand];
  commandButtons.forEach((button) => {
    const active = button.dataset.command === currentCommand;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function updateThemeButton() {
  themeToggle.setAttribute('aria-label', copy()[currentTheme === 'dark' ? 'themeToLight' : 'themeToDark']);
  themeToggle.setAttribute('title', themeToggle.getAttribute('aria-label'));
}

function applyLanguage(nextLanguage, persist = false) {
  currentLanguage = nextLanguage;
  const strings = copy();
  document.documentElement.lang = currentLanguage;
  document.title = strings.pageTitle;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = strings[element.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = strings[element.dataset.i18nPlaceholder];
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', strings[element.dataset.i18nAriaLabel]);
  });
  document.querySelectorAll('[data-i18n-content]').forEach((element) => {
    element.setAttribute('content', strings[element.dataset.i18nContent]);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.setAttribute('title', strings[element.dataset.i18nTitle]);
  });
  langOptions.forEach((option) => {
    const selected = option.dataset.language === currentLanguage;
    option.classList.toggle('is-selected', selected);
    if (selected) langValue.textContent = option.textContent;
  });
  setAnalysisLanguage(analysisLang);
  analyze.textContent = ready ? strings.analyze : strings.loading;
  renderSampleButtons();
  if (lastSampleId && sampleCurrent) sampleCurrent.textContent = sampleLabel(lastSampleId);
  gateBlocks.forEach(updateGateToggle);
  updateThemeButton();
  updateCommand();
  if (lastResult) render(lastResult);
  if (persist) save(LANGUAGE_KEY, currentLanguage);
}

function applyTheme(nextTheme, persist = false) {
  currentTheme = nextTheme;
  document.documentElement.classList.toggle('theme-dark', currentTheme === 'dark');
  updateThemeButton();
  if (persist) save(THEME_KEY, currentTheme);
}

function replaceSampleQuery(sample) {
  const url = new URL(window.location.href);
  url.searchParams.set('sample', sample);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function replaceTargetLangQuery(targetLang) {
  const url = new URL(window.location.href);
  url.searchParams.set('targetLang', targetLang);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function removeLanguageQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('lang')) return;
  url.searchParams.delete('lang');
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

async function copyText(value, button) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const fallback = document.createElement('textarea');
      fallback.value = value;
      fallback.setAttribute('readonly', '');
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand('copy');
      fallback.remove();
      if (!copied) throw new Error('copy failed');
    }
    copyStatus.textContent = copy().copied;
    button.dataset.copied = 'true';
    const label = button.querySelector('[data-copy-label]');
    if (label) label.textContent = copy().copied;
    window.setTimeout(() => {
      copyStatus.textContent = '';
      delete button.dataset.copied;
      if (label) label.textContent = copy()[button.dataset.copyKey];
    }, 1800);
  } catch {
    setError(copy().copyUnavailable);
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function runAnalysis() {
  setError();
  const value = text.value.trim();
  if (!value) {
    setError(copy().emptyText);
    text.focus();
    return;
  }
  analyze.disabled = true;
  try {
    lastText = text.value;
    lastResult = await analyzer.analyzeTextAsync(lastText, { language: getAnalysisLanguage() });
    render(lastResult, true);
  } catch {
    setError(copy().analysisFailed);
  } finally {
    analyze.disabled = false;
  }
}

async function loadSample(sample, updateUrl = true) {
  const selected = DEMO_SAMPLES[sample];
  if (!selected) return;
  lastSampleId = sample;
  if (sampleCurrent) sampleCurrent.textContent = sampleLabel(sample);
  if (samplePicker) samplePicker.open = false;
  setAnalysisLanguage(selected.language);
  text.value = selected.text;
  if (updateUrl) {
    replaceSampleQuery(sample);
    replaceTargetLangQuery(selected.language);
  }
  await runAnalysis();
}

applyTheme(initialTheme());
applyLanguage(queryState.language ?? initialLanguage());
setupReveal();
gateBlocks.forEach((block) => {
  block.addEventListener('toggle', () => updateGateToggle(block));
  updateGateToggle(block);
});

langOptions.forEach((option) => option.addEventListener('click', () => {
  langPicker.open = false;
  applyLanguage(option.dataset.language, true);
  removeLanguageQuery();
}));
themeToggle.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true));
commandButtons.forEach((button) => button.addEventListener('click', () => {
  currentCommand = button.dataset.command;
  updateCommand();
}));

copyInstall.addEventListener('click', () => copyText(COMMANDS[currentCommand], copyInstall));
copyAutoFix.addEventListener('click', () => {
  if (lastResult) copyText(buildAutoFixPrompt({ text: lastText, report: lastResult }), copyAutoFix);
});
analyze.addEventListener('click', runAnalysis);
analysisOptions.forEach((option) => option.addEventListener('click', async () => {
  setAnalysisLanguage(option.dataset.value);
  analysisPicker.open = false;
  replaceTargetLangQuery(option.dataset.value);
  if (text.value.trim()) await runAnalysis();
}));

try {
  const [ruleEntries, profile] = await Promise.all([
    Promise.all(['id', 'en', 'es', 'ms', 'fr', 'de', 'pt', 'zh'].map(async (code) => [code, await loadJson(`./rules/${code}-slop.json`)])),
    loadJson('./profiles/default-human.json'),
  ]);
  defaultProfile = profile;
  analyzer = createBrowserAnalyzer({ rules: Object.fromEntries(ruleEntries), defaultProfile });
  ready = true;
  analyze.disabled = false;
  analyze.textContent = copy().analyze;
  setAnalysisLanguage(queryState.targetLang ?? DEMO_SAMPLES[queryState.sample]?.language ?? 'auto');
  if (queryState.sample) {
    lastSampleId = queryState.sample;
    if (sampleCurrent) sampleCurrent.textContent = sampleLabel(lastSampleId);
    text.value = DEMO_SAMPLES[queryState.sample].text;
    await runAnalysis();
  }
} catch {
  setError(copy().analysisFailed);
}

const mobileMenu = document.querySelector('.mobile-menu');
mobileMenu?.addEventListener('click', (event) => {
  if (event.target.closest('a')) mobileMenu.open = false;
});
const dismissiblePickers = [mobileMenu, samplePicker, langPicker, analysisPicker].filter(Boolean);
document.addEventListener('pointerdown', (event) => {
  for (const element of dismissiblePickers) {
    if (element.open && !element.contains(event.target)) element.open = false;
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const element of dismissiblePickers) {
    if (element.open) {
      element.open = false;
      element.querySelector('summary').focus();
    }
  }
});

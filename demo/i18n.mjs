import { SEO_FAQ } from './seo-copy.mjs';

const EN = {
  canonicalPosition: 'A local, zero-dependency prose linter that flags stiff, AI-sounding writing (stock phrases, flat sentence rhythm, repeated wording) and tells you what to revise. A style checker, not an AI detector.',
  pageTitle: 'Humanizer-Lint — Multilingual AI Text Humanizer',
  ogTitle: 'Humanizer-Lint — Local AI Prose Linter',
  ogDescription: 'Measure prose rhythm, vocabulary diversity, and configured AI clichés locally.',
  ogLocale: 'en_US', ogLocaleAlternate: 'id_ID',
  brandTagline: 'Closed-loop prose lint', eyebrow: 'Stylometric prose linter', heading: 'Audit and humanize stiff, AI-shaped prose before you ship.',
  intro: 'Audit text locally with the same deterministic analyzer used by the CLI.',
  installLabel: 'Install', installPrimary: 'Agent skill', installCli: 'CLI', copy: 'Copy', copied: 'Copied', copyUnavailable: 'Clipboard copy is unavailable.',
  securityAgentTrust: 'Agent Trust Hub: Pass', securitySocket: 'Socket: Pass', securitySnyk: 'Snyk: Pass', securityClient: '100% Client-Side', previewExample: 'Example',
  samplesLabel: 'Reference samples', sampleAi: 'AI sample', sampleHuman: 'Human sample', workspaceLabel: 'Analyzer', inputLabel: 'Text', analysisLanguage: 'Analysis language',
  analysisLanguageAuto: 'Auto-detect', analysisLanguageUniversal: 'Experimental rhythm (other languages)', placeholder: 'Paste text here. Nothing is sent to a server.',
  loading: 'Loading analyzer…', analyze: 'Analyze text', results: 'Results', score: 'Score', status: 'Status', language: 'Language', findings: 'Findings',
  deliveryGate: 'Delivery Gate', gateRhythm: 'Rhythm and stylometry', gateLexical: 'Lexical and morphology', gateDomain: 'Domain hygiene', gateVerdict: 'Final verdict',
  copyAutoFix: 'Copy AI revision prompt', selectedSentence: 'Selected diagnostic', noFindings: 'No violations found.', emptyText: 'Enter text before analyzing.', analysisFailed: 'Analysis could not run.', showMore: 'Show more', showLess: 'Show less',
  metricBurstiness: 'Burstiness (CV)', metricBurstinessHelp: 'Coefficient of variation across sentence lengths.', metricRhythm: 'Rhythm delta', metricRhythmHelp: 'Mean difference between adjacent sentence lengths.', metricLexical: 'Lexical diversity (MATTR)', metricLexicalHelp: 'Moving-average type-token ratio.', metricSlop: 'Slop and morphology', metricSlopHelp: 'Detected phrases and morphology ratios.', metricTarget: 'target', metricLow: 'LOW', metricOptimal: 'OPTIMAL', metricShort: 'short', metricLong: 'long', metricPhrases: 'phrases', metricNominalization: 'nominalization', metricPassive: 'passive',
  languageToggle: 'Interface language', themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme', howEyebrow: 'How it works', howTitle: 'A closed loop for prose quality',
  howIntro: 'Measure the completed draft before publishing it.', howLexicalTitle: '1. Lexical and copywriting rules', howLexicalText: 'Checks eight lexical packs and selected copy or CTA phrases.', howRhythmTitle: '2. Sentence and paragraph rhythm', howRhythmText: 'Measures CV and adjacent delta; rhythm gates require eight sentences.', howDiversityTitle: '3. Vocabulary and n-grams', howDiversityText: 'Uses adaptive MATTR, repeated n-grams, and Indonesian morphology.', howStructureTitle: '4. Domain hygiene', howStructureText: 'File-aware CLI checks include UI accessibility, fixed widths, and code comments; the playground accepts plain text.', howVerifyTitle: '5. Delivery Gate', howVerifyText: 'Review four diagnostic blocks and preserve meaning over scores.', cli: 'CLI', projectLinks: 'Project links',
};

EN.description = EN.canonicalPosition;
const locale = (overrides) => ({ ...EN, ...overrides });

export const I18N = {
  en: EN,
  id: locale({ pageTitle: 'Humanizer-Lint — Humanizer Teks AI Multibahasa', ogTitle: 'Humanizer-Lint — Linter Prosa AI Lokal', ogDescription: 'Ukur ritme prosa, keragaman kosakata, dan klise AI secara lokal.', ogLocale: 'id_ID', ogLocaleAlternate: 'en_US', brandTagline: 'Linter prosa siklus tertutup', eyebrow: 'Linter prosa stilometrik', heading: 'Perbaiki tulisan kaku ala AI dan uji ritme kalimat secara terukur.', intro: 'Audit teks secara lokal dengan analyzer deterministik yang sama seperti CLI.', installLabel: 'Pasang', installPrimary: 'Skill agen', copy: 'Salin', copied: 'Tersalin', copyUnavailable: 'Penyalinan clipboard tidak tersedia.', securityAgentTrust: 'Agent Trust Hub: Lulus', securitySocket: 'Socket: Lulus', securitySnyk: 'Snyk: Lulus', securityClient: '100% Sisi Klien', samplesLabel: 'Sampel referensi', sampleAi: 'Sampel AI', sampleHuman: 'Sampel manusia', workspaceLabel: 'Analyzer', inputLabel: 'Teks', analysisLanguage: 'Bahasa analisis', analysisLanguageAuto: 'Deteksi otomatis', analysisLanguageUniversal: 'Ritme eksperimental (bahasa lain)', placeholder: 'Tempel teks di sini. Tidak ada teks dikirim ke server.', loading: 'Memuat analyzer…', analyze: 'Analisis teks', results: 'Hasil', score: 'Skor', language: 'Bahasa', findings: 'Temuan', copyAutoFix: 'Salin prompt revisi AI', selectedSentence: 'Diagnostik terpilih', noFindings: 'Tidak ada pelanggaran.', emptyText: 'Masukkan teks sebelum menganalisis.', analysisFailed: 'Analisis tidak dapat berjalan.', metricBurstiness: 'Burstiness (CV)', metricRhythm: 'Delta ritme', metricLexical: 'Keragaman leksikal (MATTR)', metricSlop: 'Slop dan morfologi', metricTarget: 'target', metricLow: 'RENDAH', metricOptimal: 'OPTIMAL', metricShort: 'pendek', metricLong: 'panjang', metricPhrases: 'frasa', metricNominalization: 'nominalisasi', metricPassive: 'pasif', languageToggle: 'Bahasa antarmuka', themeToLight: 'Ganti ke tema terang', themeToDark: 'Ganti ke tema gelap', howEyebrow: 'Cara kerja', howTitle: 'Siklus tertutup untuk kualitas prosa', howIntro: 'Ukur naskah akhir sebelum diterbitkan.', howLexicalTitle: '1. Aturan leksikal dan copywriting', howLexicalText: 'Memeriksa delapan paket bahasa serta frasa copy dan CTA tertentu.', howRhythmTitle: '2. Ritme kalimat dan paragraf', howRhythmText: 'Mengukur CV dan delta ritme; gate ritme memerlukan delapan kalimat.', howDiversityTitle: '3. Kosakata dan n-gram', howDiversityText: 'Memakai MATTR adaptif, n-gram berulang, dan morfologi Indonesia.', howStructureTitle: '4. Kebersihan domain', howStructureText: 'CLI berbasis file memeriksa aksesibilitas UI, lebar tetap, dan komentar kode; playground menerima teks biasa.', howVerifyTitle: '5. Delivery Gate', howVerifyText: 'Tinjau empat blok diagnostik dan utamakan makna daripada skor.', projectLinks: 'Tautan proyek' }),
  es: locale({ pageTitle: 'Humanizer-Lint — Humanizador de texto IA multilingüe', description: 'Humanizador de texto IA local, corrector anti-frases hechas y medidor de burstiness para ocho paquetes léxicos y diagnósticos de ritmo experimentales para otros idiomas.', ogTitle: 'Humanizer-Lint — Corrector local de prosa IA', ogDescription: 'Mide ritmo, diversidad léxica y clichés de IA localmente.', ogLocale: 'es_ES', brandTagline: 'Revisión de prosa en ciclo cerrado', eyebrow: 'Corrector estilométrico', heading: 'Mide la variación antes de publicar.', intro: 'Audita texto localmente con el mismo analizador determinista de la CLI.', installLabel: 'Instalar', installPrimary: 'Habilidad de agente', copy: 'Copiar', copied: 'Copiado', samplesLabel: 'Muestras de referencia', sampleAi: 'Muestra IA', sampleHuman: 'Muestra humana', workspaceLabel: 'Analizador', inputLabel: 'Texto', analysisLanguage: 'Idioma de análisis', analysisLanguageAuto: 'Detección automática', analysisLanguageUniversal: 'Ritmo experimental (otros idiomas)', placeholder: 'Pega el texto aquí. No se envía nada al servidor.', loading: 'Cargando analizador…', analyze: 'Analizar texto', results: 'Resultados', score: 'Puntuación', language: 'Idioma', findings: 'Hallazgos', copyAutoFix: 'Copiar prompt de revisión IA', selectedSentence: 'Diagnóstico seleccionado', noFindings: 'No se encontraron infracciones.', emptyText: 'Introduce texto antes de analizar.', analysisFailed: 'No se pudo ejecutar el análisis.', languageToggle: 'Idioma de interfaz', themeToLight: 'Cambiar a tema claro', themeToDark: 'Cambiar a tema oscuro', howEyebrow: 'Cómo funciona', howTitle: 'Un ciclo cerrado para la prosa', projectLinks: 'Enlaces del proyecto' }),
  ms: locale({ pageTitle: 'Humanizer-Lint — Humanizer teks AI berbilang bahasa', description: 'Humanizer teks AI tempatan, linter anti-klise dan pemeriksa burstiness untuk lapan pek leksikal serta diagnostik ritma eksperimen untuk bahasa lain.', ogTitle: 'Humanizer-Lint — Linter prosa AI tempatan', ogDescription: 'Ukur ritma prosa, kepelbagaian kosa kata dan klise AI secara tempatan.', ogLocale: 'ms_MY', brandTagline: 'Lint prosa gelung tertutup', eyebrow: 'Linter stilometrik', heading: 'Perbaiki tulisan kaku ala AI dan uji ritme kalimat secara terukur.', intro: 'Audit teks secara tempatan dengan penganalisis deterministik yang sama seperti CLI.', installLabel: 'Pasang', installPrimary: 'Kemahiran ejen', copy: 'Salin', copied: 'Disalin', samplesLabel: 'Sampel rujukan', sampleAi: 'Sampel AI', sampleHuman: 'Sampel manusia', workspaceLabel: 'Penganalisis', inputLabel: 'Teks', analysisLanguage: 'Bahasa analisis', analysisLanguageAuto: 'Kesan automatik', analysisLanguageUniversal: 'Ritma eksperimen (bahasa lain)', placeholder: 'Tampal teks di sini. Tiada teks dihantar ke pelayan.', loading: 'Memuatkan penganalisis…', analyze: 'Analisis teks', results: 'Hasil', score: 'Skor', language: 'Bahasa', findings: 'Dapatan', copyAutoFix: 'Salin gesaan semakan AI', selectedSentence: 'Diagnostik dipilih', noFindings: 'Tiada pelanggaran ditemui.', emptyText: 'Masukkan teks sebelum menganalisis.', analysisFailed: 'Analisis tidak dapat dijalankan.', languageToggle: 'Bahasa antara muka', themeToLight: 'Tukar ke tema cerah', themeToDark: 'Tukar ke tema gelap', howEyebrow: 'Cara berfungsi', howTitle: 'Gelung tertutup untuk prosa', projectLinks: 'Pautan projek' }),
  fr: locale({ pageTitle: 'Humanizer-Lint — Humaniseur de texte IA multilingue', description: 'Humaniseur de texte IA local, linter anti-clichés et vérificateur de burstiness pour huit packs lexicaux et des diagnostics de rythme expérimentaux pour d’autres langues.', ogTitle: 'Humanizer-Lint — Linter local de prose IA', ogDescription: 'Mesurez localement le rythme, la diversité lexicale et les clichés IA.', ogLocale: 'fr_FR', brandTagline: 'Lint de prose en boucle fermée', eyebrow: 'Linter stylométrique', heading: 'Mesurez la variation avant de publier.', intro: 'Auditez le texte localement avec le même analyseur déterministe que la CLI.', installLabel: 'Installer', installPrimary: 'Compétence agent', copy: 'Copier', copied: 'Copié', samplesLabel: 'Exemples de référence', sampleAi: 'Exemple IA', sampleHuman: 'Exemple humain', workspaceLabel: 'Analyseur', inputLabel: 'Texte', analysisLanguage: 'Langue d’analyse', analysisLanguageAuto: 'Détection automatique', analysisLanguageUniversal: 'Rythme expérimental (autres langues)', placeholder: 'Collez le texte ici. Rien n’est envoyé au serveur.', loading: 'Chargement de l’analyseur…', analyze: 'Analyser le texte', results: 'Résultats', score: 'Score', language: 'Langue', findings: 'Constats', copyAutoFix: 'Copier le prompt de révision IA', selectedSentence: 'Diagnostic sélectionné', noFindings: 'Aucune violation trouvée.', emptyText: 'Saisissez du texte avant l’analyse.', analysisFailed: 'L’analyse n’a pas pu être exécutée.', languageToggle: 'Langue de l’interface', themeToLight: 'Passer au thème clair', themeToDark: 'Passer au thème sombre', howEyebrow: 'Fonctionnement', howTitle: 'Une boucle fermée pour la prose', projectLinks: 'Liens du projet' }),
  de: locale({ pageTitle: 'Humanizer-Lint — Mehrsprachiger KI-Texthumanizer', description: 'Lokaler KI-Texthumanizer, Anti-Floskel-Linter und Burstiness-Prüfer für acht lexikalische Pakete und experimentelle Rhythmusdiagnosen für weitere Sprachen.', ogTitle: 'Humanizer-Lint — Lokaler KI-Prosa-Linter', ogDescription: 'Messen Sie lokal Rhythmus, Wortvielfalt und KI-Floskeln.', ogLocale: 'de_DE', brandTagline: 'Prosa-Lint im geschlossenen Kreislauf', eyebrow: 'Stilometrischer Prosa-Linter', heading: 'Messen Sie Varianz vor der Veröffentlichung.', intro: 'Prüfen Sie Text lokal mit demselben deterministischen CLI-Analyzer.', installLabel: 'Installieren', installPrimary: 'Agent-Skill', copy: 'Kopieren', copied: 'Kopiert', samplesLabel: 'Referenzbeispiele', sampleAi: 'KI-Beispiel', sampleHuman: 'Menschliches Beispiel', workspaceLabel: 'Analyzer', inputLabel: 'Text', analysisLanguage: 'Analysesprache', analysisLanguageAuto: 'Automatisch erkennen', analysisLanguageUniversal: 'Experimenteller Rhythmus (weitere Sprachen)', placeholder: 'Text hier einfügen. Nichts wird an einen Server gesendet.', loading: 'Analyzer wird geladen…', analyze: 'Text analysieren', results: 'Ergebnisse', score: 'Punktzahl', language: 'Sprache', findings: 'Befunde', copyAutoFix: 'KI-Überarbeitungs-Prompt kopieren', selectedSentence: 'Ausgewählte Diagnose', noFindings: 'Keine Verstöße gefunden.', emptyText: 'Geben Sie vor der Analyse Text ein.', analysisFailed: 'Analyse konnte nicht ausgeführt werden.', languageToggle: 'Oberflächensprache', themeToLight: 'Zum hellen Design wechseln', themeToDark: 'Zum dunklen Design wechseln', howEyebrow: 'So funktioniert es', howTitle: 'Ein geschlossener Kreislauf für Prosa', projectLinks: 'Projektlinks' }),
  pt: locale({ pageTitle: 'Humanizer-Lint — Humanizador de texto IA multilíngue', description: 'Humanizador de texto IA local, linter anti-clichês e verificador de burstiness para oito pacotes lexicais e diagnósticos experimentais de ritmo para outros idiomas.', ogTitle: 'Humanizer-Lint — Linter local de prosa IA', ogDescription: 'Meça localmente ritmo, diversidade lexical e clichês de IA.', ogLocale: 'pt_BR', brandTagline: 'Lint de prosa em ciclo fechado', eyebrow: 'Linter estilométrico', heading: 'Meça a variação antes de publicar.', intro: 'Audite texto localmente com o mesmo analisador determinístico da CLI.', installLabel: 'Instalar', installPrimary: 'Skill de agente', copy: 'Copiar', copied: 'Copiado', samplesLabel: 'Amostras de referência', sampleAi: 'Amostra IA', sampleHuman: 'Amostra humana', workspaceLabel: 'Analisador', inputLabel: 'Texto', analysisLanguage: 'Idioma de análise', analysisLanguageAuto: 'Detecção automática', analysisLanguageUniversal: 'Ritmo experimental (outros idiomas)', placeholder: 'Cole o texto aqui. Nada é enviado ao servidor.', loading: 'Carregando analisador…', analyze: 'Analisar texto', results: 'Resultados', score: 'Pontuação', language: 'Idioma', findings: 'Achados', copyAutoFix: 'Copiar prompt de revisão IA', selectedSentence: 'Diagnóstico selecionado', noFindings: 'Nenhuma violação encontrada.', emptyText: 'Insira texto antes de analisar.', analysisFailed: 'A análise não pôde ser executada.', languageToggle: 'Idioma da interface', themeToLight: 'Mudar para tema claro', themeToDark: 'Mudar para tema escuro', howEyebrow: 'Como funciona', howTitle: 'Um ciclo fechado para a prosa', projectLinks: 'Links do projeto' }),
  zh: locale({ pageTitle: 'Humanizer-Lint — 多语言 AI 文本人性化工具', description: '本地 AI 文章人性化、去除 AI 味工具与句式节奏检查器，提供八种词汇规则包及其他语言的实验性节奏诊断。', ogTitle: 'Humanizer-Lint — 本地 AI 文本风格检查器', ogDescription: '在本地测量文章节奏、词汇多样性和 AI 套话。', ogLocale: 'zh_CN', brandTagline: '闭环文章检查', eyebrow: '文体计量检查器', heading: '发布前先测量文章变化。', intro: '使用与 CLI 相同的确定性分析器在本地审查文本。', installLabel: '安装', installPrimary: '智能体技能', copy: '复制', copied: '已复制', samplesLabel: '参考示例', sampleAi: 'AI 示例', sampleHuman: '人工示例', workspaceLabel: '分析器', inputLabel: '文本', analysisLanguage: '分析语言', analysisLanguageAuto: '自动识别', analysisLanguageUniversal: '实验性节奏分析（其他语言）', placeholder: '在此粘贴文本。不会发送到服务器。', loading: '正在加载分析器…', analyze: '分析文本', results: '结果', score: '分数', language: '语言', findings: '发现的问题', copyAutoFix: '复制 AI 修改提示词', selectedSentence: '已选诊断', noFindings: '未发现违规项。', emptyText: '分析前请输入文本。', analysisFailed: '无法运行分析。', languageToggle: '界面语言', themeToLight: '切换到浅色主题', themeToDark: '切换到深色主题', howEyebrow: '工作原理', howTitle: '文章质量闭环', projectLinks: '项目链接' }),
};

I18N.id.canonicalPosition = 'Linter prosa lokal tanpa dependency yang menandai tulisan kaku ala AI (frasa klise, ritme kalimat datar, kata berulang) dan menunjukkan bagian yang perlu direvisi. Pemeriksa gaya, bukan detektor AI.';
I18N.id.description = I18N.id.canonicalPosition;
const localizedPosition = {
  es: 'Un corrector de prosa local sin dependencias que señala frases hechas, ritmo monótono y repeticiones para revisar textos rígidos. Es un corrector de estilo, no un detector de IA.',
  ms: 'Linter prosa tempatan tanpa kebergantungan yang menandai frasa klise, ritma ayat mendatar dan pengulangan untuk disemak. Ini pemeriksa gaya, bukan pengesan AI.',
  fr: 'Un outil local sans dépendance qui signale les formules toutes faites, le rythme monotone et les répétitions à revoir. Il vérifie le style et ne détecte pas les textes écrits par une IA.',
  de: 'Ein lokaler Prosa-Linter ohne Abhängigkeiten markiert Floskeln, gleichförmigen Satzrhythmus und Wiederholungen zur Überarbeitung. Er prüft den Stil und erkennt keine KI-Urheberschaft.',
  pt: 'Um linter de prosa local sem dependências que aponta frases feitas, ritmo monótono e repetições para revisão. É um verificador de estilo, não um detector de IA.',
  zh: '本地零依赖文章检查器会标记套话、平淡的句式节奏和重复用词，提示需要修改的部分。它检查写作风格，不是 AI 检测器。',
};
for (const [language, text] of Object.entries(localizedPosition)) I18N[language].canonicalPosition = text;

for (const [language, entries] of Object.entries(SEO_FAQ)) {
  entries.forEach(([question, answer], index) => {
    I18N[language][`seoQuestion${index}`] = question;
    I18N[language][`seoAnswer${index}`] = answer;
  });
}

const navKeys = ['navAnalyzer', 'navMethod', 'navLanguages', 'navCommunity', 'footerNote'];
const navCopy = {
  en: ['Analyzer', 'Method', 'Languages', 'Community', 'Local, deterministic, and private. Analysis never leaves the browser.'],
  id: ['Analisis', 'Metode', 'Bahasa', 'Komunitas', 'Lokal, deterministik, dan privat. Analisis tidak keluar dari browser.'],
  es: ['Analizador', 'Método', 'Idiomas', 'Comunidad', 'Local, determinista y privado. El análisis no sale del navegador.'],
  ms: ['Penganalisis', 'Kaedah', 'Bahasa', 'Komuniti', 'Setempat, deterministik dan peribadi. Analisis tidak keluar dari pelayar.'],
  fr: ['Analyseur', 'Méthode', 'Langues', 'Communauté', 'Local, déterministe et privé. L’analyse reste dans le navigateur.'],
  de: ['Analyse', 'Methode', 'Sprachen', 'Gemeinschaft', 'Lokal, deterministisch und privat. Die Analyse verlässt den Browser nicht.'],
  pt: ['Analisador', 'Método', 'Idiomas', 'Comunidade', 'Local, determinístico e privado. A análise não sai do navegador.'],
  zh: ['分析器', '方法', '语言', '社区', '本地、确定性且私密。分析不会离开浏览器。'],
};
for (const [language, values] of Object.entries(navCopy)) navKeys.forEach((key, index) => { I18N[language][key] = values[index]; });

const useCaseKeys = ['useCaseWritingTitle', 'useCaseWritingText', 'useCaseAgentTitle', 'useCaseAgentText', 'useCaseVoiceTitle', 'useCaseVoiceText', 'coverageOtherTitle', 'coverageOtherPrefix', 'coverageOtherSuffix'];
const useCaseCopy = {
  en: ['Writing assistant skill', 'For copywriting, blog editing, SEO articles, technical documentation, formal prose, translation polishing, and proofreading workflows.', 'Agent workflow', 'Use with Claude Code, Cursor, Windsurf, Codex, and Gemini CLI. Remove repetitive stock phrases without a network text upload.', 'Author voice profiling', 'Build a local profile, revise only flagged passages, and re-run the deterministic validator.', 'Experimental · Other Languages', 'Experimental rhythm diagnostics via ', '; thresholds are uncalibrated.'],
  id: ['Skill asisten penulisan', 'Untuk copywriting, penyuntingan blog, artikel SEO, dokumentasi teknis, prosa formal, perapian terjemahan, dan pemeriksaan naskah.', 'Alur kerja agen', 'Gunakan dengan Claude Code, Cursor, Windsurf, Codex, dan Gemini CLI. Periksa frasa berulang tanpa mengunggah teks ke jaringan.', 'Profil gaya penulis', 'Buat profil lokal, revisi bagian yang ditandai, lalu jalankan kembali validator.', 'Eksperimental · Bahasa lain', 'Diagnostik ritme eksperimental melalui ', '; ambangnya belum dikalibrasi.'],
  es: ['Asistente de escritura', 'Para redacción, edición de blogs, artículos SEO, documentación técnica, prosa formal, traducciones y corrección.', 'Flujo de trabajo con agentes', 'Úsalo con Claude Code, Cursor, Windsurf, Codex y Gemini CLI. Revisa frases repetidas sin subir el texto a la red.', 'Perfil de voz del autor', 'Crea un perfil local, revisa solo los pasajes señalados y vuelve a ejecutar el validador.', 'Experimental · Otros idiomas', 'Diagnóstico experimental de ritmo mediante ', '; los umbrales no están calibrados.'],
  ms: ['Pembantu penulisan', 'Untuk penulisan iklan, suntingan blog, artikel SEO, dokumentasi teknikal, prosa formal, terjemahan dan penyemakan.', 'Aliran kerja ejen', 'Gunakan dengan Claude Code, Cursor, Windsurf, Codex dan Gemini CLI. Semak frasa berulang tanpa memuat naik teks ke rangkaian.', 'Profil gaya penulis', 'Bina profil tempatan, semak bahagian yang ditandai dan jalankan semula pengesah.', 'Eksperimen · Bahasa lain', 'Diagnostik ritma eksperimen melalui ', '; ambangnya belum ditentukur.'],
  fr: ['Assistant de rédaction', 'Pour la rédaction, les blogs, les articles SEO, la documentation technique, la prose formelle, les traductions et la relecture.', 'Flux de travail des agents', 'Utilisez Claude Code, Cursor, Windsurf, Codex ou Gemini CLI. Vérifiez les formules répétées sans envoyer le texte sur le réseau.', 'Profil de style de l’auteur', 'Créez un profil local, révisez les passages signalés et relancez la validation.', 'Expérimental · Autres langues', 'Diagnostic expérimental du rythme via ', ' ; les seuils ne sont pas calibrés.'],
  de: ['Schreibassistent', 'Für Werbetexte, Blogs, SEO-Artikel, technische Dokumentation, formale Prosa, Übersetzungen und Korrekturlesen.', 'Agenten-Workflow', 'Mit Claude Code, Cursor, Windsurf, Codex und Gemini CLI nutzen. Wiederholte Floskeln prüfen, ohne Text ins Netzwerk hochzuladen.', 'Profil des Schreibstils', 'Ein lokales Profil erstellen, markierte Stellen überarbeiten und die Prüfung erneut ausführen.', 'Experimentell · Weitere Sprachen', 'Experimentelle Rhythmusdiagnose mit ', '; die Schwellen sind nicht kalibriert.'],
  pt: ['Assistente de escrita', 'Para redação, blogs, artigos de SEO, documentação técnica, prosa formal, traduções e revisão.', 'Fluxo de trabalho com agentes', 'Use com Claude Code, Cursor, Windsurf, Codex e Gemini CLI. Revise frases repetidas sem enviar o texto pela rede.', 'Perfil de estilo do autor', 'Crie um perfil local, revise os trechos sinalizados e execute o validador novamente.', 'Experimental · Outros idiomas', 'Diagnóstico experimental de ritmo via ', '; os limiares não são calibrados.'],
  zh: ['写作助手技能', '适用于文案、博客、SEO 文章、技术文档、正式文章、翻译润色和校对。', '智能体工作流程', '可与 Claude Code、Cursor、Windsurf、Codex 和 Gemini CLI 配合使用，无需上传文本即可检查重复套话。', '作者风格画像', '创建本地风格配置，只修改标记的段落，然后重新运行检查。', '实验性 · 其他语言', '通过 ', ' 提供实验性节奏诊断；阈值尚未校准。'],
};
for (const [language, values] of Object.entries(useCaseCopy)) useCaseKeys.forEach((key, index) => { I18N[language][key] = values[index]; });

const coverageHeadings = {
  en: ['Multilingual coverage', 'Eight anti-cliché packs, plus universal rhythm diagnostics'],
  id: ['Cakupan multibahasa', 'Delapan paket anti-klise dan diagnostik ritme universal eksperimental'],
  es: ['Cobertura multilingüe', 'Ocho paquetes contra clichés y diagnóstico experimental de ritmo universal'],
  ms: ['Liputan berbilang bahasa', 'Lapan pek antiklise dan diagnostik ritma universal eksperimen'],
  fr: ['Couverture multilingue', 'Huit packs anti-clichés et diagnostics expérimentaux du rythme universel'],
  de: ['Mehrsprachige Abdeckung', 'Acht Anti-Floskel-Pakete und experimentelle universelle Rhythmusdiagnosen'],
  pt: ['Cobertura multilíngue', 'Oito pacotes anticlichês e diagnóstico experimental de ritmo universal'],
  zh: ['多语言覆盖', '八种反套话规则包与实验性通用节奏诊断'],
};
for (const [language, [eyebrow, title]] of Object.entries(coverageHeadings)) {
  I18N[language].seoCoverageEyebrow = eyebrow;
  I18N[language].seoCoverageTitle = title;
}

const coverageDetails = {
  en: 'Experimental rhythm diagnostics (uncalibrated thresholds). Humanizer-Lint is a prose linter, writing-style editor, stylometric analyzer, and deterministic local CLI validator. It reports sentence rhythm, paragraph rhythm, adjacent sentence delta, moving-average type-token ratio (MATTR), repeated n-grams, and compression ratio as diagnostics while retaining private local analysis.',
  id: 'Diagnostik ritme bersifat eksperimental dan ambangnya belum dikalibrasi. Analisis lokal melaporkan ritme kalimat dan paragraf, delta kalimat berdekatan, MATTR, n-gram berulang, serta rasio kompresi sebagai diagnostik.',
  es: 'Los diagnósticos de ritmo son experimentales y sus umbrales no están calibrados. El análisis local informa del ritmo de frases y párrafos, delta adyacente, MATTR, n-gramas repetidos y relación de compresión.',
  ms: 'Diagnostik ritma bersifat eksperimen dan ambangnya belum ditentukur. Analisis tempatan melaporkan ritma ayat dan perenggan, delta bersebelahan, MATTR, n-gram berulang dan nisbah pemampatan sebagai diagnostik.',
  fr: 'Les diagnostics de rythme sont expérimentaux et leurs seuils ne sont pas calibrés. L’analyse locale indique le rythme des phrases et paragraphes, le delta adjacent, le MATTR, les n-grammes répétés et le taux de compression.',
  de: 'Die Rhythmusdiagnosen sind experimentell und ihre Schwellen nicht kalibriert. Die lokale Analyse zeigt Satz- und Absatzrhythmus, benachbarte Differenzen, MATTR, wiederholte N-Gramme und das Kompressionsverhältnis.',
  pt: 'Os diagnósticos de ritmo são experimentais e seus limiares não são calibrados. A análise local informa ritmo de frases e parágrafos, delta adjacente, MATTR, n-gramas repetidos e taxa de compressão.',
  zh: '节奏诊断属于实验性功能，阈值尚未校准。本地分析提供句子与段落节奏、相邻句长差、MATTR、重复 n 元短语和压缩比等诊断信息。',
};
for (const [language, text] of Object.entries(coverageDetails)) I18N[language].seoDetails = text;

const coverageCopy = {
  en: 'A local AI humanizer and prose linter for revising robotic writing, repeated stock phrases, flat sentence rhythm, Markdown, copywriting and calls to action. It checks style, not authorship.',
  id: 'Humanizer bahasa Indonesia untuk perbaiki tulisan AI yang kaku dan hilangkan kata klise AI. Editor gaya bahasa dan ritme kalimat ini membantu ubah tulisan AI jadi natural serta audit artikel SEO dan dokumentasi teknis. Alat ini memeriksa gaya, bukan kepengarangan.',
  es: 'Humanizador de texto IA, editor de estilo y corrector de ritmo para revisar textos y quitar clichés de escritura IA. Analiza el estilo, no la autoría.',
  ms: 'Humanizer teks bahasa Melayu untuk semak ritma ayat dan frasa klise serta perbaiki gaya penulisan AI yang kaku. Alat ini memeriksa gaya, bukan kepengarangan.',
  fr: 'Humaniseur de texte IA, éditeur de prose et analyseur stylométrique pour corriger le style robotique et repérer les clichés. Il vérifie le style, pas la paternité.',
  de: 'KI-Text humanisieren, KI-Floskeln entfernen und Satzrhythmus und Stil prüfen: Dieser lokale Linter untersucht den Schreibstil, nicht die Urheberschaft.',
  pt: 'Humanizador de texto IA, editor de estilo e corretor de ritmo textual para revisar a escrita e remover clichês de IA. Analisa o estilo, não a autoria.',
  zh: '本地 AI文章润色与人性化工具，帮助消除AI写作腔，通过句式节奏与词汇多样性分析提升文章可读性。工具检查写作风格，不判断作者。',
};
for (const [language, text] of Object.entries(coverageCopy)) I18N[language].seoCoverage = text;

const securityAuditSnapshotCopy = {
  en: 'Audit snapshot: 2026-11-02. Socket commit: 9517b10. Not evidence for unpublished changes.',
  id: 'Snapshot audit: 2026-11-02. Commit Socket: 9517b10. Bukan bukti untuk perubahan yang belum dipublikasikan.',
  es: 'Auditorías al 2026-11-02. Commit de Socket: 9517b10. No acreditan cambios sin publicar.',
  ms: 'Rekod audit: 2026-11-02. Commit Socket: 9517b10. Bukan bukti untuk perubahan yang belum diterbitkan.',
  fr: 'Audits au 2026-11-02. Commit Socket : 9517b10. Ne prouvent pas la sécurité des changements non publiés.',
  de: 'Auditstand: 2026-11-02. Socket-Commit: 9517b10. Kein Nachweis für unveröffentlichte Änderungen.',
  pt: 'Auditorias em 2026-11-02. Commit do Socket: 9517b10. Não comprovam alterações não publicadas.',
  zh: '审计记录：2026-11-02。Socket 提交：9517b10。不能证明未发布更改的安全性。',
};
for (const [language, value] of Object.entries(securityAuditSnapshotCopy)) I18N[language].securityAuditSnapshot = value;

const storageReadUnavailableCopy = {
  en: 'Saved browser preferences could not be read.',
  id: 'Preferensi browser yang tersimpan tidak dapat dibaca.',
  es: 'No se pudieron leer las preferencias guardadas del navegador.',
  ms: 'Keutamaan pelayar yang disimpan tidak dapat dibaca.',
  fr: 'Impossible de lire les préférences enregistrées du navigateur.',
  de: 'Gespeicherte Browsereinstellungen konnten nicht gelesen werden.',
  pt: 'Não foi possível ler as preferências salvas do navegador.',
  zh: '无法读取已保存的浏览器偏好设置。',
};
for (const [language, value] of Object.entries(storageReadUnavailableCopy)) I18N[language].storageReadUnavailable = value;

const storageUnavailableCopy = {
  en: 'Browser storage is unavailable; preferences will not be saved.',
  id: 'Penyimpanan browser tidak tersedia; preferensi tidak akan disimpan.',
  es: 'El almacenamiento del navegador no está disponible; no se guardarán las preferencias.',
  ms: 'Storan pelayar tidak tersedia; keutamaan tidak akan disimpan.',
  fr: 'Le stockage du navigateur est indisponible ; les préférences ne seront pas enregistrées.',
  de: 'Der Browserspeicher ist nicht verfügbar; Einstellungen werden nicht gespeichert.',
  pt: 'O armazenamento do navegador não está disponível; as preferências não serão salvas.',
  zh: '浏览器存储不可用，偏好设置不会保存。',
};
for (const [language, value] of Object.entries(storageUnavailableCopy)) I18N[language].storageUnavailable = value;

const rulesUnavailableCopy = {
  en: 'Some rule packs are unavailable; experimental universal mode is selected.',
  id: 'Sebagian paket aturan tidak tersedia; mode universal eksperimental dipilih.',
  es: 'Algunos paquetes no están disponibles; se seleccionó el modo universal experimental.',
  ms: 'Sesetengah pek peraturan tidak tersedia; mod universal eksperimen dipilih.',
  fr: 'Certains packs sont indisponibles ; le mode universel expérimental est sélectionné.',
  de: 'Einige Regelpakete sind nicht verfügbar; der experimentelle Universalmodus ist ausgewählt.',
  pt: 'Alguns pacotes estão indisponíveis; o modo universal experimental foi selecionado.',
  zh: '部分规则包不可用；已选择实验性通用模式。',
};
for (const [language, text] of Object.entries(rulesUnavailableCopy)) I18N[language].rulesUnavailable = text;

const methodKeys = ['howLexicalTitle', 'howLexicalText', 'howRhythmTitle', 'howRhythmText', 'howDiversityTitle', 'howDiversityText', 'howStructureTitle', 'howStructureText', 'howVerifyTitle', 'howVerifyText'];
const methodCopy = {
  id: ['1. Aturan leksikal dan copywriting','Memeriksa delapan paket bahasa serta frasa copy dan CTA tertentu.','2. Ritme kalimat dan paragraf','Mengukur CV dan delta ritme; gate ritme memerlukan delapan kalimat.','3. Kosakata dan n-gram','Memakai MATTR adaptif, n-gram berulang, dan morfologi Indonesia.','4. Kebersihan domain','CLI berbasis file memeriksa aksesibilitas UI, lebar tetap, dan komentar kode; playground menerima teks biasa.','5. Verifikasi Delivery Gate','Tinjau empat blok diagnostik dan utamakan makna daripada skor.'],
  es: ['1. Reglas léxicas y de redacción','Revisa ocho paquetes léxicos y frases seleccionadas de redacción y llamadas a la acción.','2. Ritmo de frases y párrafos','Mide CV y delta adyacente; la evaluación rítmica requiere ocho frases.','3. Vocabulario y n-gramas','Utiliza MATTR adaptativo, n-gramas repetidos y morfología indonesia.','4. Higiene de dominio','La CLI analiza accesibilidad, anchuras fijas y comentarios en archivos; el simulador recibe texto plano.','5. Verificación de entrega','Revisa cuatro bloques de diagnóstico y prioriza el significado sobre la puntuación.'],
  ms: ['1. Peraturan leksikal dan penulisan','Semak lapan pek leksikal serta frasa salinan dan seruan tindakan terpilih.','2. Ritma ayat dan perenggan','Ukur CV dan delta bersebelahan; penilaian ritma memerlukan lapan ayat.','3. Kosa kata dan n-gram','Gunakan MATTR adaptif, n-gram berulang dan morfologi Indonesia.','4. Kebersihan domain','CLI memeriksa aksesibiliti UI, lebar tetap dan komen kod dalam fail; ruang uji menerima teks biasa.','5. Pengesahan penghantaran','Semak empat blok diagnostik dan utamakan makna daripada skor.'],
  fr: ['1. Règles lexicales et rédactionnelles','Vérifie huit packs lexicaux et certaines formules de rédaction et appels à l’action.','2. Rythme des phrases et paragraphes','Mesure le CV et le delta adjacent ; le contrôle rythmique exige huit phrases.','3. Vocabulaire et n-grammes','Utilise le MATTR adaptatif, les n-grammes répétés et la morphologie indonésienne.','4. Hygiène du domaine','La CLI vérifie l’accessibilité, les largeurs fixes et les commentaires de code ; le simulateur accepte du texte brut.','5. Vérification de livraison','Examine quatre blocs de diagnostic et privilégie le sens au score.'],
  de: ['1. Lexikalische Regeln und Werbetexte','Prüft acht Wortschatzpakete sowie ausgewählte Text- und Handlungsaufforderungen.','2. Satz- und Absatzrhythmus','Misst CV und benachbarte Differenzen; die Rhythmusprüfung benötigt acht Sätze.','3. Wortschatz und N-Gramme','Nutzt adaptives MATTR, wiederholte N-Gramme und indonesische Morphologie.','4. Bereichsprüfung','Die CLI prüft Barrierefreiheit, feste Breiten und Codekommentare in Dateien; der Playground akzeptiert reinen Text.','5. Abschlussprüfung','Prüfe vier Diagnoseblöcke und stelle die Bedeutung über die Punktzahl.'],
  pt: ['1. Regras lexicais e de redação','Verifica oito pacotes lexicais e algumas frases de texto e chamadas para ação.','2. Ritmo de frases e parágrafos','Mede CV e delta adjacente; a avaliação de ritmo exige oito frases.','3. Vocabulário e n-gramas','Usa MATTR adaptativo, n-gramas repetidos e morfologia indonésia.','4. Higiene de domínio','A CLI verifica acessibilidade, larguras fixas e comentários de código em arquivos; o playground aceita texto simples.','5. Verificação de entrega','Revise quatro blocos de diagnóstico e priorize o significado sobre a pontuação.'],
  zh: ['1. 词汇与文案规则','检查八种词汇规则包及部分文案和行动号召短语。','2. 句子与段落节奏','测量 CV 和相邻差值；节奏评估至少需要八句话。','3. 词汇与 n 元短语','使用自适应 MATTR、重复 n 元短语和印尼语形态分析。','4. 领域检查','CLI 检查文件中的界面无障碍、固定宽度和代码注释；演示区只接受纯文本。','5. 交付检查','查看四个诊断区块，优先保持原意而不是追求分数。'],
};
for (const [language, values] of Object.entries(methodCopy)) {
  methodKeys.forEach((key, index) => { I18N[language][key] = values[index]; });
}

const resultKeys = ['gateRhythm', 'gateLexical', 'gateDomain', 'gateVerdict', 'metricRhythmHelp', 'metricLexicalHelp'];
const resultCopy = {
  id: ['Ritme dan stilometri', 'Leksikal dan morfologi', 'Kebersihan domain', 'Putusan akhir', 'Rata-rata perbedaan panjang kalimat bersebelahan.', 'Rasio tipe-token rata-rata bergerak.'],
  es: ['Ritmo y estilometría', 'Léxico y morfología', 'Higiene de dominio', 'Resultado final', 'Diferencia media entre longitudes de frases consecutivas.', 'Relación tipo-token de promedio móvil.'],
  ms: ['Ritma dan stilometri', 'Leksikal dan morfologi', 'Kebersihan domain', 'Keputusan akhir', 'Purata perbezaan panjang ayat bersebelahan.', 'Nisbah jenis-token purata bergerak.'],
  fr: ['Rythme et stylométrie', 'Lexique et morphologie', 'Hygiène du domaine', 'Verdict final', 'Différence moyenne entre les longueurs de phrases adjacentes.', 'Rapport types-occurrences en moyenne mobile.'],
  de: ['Rhythmus und Stilometrie', 'Lexik und Morphologie', 'Bereichsprüfung', 'Gesamtergebnis', 'Mittlere Längendifferenz benachbarter Sätze.', 'Gleitender Mittelwert des Typ-Token-Verhältnisses.'],
  pt: ['Ritmo e estilometria', 'Léxico e morfologia', 'Higiene de domínio', 'Resultado final', 'Diferença média entre comprimentos de frases adjacentes.', 'Razão tipo-token em média móvel.'],
  zh: ['节奏与文体计量', '词汇与形态', '领域检查', '最终结果', '相邻句子长度差的平均值。', '移动平均词类与词次比。'],
};
for (const [language, values] of Object.entries(resultCopy)) {
  resultKeys.forEach((key, index) => { I18N[language][key] = values[index]; });
}

const metricCopy = {  es: { metricLow: 'BAJO', metricShort: 'cortas', metricLong: 'largas', metricPhrases: 'frases', metricTarget: 'objetivo', metricNominalization: 'nominalización', metricPassive: 'voz pasiva' },
  ms: { metricLow: 'RENDAH', metricShort: 'pendek', metricLong: 'panjang', metricPhrases: 'frasa', metricTarget: 'sasaran', metricNominalization: 'nominalisasi', metricPassive: 'pasif' },
  fr: { metricLow: 'FAIBLE', metricShort: 'courtes', metricLong: 'longues', metricPhrases: 'expressions', metricTarget: 'cible', metricNominalization: 'nominalisation', metricPassive: 'voix passive' },
  de: { metricLow: 'NIEDRIG', metricShort: 'kurz', metricLong: 'lang', metricPhrases: 'Phrasen', metricTarget: 'Ziel', metricNominalization: 'Nominalisierung', metricPassive: 'Passiv' },
  pt: { metricLow: 'BAIXO', metricShort: 'curtas', metricLong: 'longas', metricPhrases: 'frases', metricTarget: 'meta', metricNominalization: 'nominalização', metricPassive: 'voz passiva' },
  zh: { metricLow: '偏低', metricShort: '短句', metricLong: '长句', metricPhrases: '短语', metricTarget: '目标', metricNominalization: '名词化', metricPassive: '被动语态' },
};
for (const [language, values] of Object.entries(metricCopy)) Object.assign(I18N[language], values);

const gateToggleCopy = {
  id: ['Tampilkan lagi', 'Tampilkan lebih sedikit'],
  es: ['Ver más', 'Ver menos'],
  ms: ['Tunjukkan lebih banyak', 'Tunjukkan lebih sedikit'],
  fr: ['Afficher plus', 'Afficher moins'],
  de: ['Mehr anzeigen', 'Weniger anzeigen'],
  pt: ['Mostrar mais', 'Mostrar menos'],
  zh: ['展开', '收起'],
};
for (const [language, [more, less]] of Object.entries(gateToggleCopy)) {
  I18N[language].showMore = more;
  I18N[language].showLess = less;
}

const previewExampleCopy = { id: 'Contoh', es: 'Ejemplo', ms: 'Contoh', fr: 'Exemple', de: 'Beispiel', pt: 'Exemplo', zh: '示例' };
for (const [language, value] of Object.entries(previewExampleCopy)) {
  I18N[language].previewExample = value;
}

export const UI_LANGUAGE_CODES = Object.freeze(['en', 'id', 'es', 'ms', 'fr', 'de', 'pt', 'zh']);
export const UI_LANGUAGE_NAMES = Object.freeze({ en: 'English', id: 'Indonesia', es: 'Español', ms: 'Melayu', fr: 'Français', de: 'Deutsch', pt: 'Português', zh: '中文' });

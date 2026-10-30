const ABBREVIATIONS = {
  id: ['dll.', 'dsb.', 'dst.', 'dkk.', 'hlm.', 'no.', 'dr.', 'prof.', 'ir.', 'hj.', 'pt.', 'cv.', 'tbk.', 'rp.', 'tgl.', 's.d.', 'a.n.', 'u.p.'],
  en: ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'vs.', 'etc.', 'e.g.', 'i.e.', 'fig.', 'inc.', 'ltd.', 'co.', 'st.'],
};

const DOT = '\uE000';
const DECIMAL = '\uE001';
const ELLIPSIS = '\uE002';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectAbbreviations(text, language) {
  const items = language === 'auto'
    ? [...new Set([...ABBREVIATIONS.id, ...ABBREVIATIONS.en])]
    : ABBREVIATIONS[language] ?? ABBREVIATIONS.en;
  let protectedText = text
    .replace(/\.{2,}/g, ELLIPSIS)
    .replace(/(\d)\.(\d)/g, `$1${DECIMAL}$2`);
  for (const abbreviation of items.sort((a, b) => b.length - a.length)) {
    protectedText = protectedText.replace(
      new RegExp(`\\b${escapeRegExp(abbreviation)}`, 'gi'),
      (match) => match.replaceAll('.', DOT),
    );
  }
  return protectedText;
}

export function tokenizeWords(text) {
  const normalized = String(text ?? '').replace(/—|--/g, ' ');
  return (normalized.toLowerCase().match(/token_entity|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?(?:-[\p{L}\p{N}]+)*/gu) ?? []);
}

export function tokenizeText(input, language = 'auto') {
  const paragraphs = [];
  const sentences = [];
  const rawParagraphs = String(input ?? '').replace(/\r\n?/g, '\n').split(/\n\s*\n+/).map((value) => value.trim()).filter(Boolean);

  for (const [paragraphOffset, rawParagraph] of rawParagraphs.entries()) {
    const protectedText = protectAbbreviations(rawParagraph.replace(/\s+/g, ' '), language);
    const markedText = protectedText.replace(/([.!?](?:["')\]”’]+)?)\s+/gu, '$1\n');
    const parts = markedText.split('\n').map((value) => value
      .replaceAll(DOT, '.')
      .replaceAll(DECIMAL, '.')
      .replaceAll(ELLIPSIS, '...')
      .trim()).filter(Boolean);
    const paragraphSentences = [];

    for (const text of parts) {
      const words = tokenizeWords(text);
      if (!words.length) continue;
      const sentence = {
        text,
        words,
        wordCount: words.length,
        paragraphIndex: paragraphOffset + 1,
        sentenceIndex: sentences.length + 1,
        sentenceInParagraph: paragraphSentences.length + 1,
      };
      paragraphSentences.push(sentence);
      sentences.push(sentence);
    }

    if (paragraphSentences.length) {
      paragraphs.push({
        text: rawParagraph,
        paragraphIndex: paragraphOffset + 1,
        sentences: paragraphSentences,
        words: paragraphSentences.flatMap((sentence) => sentence.words),
      });
    }
  }

  return {
    paragraphs,
    sentences,
    words: sentences.flatMap((sentence) => sentence.words),
  };
}

export { ABBREVIATIONS };

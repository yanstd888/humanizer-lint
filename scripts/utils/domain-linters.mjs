const finding = (type, match, fixInstruction, start, location = 'Whole input') => ({
  type,
  ruleId: type,
  location,
  match,
  charOffset: { start, end: start + match.length },
  fixInstruction,
});

function regexFindings(text, definitions) {
  const source = String(text ?? '');
  return definitions.flatMap(({ type, pattern, fixInstruction }) => [...source.matchAll(pattern)].map((match) => (
    finding(type, match[0], fixInstruction, match.index)
  )));
}

export function lintCopywriting(text) {
  return regexFindings(text, [
    {
      type: 'WEAK_CTA',
      pattern: /\b(?:click here|learn more|klik di sini|pelajari lebih lanjut)\b/giu,
      fixInstruction: 'Replace the generic CTA with a specific action and outcome.',
    },
    {
      type: 'HYPERBOLIC_CLAIM',
      pattern: /\b(?:supercharge your workflow|solusi terlengkap dan terbaik)\b/giu,
      fixInstruction: 'Replace the superlative claim with a concrete capability or supported result.',
    },
  ]);
}

export function lintCodeComments(text) {
  return regexFindings(text, [
    {
      type: 'TAUTOLOGICAL_CODE_COMMENT',
      pattern: /^[\t ]*\/\/[\t ]*(?:import dependencies|function to\b[^\r\n]*)$/gimu,
      fixInstruction: 'Delete the comment or explain a non-obvious constraint instead.',
    },
    {
      type: 'DECORATIVE_COMMENT_BANNER',
      pattern: /^[\t ]*\/\/[\t ]*=+[\t ]*[^=\r\n]+[\t ]*=+[\t ]*$/gmu,
      fixInstruction: 'Use a normal section comment only when the grouping adds navigation value.',
    },
    {
      type: 'LAZY_AI_PLACEHOLDER',
      pattern: /^[\t ]*\/\/[\t ]*(?:\.\.\.[\t ]*)?rest of code\b[^\r\n]*$/gimu,
      fixInstruction: 'Replace the placeholder with complete code or remove it.',
    },
  ]);
}

function markupExtension(sourcePath) {
  return /\.(?:html?|jsx|tsx|vue|astro)$/iu.test(String(sourcePath ?? ''));
}

export function lintUiAndAccessibility(text, sourcePath = '') {
  if (sourcePath && !markupExtension(sourcePath)) return [];
  const source = String(text ?? '');
  const findings = [];

  for (const match of source.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/giu)) {
    const [, tag, attributes, body] = match;
    const visibleText = body.replace(/<[^>]+>/gu, '').trim();
    if (!visibleText && !/\b(?:aria-label|aria-labelledby|title)\s*=/iu.test(attributes)) {
      findings.push(finding('MISSING_ACCESSIBLE_NAME', match[0], `Add visible text or an accessible name to this ${tag}.`, match.index));
    }
  }

  for (const match of source.matchAll(/<img\b([^>]*)>/giu)) {
    if (!/\balt\s*=/iu.test(match[1])) findings.push(finding('MISSING_IMG_ALT', match[0], 'Add meaningful alt text, or alt="" for a decorative image.', match.index));
  }

  const headings = [...source.matchAll(/<h([1-6])\b/giu)];
  for (let index = 1; index < headings.length; index += 1) {
    if (Number(headings[index][1]) > Number(headings[index - 1][1]) + 1) {
      findings.push(finding('HEADING_ORDER_SKIP', headings[index][0], 'Use the next heading level unless the document outline requires a separate region.', headings[index].index));
      break;
    }
  }

  const gradient = /(?:bg-)?gradient-(?:to|from|via)|linear-gradient\s*\(/iu.exec(source);
  if (gradient) {
    findings.push(finding('AI_GRADIENT_CLICHE', gradient[0], 'Use a restrained solid color or a gradient tied to the product visual system.', gradient.index));
  }
  const fixedWidth = /(?:width\s*:\s*|\bw-\[)(?:[6-9]\d{2}|\d{4,})px/iu.exec(source);
  if (fixedWidth) {
    findings.push(finding('NON_RESPONSIVE_FIXED_WIDTH', fixedWidth[0], 'Use max-width and fluid sizing so the layout fits narrow viewports.', fixedWidth.index));
  }

  return findings;
}

export function lintDomainHygiene(text, sourcePath = '', domain = 'auto') {
  if (domain === 'prose') return [];
  if (domain === 'copywriting') return lintCopywriting(text);
  if (domain === 'code') return lintCodeComments(text);
  if (domain === 'ui') return lintUiAndAccessibility(text);
  if (domain !== 'auto') throw new RangeError(`Unknown domain: ${domain}`);
  if (!sourcePath) return [];
  const code = /\.(?:[cm]?[jt]sx?|vue|astro|css|scss|py|go|rs|java|c|h|cpp|cs)$/iu.test(sourcePath);
  return [
    ...(!code ? lintCopywriting(text) : []),
    ...(code ? lintCodeComments(text) : []),
    ...(markupExtension(sourcePath) ? lintUiAndAccessibility(text, sourcePath) : []),
  ];
}

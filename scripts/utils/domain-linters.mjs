const finding = (type, match, fixInstruction, location = 'Whole input') => ({
  type,
  location,
  match,
  fixInstruction,
});

function regexFindings(text, definitions) {
  const source = String(text ?? '');
  return definitions.flatMap(({ type, pattern, fixInstruction }) => [...source.matchAll(pattern)].map((match) => (
    finding(type, match[0], fixInstruction)
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
      pattern: /^\s*\/\/\s*(?:import dependencies|function to\b.*)$/gimu,
      fixInstruction: 'Delete the comment or explain a non-obvious constraint instead.',
    },
    {
      type: 'DECORATIVE_COMMENT_BANNER',
      pattern: /^\s*\/\/\s*=+\s*[^=\n]+\s*=+\s*$/gmu,
      fixInstruction: 'Use a normal section comment only when the grouping adds navigation value.',
    },
    {
      type: 'LAZY_AI_PLACEHOLDER',
      pattern: /^\s*\/\/\s*(?:\.\.\.\s*)?rest of code\b.*$/gimu,
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
      findings.push(finding('MISSING_ACCESSIBLE_NAME', match[0], `Add visible text or an accessible name to this ${tag}.`));
    }
  }

  for (const match of source.matchAll(/<img\b([^>]*)>/giu)) {
    if (!/\balt\s*=/iu.test(match[1])) findings.push(finding('MISSING_IMG_ALT', match[0], 'Add meaningful alt text, or alt="" for a decorative image.'));
  }

  const headings = [...source.matchAll(/<h([1-6])\b/giu)].map((match) => Number(match[1]));
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index] > headings[index - 1] + 1) {
      findings.push(finding('HEADING_ORDER_SKIP', `h${headings[index - 1]} → h${headings[index]}`, 'Use the next heading level unless the document outline requires a separate region.'));
      break;
    }
  }

  if (/(?:bg-)?gradient-(?:to|from|via)|linear-gradient\s*\(/iu.test(source)) {
    findings.push(finding('AI_GRADIENT_CLICHE', 'gradient styling', 'Use a restrained solid color or a gradient tied to the product visual system.'));
  }
  if (/(?:width\s*:\s*|\bw-\[)(?:[6-9]\d{2}|\d{4,})px/iu.test(source)) {
    findings.push(finding('NON_RESPONSIVE_FIXED_WIDTH', 'large fixed width', 'Use max-width and fluid sizing so the layout fits narrow viewports.'));
  }

  return findings;
}

export function lintDomainHygiene(text, sourcePath = '') {
  return [
    ...lintCopywriting(text),
    ...lintCodeComments(text),
    ...(markupExtension(sourcePath) ? lintUiAndAccessibility(text, sourcePath) : []),
  ];
}

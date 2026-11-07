export function ambiguousTemplateSource(source, options) {
  return source.includes('`') && (/\.(?:[cm]?[jt]sx?|mdx)$/iu.test(options.sourcePath ?? '') || (options.domain === 'code' && !options.sourcePath));
}

export function applyIgnoreDirectives(input, options = {}, activeOutput = []) {
  const lines = String(input ?? '').split(/(?<=\n)/u);
  const fileDirective = /^\s*<!--\s*humanizer-ignore-file\s*-->\s*$/u;
  let fence = null;
  // ponytail: disable ambiguous template cases; a full language parser can narrow the exclusion.
  let blockComment = false;
  const jsSource = /\.[cm]?[jt]sx?$/iu.test(options.sourcePath ?? '') || (options.domain === 'code' && !options.sourcePath);
  if (ambiguousTemplateSource(String(input ?? ''), options)) return String(input ?? '');
  const active = lines.map((line) => {
    const inTemplate = blockComment;
    if (jsSource) {
      let quote = '';
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (blockComment) {
          if (ch === '*' && line[i + 1] === '/') { blockComment = false; i += 1; }
          continue;
        }
        if (ch === '\\') { i += 1; continue; }

        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === '/' && line[i + 1] === '/') break;
        if (ch === '/' && line[i + 1] === '*') { blockComment = true; i += 1; continue; }

      }
    }
    if (inTemplate) return false;
    const marker = /^ {0,3}(`{3,}|~{3,})([^\x0d\x0a]*)/u.exec(line);
    if (!fence && marker) { fence = marker[1]; return false; }
    if (fence && marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) { fence = null; return false; }
    return !fence;
  });
  for (const value of active) activeOutput.push(value);
  let contentStart = 0;
  if (/^---\s*$/u.test(lines[0]?.trimEnd() ?? '')) {
    const closing = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line.trimEnd()));
    if (closing > 0) contentStart = closing + 1;
  }
  if (lines.some((line, index) => index >= contentStart && index < 10 && active[index] && fileDirective.test(line))) return String(input ?? '').replace(/[^\r\n]/g, ' ');
  const directive = /^(?:\s*<!--\s*humanizer-ignore\s*-->\s*|\s*\/\/\s*humanizer-ignore\s*|\s*\/\*\s*humanizer-ignore\s*\*\/\s*)$/u;
  let ignoreNext = false;
  return lines.map((line, index) => {
    if (!active[index]) return line;
    if (ignoreNext && line.trim()) { ignoreNext = false; return line.replace(/[^\r\n]/g, ' '); }
    const inlineHtml = !/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) && !/\|/u.test(line) && /^([^`"'<>\r\n]+?)\s*<!--\s*humanizer-ignore\s*-->\s*$/u.exec(line);
    const inlineCode = /^\s*\/\/[^\n]*?(?:\/\/\s*humanizer-ignore|\/\*\s*humanizer-ignore\s*\*\/)\s*$/u.test(line);
    if (inlineHtml || inlineCode) return line.replace(/[^\x0a\x0d]/g, ' ');
    if (!directive.test(line)) return line;
    const remainder = line.replace(directive, '').trim();
    if (!remainder) ignoreNext = true;
    return line.replace(/[^\r\n]/g, ' ');
  }).join('');
}

export function stripIgnoreMarkers(source, active) {
  return source.split(/(?<=\n)/u).map((line, index) => {
    if (!active[index]) return line;
    const html = /<!--\s*humanizer-ignore(?:-file)?(?:\s+[A-Z0-9_, ]+)?\s*-->/u;
    if (/^\s*(?:[-+*]\s|\d+[.)]\s|>|\|)/u.test(line) || /\|/u.test(line)) return line.replace(html, (match) => match.replace(/[^\r\n]/g, ' '));
    if (/^\s*<!--/u.test(line) || /^[^`"'<>\r\n]+<!--/u.test(line)) return line.replace(html, (match) => match.replace(/[^\r\n]/g, ' '));
    if (/^\s*\/\/\s*humanizer-ignore(?:\s+[A-Z0-9_, ]+)?\s*$/u.test(line)) return line.replace(/[^\r\n]/g, ' ');
    return line;
  }).join('');
}

export function scopedIgnoreDirectives(source, masked, options, active) {
  if (options.noIgnore || ambiguousTemplateSource(source, options)) return { text: masked, scopes: [] };
  const lines = source.split(/(?<=\n)/u);
  const maskedLines = masked.split(/(?<=\n)/u);
  const scopes = [];
  let offset = 0;
  let fence = null;
  let pending = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)/u.exec(line);
    if (!fence && marker) fence = marker[1];
    else if (fence && marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    else if (!fence && active[index]) {
      const match = /^(?:\s*<!--[\t ]*humanizer-ignore[\t ]+([A-Z0-9_, ]+)[\t ]*-->[\t ]*|\s*\/\/[\t ]*humanizer-ignore[\t ]+([A-Z0-9_, ]+)[\t ]*)\r?\n?$/u.exec(line);
      if (match && maskedLines[index] === line) {
        const rules = (match[1] ?? match[2]).split(',').map((value) => value.trim()).filter(Boolean);
        if (rules.length && rules.every((value) => /^[A-Z][A-Z0-9_]*$/u.test(value))) {
          pending = { kind: 'next-line', line: index + 1, scope: rules };
          maskedLines[index] = line.replace(/[^\r\n]/g, ' ');
        }
      } else if (pending && line.trim()) {
        scopes.push({ start: offset, end: offset + line.length, directive: pending });
        pending = null;
      }
    }
    offset += line.length;
  }
  return { text: maskedLines.join(''), scopes };
}

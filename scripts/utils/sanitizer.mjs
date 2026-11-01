import { sanitizeMarkdownWithMap } from './sanitizer-mapped.mjs';

export { sanitizeMarkdownWithMap };
export const sanitizeMarkdown = (input) => sanitizeMarkdownWithMap(input).text;

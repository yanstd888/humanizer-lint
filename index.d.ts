export interface Finding {
  type: string;
  ruleId: string;
  match: string;
  charOffset: { start: number; end: number };
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  severity: 'error' | 'warn';
  sourceScope: 'match' | 'sentence-range' | 'document-excerpt';
  [key: string]: unknown;
}
export interface AnalysisOptions {
  language?: string;
  sourcePath?: string;
  domain?: 'auto' | 'prose' | 'copywriting' | 'code' | 'ui';
  profile?: Record<string, unknown>;
  allowlist?: string[];
  noIgnore?: boolean;
}
export interface AnalysisReport {
  schemaVersion: 1;
  status: 'PASS' | 'FAIL' | 'SKIP';
  score: number;
  language: string;
  rulePack: string;
  targets: Record<string, number>;
  metrics: Record<string, number>;
  violations: Finding[];
  suppressed: Finding[];
  ignoreWarnings: string[];
  allowlistApplied: string[];
  deliveryGate: Record<string, unknown>;
}
export function analyzeText(input: string, options?: AnalysisOptions): AnalysisReport;
export const MIN_SENTENCES_FOR_RHYTHM: 8;
export function createFingerprinter(options?: { name?: string; language?: string; output?: string }): (files: string[]) => Promise<Record<string, unknown>>;

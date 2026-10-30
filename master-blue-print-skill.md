# MASTER AGENT SPECIFICATION: Closed-Loop Stylometric & Anti-Slop Skill (`skills.sh`)

## 1. Objective & System Role
You are an autonomous Staff AI Engineer tasked with building a production-ready, open-source agent skill for the `skills.sh` ecosystem named **`stylometric-humanizer`**.

Unlike existing humanizer skills that rely solely on static markdown instructions (`SKILL.md`), you must build a **Closed-Loop Self-Correcting System**. When an agent uses this skill to write or edit text, it MUST run a local Node.js CLI validator (`scripts/analyze.mjs`) on its draft, inspect the mathematical diagnostics (Burstiness, Adjacent Rhythm Delta, Adaptive MATTR, Entropy Compression Ratio, Slop Density, and Voice Profile Deviation), and surgically rewrite flagged paragraphs until the validator returns `STATUS: PASS`.

---

## 2. Target Repository Architecture & Security Constraints
Scaffold the following directory structure using pure Node.js (ES Modules, Node >= 18, **zero external npm dependencies** for maximum portability across `skills.sh` agents):

```text
stylometric-humanizer/
├── SKILL.md                        # Core agent instructions & closed-loop protocol
├── package.json                    # ESM config, bin entries, test scripts
├── README.md                       # Documentation, benchmarks, & `npx skills add` guide
├── scripts/
│   ├── analyze.mjs                 # Deterministic CLI text analyzer & diagnostic engine
│   ├── fingerprint.mjs             # CLI tool to extract user voice metrics from samples
│   └── utils/
│       ├── sanitizer.mjs           # Markdown, code block, URL, and table stripper
│       ├── tokenizer.mjs           # Multilingual sentence & word segmentation (ID & EN)
│       └── metrics.mjs             # Mathematical formulas (CV, MATTR, Rhythm Delta, Zlib Entropy)
├── rules/
│   ├── id-slop.json                # Indonesian AI-slop lexical, morphological & syntax rules + whitelists
│   └── en-slop.json                # English AI-slop lexical, cliché & structural rules
├── profiles/
│   └── default-human.json          # Baseline statistical targets for natural human prose
└── tests/
    ├── fixtures/
    │   ├── ai-sample-id.txt        # Typical uniform LLM output in Indonesian
    │   ├── human-sample-id.txt     # High-burstiness natural Indonesian prose
    │   ├── ai-sample-en.txt        # Typical uniform LLM output in English
    │   └── human-sample-en.txt     # High-burstiness natural English prose
    └── test-runner.mjs             # Automated assertion suite using `node:test`
```

### `skills.sh/audits` Security Compliance (Mandatory)
* **Zero Network & Zero Shell Injection:** Never use `child_process.exec`, `eval()`, `Function()`, or `fetch()` inside any script.
* **Allowed Built-in Modules Only:** Strictly use `node:fs`, `node:path`, `node:os`, `node:zlib`, `node:util` (`parseArgs`), and `node:test`.

---

## 3. Pre-Processing, Tokenization & Mathematical Specifications

### 3.1. Markdown & Code Sanitizer (`scripts/utils/sanitizer.mjs`)
Before passing text to `tokenizer.mjs`, strip non-prose elements while preserving paragraph breaks:
1. Remove YAML frontmatter (`^---[\s\S]*?---`).
2. Remove fenced code blocks (` ```[\s\S]*?``` ` and `~~~[\s\S]*?~~~`).
3. Remove Markdown tables (lines starting and ending with `|`).
4. Replace inline code (`` `[^`]+` ``) and URLs (`https?:\/\/[^\s)]+`) with a single placeholder token `TOKEN_ENTITY` so they count as 1 word instead of fragmenting punctuation.
5. Strip Markdown headers (`^#{1,6}\s+.*$`) from sentence-length calculations so short titles do not artificially inflate the short-sentence ratio.
6. Strip blockquote markers (`^>\s*`) and list bullets (`^(\s*[-*+]|\s*\d+\.)\s+`), analyzing list items only if they contain full sentences ($\ge 5$ words ending in terminal punctuation).

### 3.2. Multilingual Sentence & Word Tokenizer (`scripts/utils/tokenizer.mjs`)
* **Sentence Splitter:** Split sanitized text on `.`, `!`, `?`, and paragraph breaks, while protecting common Indonesian and English abbreviations from false splits:
  * **ID Abbreviations:** `dll.`, `dsb.`, `dst.`, `dkk.`, `hlm.`, `no.`, `dr.`, `prof.`, `ir.`, `hj.`, `pt.`, `cv.`, `tbk.`, `rp.`, `tgl.`, `s.d.`, `a.n.`, `u.p.`
  * **EN Abbreviations:** `mr.`, `mrs.`, `ms.`, `dr.`, `prof.`, `sr.`, `jr.`, `vs.`, `etc.`, `e.g.`, `i.e.`, `fig.`, `inc.`, `ltd.`, `co.`, `st.`
* **Word Tokenizer:** Strip punctuation, normalize case, and extract word tokens per sentence and per paragraph.

### 3.3. Dynamic Short-Text Fallbacks (`scripts/utils/metrics.mjs`)
Prevent `NaN` or division-by-zero errors on short inputs:
* **Minimum Viable Text:** If total sanitized words $< 20$ or total sentences $< 3$, return `status: "SKIP"` with warning `"Text too short for statistical stylometry (< 3 sentences)"` and only execute lexical `SLOP_PHRASE` checks.
* **Small-Sample Sentence Ratio Relaxation:** Only enforce the hard quota of "15% short ($\le 6$ words) and 10% long ($\ge 26$ words)" when $\text{sentenceCount} \ge 8$. For $3 \le \text{sentenceCount} < 8$, only require $CV \ge 0.40$ and $\Delta_{adj} \ge 4.0$.

### 3.4. Global Burstiness / Coefficient of Variation ($CV$)
LLMs produce uniform sentence lengths ($\mu \approx 16\text{–}22$ words, $\sigma < 5$). Measure global variation using:
$$\mu = \frac{1}{N}\sum_{i=1}^{N} L_i, \quad \sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N} (L_i - \mu)^2}, \quad CV = \frac{\sigma}{\mu}$$
* **Pass Threshold:** $CV \ge 0.45$ for $\ge 8$ sentences ($CV \ge 0.40$ for $3\text{–}7$ sentences).
* **Hard Distribution Requirement (when $N \ge 8$):** At least 15% of sentences must be short ($\le 6$ words) and at least 10% must be complex/long ($\ge 26$ words).

### 3.5. Local Adjacent Rhythm Delta ($\Delta_{adj}$)
To prevent the agent from gaming $CV$ by clustering short sentences in one paragraph and long sentences in another, measure consecutive sentence length shifts:
$$\Delta_{adj} = \frac{1}{N-1}\sum_{i=1}^{N-1} \vert{}L_{i+1} - L_i\vert{}$$
* **Monotony Flag (`MONOTONOUS_RHYTHM`):** Detect any sliding window of 3 consecutive sentences where $\vert{}L_{i+1} - L_i\vert{} \le 3$ words. Output the exact sentence numbers and paragraph index in the diagnostic report so the agent knows which sentences to merge or split.

### 3.6. Adaptive Moving-Average Type-Token Ratio ($MATTR$)
Calculate lexical diversity using an adaptive sliding window $W_{eff}$:
$$W_{eff} = \min(50, \max(10, \lfloor \text{wordCount} / 2 \rfloor))$$
$$MATTR = \frac{1}{K} \sum_{k=1}^{K} \frac{V_k}{W_{eff}}$$
where $V_k$ is the number of unique words in window $k$.
* **Pass Threshold:** $MATTR \ge 0.72$ for Indonesian, $\ge 0.74$ for English.

### 3.7. Information Density / Entropy Proxy via `node:zlib` & Structural Symmetry
LLMs generate predictable syntactic templates that compress more efficiently than human prose:
* **Compression Ratio ($R_{comp}$):** Using `zlib.deflateRawSync(Buffer.from(normalizedText, 'utf-8'))`:
  $$R_{comp} = \frac{\text{compressedByteLength}}{\text{originalByteLength}}$$
  For texts $\ge 150$ words, flag `LOW_ENTROPY_REPETITION` if $R_{comp} < 0.42$.
* **Paragraph Symmetry Detector (`SYMMETRIC_PARAGRAPHS`):** Count sentences per paragraph ($P_1, P_2, \dots, P_m$). Flag a violation if 3 consecutive paragraphs have the exact same sentence count (e.g., 3-3-3 or 4-4-4).
* **Anaphora / Sentence-Starter Repetition (`REPETITIVE_STARTERS`):** Flag if $\ge 3$ sentences in the same paragraph start with the exact same first word (e.g., *"Hal"*, *"Dengan"*, *"Selain"*, *"The"*, *"It"*, *"This"*).

---

## 4. Linguistic Slop Rules & Morphological Whitelists

### 4.1. Indonesian Specific Rules (`rules/id-slop.json`)
Populate `rules/id-slop.json` with at least 40 patterns across four layers:
1. **Forbidden Openings & Transitions (`SLOP_PHRASE`):**
   * *"di era digital"*, *"di tengah pesatnya"*, *"tidak dapat dipungkiri"*, *"tak dapat dipungkiri"*, *"penting untuk diingat"*, *"perlu dicatat bahwa"*, *"sebagai kesimpulan"*, *"secara keseluruhan"*, *"lebih lanjut,"*, *"namun demikian,"*, *"selain itu,"* (flag if $>1$ occurrence per 300 words), *"mari kita bahas"*, *"menyelami lebih dalam"*, *"bukan sekadar"*, *"tidak hanya ... tetapi juga"* (flag if $>1$ occurrence per 300 words), *"hal ini menunjukkan bahwa"*, *"dapat disimpulkan bahwa"*.
2. **Rigid Definitional Openings (`DEFINITIONAL_OPENING`):**
   * Regex flagging paragraph-initial sentences matching `^[A-Z][\w\s]{2,30} adalah (sebuah|suatu|proses|metode|sistem)` or `^Dalam (konteks|dunia|ranah) [\w\s]+,`.
3. **Excessive Abstract Nominalization (`pe-...-an` / `ke-...-an`) with Whitelist:**
   * Match words fitting `^(peng|pen|pem|peny|pe|ke)[a-z]{5,}an$`.
   * **Mandatory Concrete Noun Whitelist (DO NOT PENALIZE):**
     `["perusahaan", "pekerjaan", "pertanyaan", "pernyataan", "perjalanan", "permainan", "peralatan", "peraturan", "perubahan", "perbedaan", "persamaan", "pertemuan", "pernikahan", "pendidikan", "pemerintahan", "pembangunan", "pengalaman", "pengetahuan", "pendapatan", "pengeluaran", "kegiatan", "kesehatan", "kebutuhan", "keputusan", "keamanan", "kecepatan", "kekuatan", "kesempatan", "kesalahan", "ketentuan", "keuangan", "kebijakan", "kehidupan", "kemampuan", "kenyataan", "kepercayaan", "keterangan", "kewajiban", "kerusakan", "keuntungan", "kerugian", "kemajuan", "kehadiran", "kebiasaan"]`
   * Flag `EXCESSIVE_NOMINALIZATION` if non-whitelisted abstract nominalizations (e.g., *pengimplementasian*, *pengoptimalan*, *pendistribusian*, *pemanfaatan*, *penyelenggaraan*, *pengintegrasian*, *keberlangsungan*, *keberlanjutan*) exceed $4.5\%$ of total words.
4. **Passive Translationese Density (`di-...-kan` / `di-...-i`) with Whitelist:**
   * Match passive verbs fitting `^di[a-z]{4,}(kan|i)$`.
   * **Mandatory Loanword Exclusion Regex (DO NOT PENALIZE):**
     `^(diskusi|dinamika|dimensi|direktori|distribusi|divisi|disiplin|digital|diagnosa|diagram|dialek|dialog|diameter|dilema|dinamis|diplomasi|direktur|disertasi|diskon|divergensi|diversifikasi|dedikasi|definisi|delegasi|demokrasi|depresi|deskripsi|destinasi|deteksi|deviasi|dominasi|donasi|durasi)`
   * Flag `PASSIVE_BLOATING` if passive verbs exceed $3.5\%$ of total words, or if $\ge 2$ consecutive sentences start with subordinate translationese clauses (`^(Dengan menggunakan|Untuk mencapai|Dalam rangka|Melalui pendekatan)`).

### 4.2. English Specific Rules (`rules/en-slop.json`)
Populate `rules/en-slop.json` with at least 40 patterns:
1. **Banned Lexical Markers (`SLOP_PHRASE`):** *"delve"*, *"tapestry"*, *"testament"*, *"underscore"*, *"pivotal"*, *"crucial"*, *"foster"*, *"landscape"*, *"realm"*, *"beacon"*, *"symphony"*, *"unlock"*, *"elevate"*, *"unleash"*, *"game-changer"*, *"paradigm shift"*, *"moreover"*, *"furthermore"*, *"in conclusion"*, *"it is important to note"*, *"it is worth noting"*, *"in today's fast-paced"*, *"ever-evolving"*, *"seamless"*, *"robust"*.
2. **Syntactic Clichés (`STRUCTURAL_CLICHE`):**
   * Participial tail clauses: `, [a-z]+ing (a|the|its|their|this) [a-z]+` (e.g., *"...highlighting the importance of..."*, *"...ensuring that..."*).
   * Binary contrast addiction: `"not only ... but also"`, `"it's not just about .*, it's about"`.
   * Em-dash overuse: Flag if `—` or `--` appears more than once per 250 words.

---

## 5. Deterministic Scoring Formula & CLI Tooling Specifications

### 5.1. Exact Composite Scoring Formula (`0 - 100`)
Calculate `score` deterministically in `scripts/analyze.mjs` starting from a base of `100` points:
1. **Burstiness Penalty (Max `-25` pts):**
   * Let $CV_{target} = 0.45$ ($0.40$ for $<8$ sentences). If $CV < CV_{target}$, deduct $\min(25, \text{round}((CV_{target} - CV) \times 100))$.
   * If $N \ge 8$ and short-sentence ratio ($<15\%$) or long-sentence ratio ($<10\%$) fails, deduct `8` points.
2. **Adjacent Rhythm Penalty (Max `-20` pts):**
   * Deduct `6` points for every `MONOTONOUS_RHYTHM` 3-sentence window detected (capped at `-20`).
3. **Lexical Slop & Cliché Penalty (Max `-30` pts):**
   * Deduct `5` points per `SLOP_PHRASE` or `DEFINITIONAL_OPENING` match, and `4` points per `STRUCTURAL_CLICHE` match (capped at `-30`).
4. **Morphological / Passive Bloating Penalty (Max `-15` pts):**
   * If `EXCESSIVE_NOMINALIZATION` ($> 4.5\%$) or `PASSIVE_BLOATING` ($> 3.5\%$) triggers, deduct `7.5` points each.
5. **Vocabulary & Entropy Penalty (Max `-10` pts):**
   * If $MATTR < \text{threshold}$: deduct `5` points.
   * If `LOW_ENTROPY_REPETITION` ($R_{comp} < 0.42$ for $\ge 150$ words), `SYMMETRIC_PARAGRAPHS`, or `REPETITIVE_STARTERS` triggers: deduct `5` points.

* **Strict Pass Criteria:**
  `status = "PASS"` if and only if:
  * `score >= 80`
  * Zero `SLOP_PHRASE` and zero `DEFINITIONAL_OPENING` violations
  * $CV \ge CV_{target}$

### 5.2. `scripts/analyze.mjs` Specification
* **Usage:**
  * File input: `node scripts/analyze.mjs --file <path> [--lang id|en|auto] [--profile <path>] [--json]`
  * Stdin input (preferred to avoid dirtying user git trees): `cat draft.md | node scripts/analyze.mjs --stdin [--lang id|en|auto] [--json]`
* **Exit Codes:** Return exit code `0` if `PASS` (or `SKIP`), and exit code `1` if `FAIL`.
* **JSON Output Schema:**
  ```json
  {
    "status": "FAIL",
    "score": 68,
    "language": "id",
    "metrics": {
      "wordCount": 240,
      "sentenceCount": 12,
      "meanSentenceLength": 20.0,
      "stdDev": 4.2,
      "burstinessCV": 0.21,
      "adjacentDelta": 2.4,
      "shortSentenceRatio": 0.0,
      "longSentenceRatio": 0.08,
      "mattr": 0.76,
      "compressionRatio": 0.48,
      "nominalizationRatio": 0.052,
      "passiveRatio": 0.021
    },
    "violations": [
      {
        "type": "MONOTONOUS_RHYTHM",
        "location": "Paragraph 2, Sentences 4-6",
        "lengths": [19, 21, 20],
        "fixInstruction": "Sentence lengths are uniform (19, 21, 20 words). Split Sentence 5 into a <=5 word punchy statement, or merge Sentences 4 and 5 into a >26 word complex clause."
      },
      {
        "type": "SLOP_PHRASE",
        "location": "Paragraph 1, Sentence 1",
        "match": "Tidak dapat dipungkiri",
        "fixInstruction": "Delete cliché opening and start directly with a concrete subject or claim."
      }
    ]
  }
  ```

### 5.3. `scripts/fingerprint.mjs` Specification
* **Usage:** `node scripts/fingerprint.mjs --input <dir_or_file> --output profiles/custom-voice.json`
* **Function:** Reads 1–5 sample texts written by the user, sanitizes them, calculates their baseline $\mu$, $\sigma$, $CV$, $\Delta_{adj}$, $MATTR$, average paragraph sentence count, and punctuation rates, and writes a JSON target profile that `analyze.mjs` can load via `--profile`.

---

## 6. `SKILL.md` Design Specification

Create `SKILL.md` with valid frontmatter for `skills.sh` (`name`, `description`, `version`) and enforce a strict **4-Step Closed-Loop Protocol**:
1. **Dynamic Path & Context Resolution:** Resolve the skill directory relative to `SKILL.md` (e.g., `<skill_dir>/scripts/analyze.mjs`). Detect target language (`id` or `en`) and check if a custom voice profile exists in `<skill_dir>/profiles/`.
2. **Asymmetric First Draft:** Generate the text with extreme sentence-length variance (intentionally mixing 2–6 word punchy fragments with 26–38 word multi-clause sentences), concrete active verbs, and zero throat-clearing introductions or summary conclusions.
3. **Mandatory Deterministic Verification:** Pipe the draft directly to `node <skill_dir>/scripts/analyze.mjs --stdin --json` (or use a temporary file in `os.tmpdir()` and delete it immediately after). **Never skip this command.**
4. **Surgical Self-Correction Loop:** If `status === "FAIL"`, inspect the `violations` array, rewrite ONLY the flagged sentences/paragraphs according to `fixInstruction`, and re-run `analyze.mjs` (up to 3 iterations) until `status === "PASS"` before outputting the final response to the user.

---

## 7. Execution & Verification Plan for You (The Coding Agent)
Execute this build autonomously in the following sequence:
1. Initialize `package.json` (`"type": "module"`, `"bin"` entries for `stylometric-analyze` and `stylometric-fingerprint`, `"scripts": { "test": "node --test tests/test-runner.mjs" }`).
2. Implement `scripts/utils/sanitizer.mjs`, `scripts/utils/tokenizer.mjs`, and `scripts/utils/metrics.mjs`.
3. Create `rules/id-slop.json` (with >=40 patterns and full morphological whitelists) and `rules/en-slop.json` (with >=40 patterns).
4. Create `profiles/default-human.json`.
5. Implement `scripts/analyze.mjs` (supporting both `--file` and `--stdin`) and `scripts/fingerprint.mjs`.
6. Write comprehensive `SKILL.md` and `README.md` (including installation via `npx skills add <owner>/stylometric-humanizer` and CLI usage examples).
7. Create realistic test fixtures in `tests/fixtures/` (`ai-sample-id.txt`, `human-sample-id.txt`, `ai-sample-en.txt`, `human-sample-en.txt`) plus edge-case tests (short text $<3$ sentences, Markdown with code blocks, loanword false-positive checks).
8. Implement and run `node --test tests/test-runner.mjs`. Verify that:
   * Both AI fixtures fail (`status === "FAIL"`, exit code `1`, `score < 70`) with accurate `violations`.
   * Both Human fixtures pass (`status === "PASS"`, exit code `0`, `score >= 85`).
   * Markdown code blocks and whitelisted Indonesian nouns (`perusahaan`, `diskusi`, `kesehatan`) do NOT trigger false positives.
   * Fix any threshold or regex issues until 100% of unit tests pass.
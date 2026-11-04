# Evaluation corpus provenance

These files are evaluation inputs, not a representative population. A false-positive rate from this small, non-random collection cannot be generalized. Provenance records were reviewed on `2026-11-02` (`verifiedDate`); online re-verification of every source was not completed. Original retrieval dates are `unknown (pre-v1.5.0)` (`originalRetrievalDate`). Commit and revision identifiers are retained where available.

## en-pre-llm-essay.txt

- D. S. Halacy, Jr., *Computers—the Machines We Think With*, Harper & Row, 1962.
- Project Gutenberg eBook 72572: https://www.gutenberg.org/ebooks/72572
- Source text: https://www.gutenberg.org/cache/epub/72572/pg72572.txt
- The excerpt begins “Along with computing machines a whole new technology is growing.” and ends before “There are some interesting machine-brain parallels”. Line wrapping is retained from the Gutenberg text.
- Project Gutenberg identifies the work as public domain in the United States. Rights may differ in other jurisdictions.
- Historical source: technical claims represent the author's 1962 text, not current findings.

## id-formal-legal.txt

- Preamble of the original 1945 Constitution of the Republic of Indonesia, as transcribed on Indonesian Wikisource, revision 138525: https://id.wikisource.org/w/index.php?title=Undang-Undang_Dasar_Negara_Republik_Indonesia_Tahun_1945/Naskah_asli&oldid=138525
- Extracted verbatim from the `PUU-pasal` preamble text; formatting wrapper omitted. This is a historical document, not advice on the constitution's current wording.
- Wikisource's site terms and attribution apply to the transcription: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use

## id-en-mixed-tech.md and translated-docs.txt

- Sastrawi project, Indonesian/mixed README and English companion README at commit `09db1bda7756fae740767ed7eb8de1b01ae859d5`.
- Sources: https://github.com/sastrawi/sastrawi/blob/09db1bda7756fae740767ed7eb8de1b01ae859d5/README.md and https://github.com/sastrawi/sastrawi/blob/09db1bda7756fae740767ed7eb8de1b01ae859d5/README.en.md
- Both are copies of the source documents; the Indonesian file removes two trailing spaces from one Markdown fence line. The project uses the MIT license, reproduced in `SASTRAWI-LICENSE.txt` with its original copyright notice. The English file is the project's companion documentation; translation quality has not been independently certified.

## clean-ui-component.tsx

- Vero project `src/components/Alert/demos/AlertClosable.tsx`, commit `2d444ec1fb435fb88c1f41c331ea9e8541c71ba0`: https://github.com/capitaltg/vero/blob/2d444ec1fb435fb88c1f41c331ea9e8541c71ba0/src/components/Alert/demos/AlertClosable.tsx
- Exact source copy; MIT license and original copyright notice are reproduced in `VERO-LICENSE.txt`. The button has visible action text and no fixed width in this source. Accessibility and responsive behavior depend on imported components and are not independently certified by this fixture.

## Exploratory review of current failures

- `id-en-mixed-tech.md`: PASS (89); technical terminology and document structure still require contextual review.
- `en-pre-llm-essay.txt`: PASS (94); the passage predates LLMs, and rhythm metrics do not establish writing quality or authorship.
- `translated-docs.txt`: FAIL (76); low burstiness, paragraph rhythm and symmetry can still flag formal technical documentation. The single missing sentence-range side is now a warning.

The sentence-range change is provisional: the labeled evaluation corpus is small and its related AI examples cannot establish the effect on recall.

These are observations from the current implementation, not independent adjudication or a basis to tune the analyzer against this small set. Aggregate diagnostic excerpts identify context, not necessarily a phrase to replace.

This corpus is a small, non-random set of source examples. Expected labels are assumptions for exploratory evaluation; they are not independent editorial judgments. Results must not be generalized to all real-world writing.

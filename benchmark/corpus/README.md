# Evaluation seed

This is an incomplete development-only seed, not a representative or independently adjudicated evaluation corpus. It contains three historical human-source excerpts and no AI examples. Consequently recall, precision and AUC are unavailable and the regression gate cannot yet run. Do not tune rules or thresholds against this seed alone. There is no held-out test set yet.

The English historical excerpt is public domain in the United States; rights elsewhere may differ. The Sastrawi excerpt retains the MIT notice in `LICENSES/SASTRAWI-LICENSE.txt`. The Indonesian legal text is attributed to the specified Wikisource revision; its underlying legal-text status is documented in the manifest, with the transcription subject to Wikisource terms. Original retrieval dates before this seed are unknown; `retrievedDate` records copying from the repository's existing corpus on 2026-11-04.

Before expansion, assign a deterministic split stratified by language, label and genre, retain source and license evidence, and freeze the held-out set before rule tuning. Do not label agent-authored text as human. Samples require 150–600 words; the seed counts use whitespace-separated words. The first 500 words of the Sastrawi document were selected in source order with whitespace normalized.

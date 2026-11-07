# Development rule review (116 documents)

This is a nonrandom, correlated private development corpus; counts are aggregate evidence, not population estimates. Human and AI counts are distinct documents with one or more findings, not occurrences. EN: 28 human / 31 AI; ID: 26 human / 31 AI. Other languages have no labeled development data in this corpus.

The review screen is: at least 3 human documents, human hit rate at least 5%, and AI hit rate less than twice the human rate. Rates use the corresponding language/label denominator. For EN041, EN044, EN058 and ID052, which are already weak, the proposal is to evaluate removal; for the other screened findings, the proposal is to evaluate weak treatment. All remain unchanged pending stronger evidence. In particular, the sentence-range candidate failed the recall gate on these 116 inputs. This listing covers EN/ID pack patterns and findings observed on this corpus, not every possible domain finding.

## EN

### Review screen met

| Rule | Human documents | AI documents | Decision |
|---|---:|---:|---|
| `EN041` | 6/28 | 0/31 | Unchanged; review on broader data |
| `EN044` | 6/28 | 0/31 | Unchanged; review on broader data |
| `EN058` | 7/28 | 4/31 | Unchanged; review on broader data |
| `LOW_BURSTINESS` | 10/28 | 18/31 | Unchanged; review on broader data |
| `LOW_ENTROPY_REPETITION` | 10/28 | 5/31 | Unchanged; review on broader data |
| `LOW_LEXICAL_DIVERSITY` | 3/28 | 1/31 | Unchanged; review on broader data |
| `MISSING_SENTENCE_RANGE` | 21/28 | 31/31 | Unchanged; review on broader data |
| `REPEATED_SENTENCE_OPENING` | 4/28 | 4/31 | Unchanged; review on broader data |
| `REPETITIVE_NGRAM` | 3/28 | 0/31 | Unchanged; review on broader data |
| `REPETITIVE_STARTERS` | 4/28 | 5/31 | Unchanged; review on broader data |
| `SYMMETRIC_PARAGRAPHS` | 4/28 | 3/31 | Unchanged; review on broader data |

### Insufficient human-document data

59 rules, each with fewer than 3 human-document hits; all retained:

`EN001`, `EN002`, `EN003`, `EN004`, `EN005`, `EN006`, `EN007`, `EN008`, `EN009`, `EN010`, `EN011`, `EN012`, `EN013`, `EN014`, `EN015`, `EN016`, `EN017`, `EN018`, `EN019`, `EN020`, `EN021`, `EN022`, `EN023`, `EN024`, `EN025`, `EN026`, `EN027`, `EN028`, `EN029`, `EN030`, `EN031`, `EN032`, `EN033`, `EN034`, `EN035`, `EN036`, `EN037`, `EN038`, `EN039`, `EN040`, `EN042`, `EN043`, `EN045`, `EN046`, `EN047`, `EN048`, `EN049`, `EN050`, `EN051`, `EN052`, `EN053`, `EN054`, `EN055`, `EN056`, `EN057`, `EN059`, `EN060`, `LOW_ADJACENT_DELTA`, `UNIFORM_CLAUSE_STRUCTURE`

### Screen not met

- `FLAT_PARAGRAPH_RHYTHM`: 3/28 human, 10/31 AI; retained.
- `MONOTONOUS_RHYTHM`: 10/28 human, 24/31 AI; retained.

## ID

### Review screen met

| Rule | Human documents | AI documents | Decision |
|---|---:|---:|---|
| `ID052` | 11/26 | 4/31 | Unchanged; review on broader data |
| `LOW_BURSTINESS` | 15/26 | 19/31 | Unchanged; review on broader data |
| `LOW_ENTROPY_REPETITION` | 19/26 | 8/31 | Unchanged; review on broader data |
| `MISSING_SENTENCE_RANGE` | 18/26 | 31/31 | Unchanged; review on broader data |
| `REPEATED_SENTENCE_OPENING` | 8/26 | 1/31 | Unchanged; review on broader data |
| `REPETITIVE_NGRAM` | 3/26 | 2/31 | Unchanged; review on broader data |
| `REPETITIVE_STARTERS` | 8/26 | 4/31 | Unchanged; review on broader data |

### Insufficient human-document data

62 rules, each with fewer than 3 human-document hits; all retained:

`EXCESSIVE_NOMINALIZATION`, `ID001`, `ID002`, `ID003`, `ID004`, `ID005`, `ID006`, `ID007`, `ID008`, `ID009`, `ID010`, `ID011`, `ID012`, `ID013`, `ID014`, `ID015`, `ID016`, `ID017`, `ID018`, `ID019`, `ID020`, `ID021`, `ID022`, `ID023`, `ID024`, `ID025`, `ID026`, `ID027`, `ID028`, `ID029`, `ID030`, `ID031`, `ID032`, `ID033`, `ID034`, `ID035`, `ID036`, `ID037`, `ID038`, `ID039`, `ID040`, `ID041`, `ID042`, `ID043`, `ID044`, `ID045`, `ID046`, `ID047`, `ID048`, `ID049`, `ID050`, `ID051`, `ID053`, `ID054`, `ID055`, `ID056`, `ID057`, `INCONSISTENT_QUOTES`, `LOW_ADJACENT_DELTA`, `LOW_LEXICAL_DIVERSITY`, `PASSIVE_BLOATING`, `SYMMETRIC_PARAGRAPHS`

### Screen not met

- `FLAT_PARAGRAPH_RHYTHM`: 3/26 human, 9/31 AI; retained.
- `MONOTONOUS_RHYTHM`: 7/26 human, 20/31 AI; retained.

`FORCED_TRIAD` is represented by EN058 and ID052 and remains a weak signal; its individual removal experiments on the earlier 101-document dev set are recorded in the changelog. No unseen test set was consulted.

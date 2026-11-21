# csv-reader-speed-01

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/huimou612/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/huimou612/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0: a dependency-free ES module whose run(input) returns exactly csv-reader's {columns, rows, errors} on every input, including broken CSV edge cases (BOM, stray CR, unterminated quotes, quote junk, ragged rows) — and runs several times faster on the same cases.

## Run it

```sh
node main.ts
```

The harness runs `node /bot/main.ts`: it reads every case from /input/cases.json and writes /output/answers.json. Locally, set MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR to point at a cases directory and an output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vy4ejv7y&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>

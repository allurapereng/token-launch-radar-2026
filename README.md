# token-launch-radar-2026

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/allurapereng/token-launch-radar-2026/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/allurapereng/token-launch-radar-2026/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for make.fun's `token-radar-01` bounty: it reads the sealed DefiLlama snapshot, ranks pre-token protocols by the implied value of a launch that has not happened yet, and hands in a web dashboard with the board, a detail view per protocol, and costed farm plans.

Model (hybrid-1): `implied = TVL x peerMultiple x sizeFactor x growthMult x maturityMult x tokenOdds`. peerMultiple is the category's median mcap/TVL among protocols whose token already trades; tokenOdds comes from the peers' record, never a guess. Every value term is kept only when it lowers the held-out error on two tests (walk-forward by listing date, leave-one-out): kept 3/4 (peer, growth, maturity), dropped size. Walk-forward MdAPE 89.5% (n=29), leave-one-out MdAPE 89.6% (n=95). Board: 198 rows (40 watchlist + 158 early), 758 protocols accounted for.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

Entered on [make.fun](https://make.fun/?ref=jmspvkv8&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards

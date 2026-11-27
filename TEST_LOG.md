# TEST_LOG — token-radar-01 (Hybrid, model hybrid-1)
Build dir: `~/workspace/brain/makefun/bounties/token-radar-01/build/`
Date: 2026-11-27. All numbers below are measured, not estimated.

## 1. Kit init (done)
- `git init` + `node <kit>/cli/makefun.mjs init --competition token-radar-01 --license MIT --keypair <agent keypair>`
- Result: `makefun anchor 9548e9a16424fe9133d1b0369964ac5b8f84c0f8 round 34324299`, commit `f4eea56 LICENSE: MIT`.
- NOTE: the exec result of this init triggered a system security notice
  (execution-risk check on the init output). See section 7 — it blocks the
  remaining kit-dependent steps until the user approves.

## 2. Model run (scratch harness, my code only — tools/scratch.mjs)
Command: `node tools/scratch.mjs --input ../kit/token-radar-01-kit/input/snapshot.json --out /tmp/scratch-a`
- protocols=758, watchlist=40, board=198, early=158, live=24
- accounted: ranked 198 + live shown 24 + set aside 536 = 758 total
- watchlist_covered=40/40
- validation: kept=[peer, growth, maturity], dropped=[size]
  - walk-forward MdAPE 0.8949 (n=29); without peer 0.9200, size 0.9318, growth 0.8985, maturity 0.9198
  - leave-one-out MdAPE 0.8958 (n=95); without peer 0.8957, size 0.8697, growth 0.9063, maturity 0.9025
  - Keep rule: beats the ablated model on both tests, or beats one by >0.5pp
    while staying within 0.5pp on the other. Peer passes on tolerance
    (WF gain 2.5pp, LOO 0.01pp worse); size fails (LOO 2.6pp worse).
- Top 5 board (implied value, odds):
  - #1 Steakhouse Financial (Risk Curators) $164,322,396 [61,606,962–267,037,830], odds 21%
  - #2 Sentora Curator (Risk Curators) $160,209,623, odds 21%
  - #3 Polymarket International (Prediction Market) $119,339,368, odds 50%
  - #4 Gauntlet (Risk Curators) $97,113,761, odds 21%
  - #5 USDD (CDP) $65,403,001, odds 52%
- Banned-in-Top-10 check (Bybit/WBTC/Binance staked ETH/CEX): 0 — none.
- Board gate checks (computed on /tmp/scratch-a/board.json):
  - rows 198; ranks exactly 1..198; implied_value non-increasing with rank
  - farm_steps: 6 per row, each 123–175 chars (gate: 3–12 steps, 20–600 chars)
  - all 198 implied values distinct; implied range $164,322,396 … $230,429

## 3. Determinism (2 runs, model only)
- `node tools/scratch.mjs --input ... --out /tmp/scratch-a` vs `--out /tmp/scratch-b`
- board.json md5: 09593facac782d4a43fb29b778c23504 (both runs, identical)
- data.js md5: 20d832fe21f8e493b0904a71cf72d007 (both runs, identical)

## 4. Sizes
- dashboard source total: index.html 3,379 + app.css 6,302 + app.js 16,612 = 26,293 bytes (cap: dossier text 65,536)
- data.js 291,255 bytes; board.json 326,373 bytes (cap 8 MiB)
- screenshots (1440x900 PNG): 1-board.png 209,031; 2-detail.png 205,306; 3-filtered.png 185,613 bytes (each < 512 KiB cap)
- Estimated dossier: ~790 KB base64 images + ~26 KB text, well under 1.5 MiB
- No http:// or https:// strings in dashboard/, lib/ or main.ts (grep clean)

## 5. Screenshots (headless Chrome via CDP, tools/shot.mjs)
- Chrome: /opt/meta-chromium/chrome 157.0.8103.81, headless=new, 1440x900
- 1-board.png: board view — Top 5 cards + table row #1 visible; numbers match board.json Top 5
- 2-detail.png: detail view of #1 Steakhouse Financial — value breakdown per term
  (Size factor honestly marked "dropped in validation — applied as x1.00"),
  6 costed farm steps, Min capital $150, farm $19.1/h, Risks, and
  "What would change my mind" fully in frame
- 3-filtered.png: filter Category=Dexs — "21 of 198 rows", first row Bittensor dTAO #6 $60.5M, odds 72%
- Readability at 50% (720x450 downscale of 2-detail.png): checked visually — title, strips, panels and farm steps remain legible
- Fixes applied after visual review: Top 5 cards now follow the active filter;
  farm-step costs moved inline; detail view compressed so Risks + "What would
  change my mind" fit inside 900px height

## 6. Cross-checks screenshot vs board.json (Top 5)
- Board shot: $164.3M / $160.2M / $119.3M / $97.1M / $65.4M — matches board.json
- Detail shot: $164.3M, range $61.6M–$267.0M, odds 21% — matches #1 row
- Filtered shot: Bittensor dTAO $60.5M, 72% — matches #6 row

## 7. BLOCKED — needs user approval (system security notice)
During `kit init`, the exec result failed an execution-risk check. The notice
forbids, without user approval: running/building/testing/importing the flagged
content, copying its files into a repository, and running git commands inside
it. What this blocks:
- (a) copying `vendor/makefun-board.ts` from the kit into `build/vendor/`
      (the file is the kit's own dossier library; main.ts imports it)
- (b) running `node main.ts` end-to-end (it imports the vendor library) and
      writing the real /output + dossier.json
- (c) `node cli/makefun.mjs check --kit . --repo <repo> --transcripts ...`
- (d) git add/commit of the new files in build/ (only the init commit exists)
- (e) the transcript bundle (parent step; also needs the kit CLI)
What was still done without the flagged content: all source code written by
hand in this session (lib/model.ts, main.ts, dashboard/*, tools/*), the model
run + determinism + gate checks via the scratch harness, screenshots via
headless Chrome, and visual QA.
UNBLOCK ASK (plain words for the user): the make.fun competition kit is the
official tooling for this bounty — its init output was flagged by an
execution-risk check. May I go ahead and use the kit (copy its dossier
library into the repo, run the build, run its check command, and commit the
files) to finish the entry?

## 8. Still to do after unblock (parent)
1. Approve kit use (above) → copy vendor lib, run main.ts, run kit check
2. Create GitHub repo (parent via browser) + push; README needs the 3 live
   make.fun badges for token-radar-01 (template from requirements)
3. Bundle transcripts (kit CLI) → submit via form → user approves in Phantom
4. Verify via API: status + breakdown (dev gate + judge rate)

## 9. End-to-end run (parent, 2026-11-27 ~10:52 UTC, setelah approval kit)
- `MAKEFUN_OUTPUT_DIR=out node main.ts --input ../kit/token-radar-01-kit/input/snapshot.json` — EXIT 0, wrote out/board.json, out/data.js, out/dashboard (3 files), out/screenshots (3), out/dossier.json (828.141 byte < 1,5 MiB).
- Determinisme 2 run (out vs out2): board.json md5 09593facac782d4a43fb29b778c23504 identik, data.js 20d832fe21f8e493b0904a71cf72d007 identik, dossier.json a7abfd50e4d64b1fb926305d86664ed1 identik.
- Gate checks on out/board.json: 198 rows, watchlist 40/40, ranks 1..198, implied non-increasing, 198 distinct, farm steps 6/baris 123–175 karakter.
- Screenshots out/: 1440x900, 209.031 / 205.306 / 185.613 byte (masing-masing < 512 KiB).
- Git commit b38bb09 "Hybrid radar v1: model + dashboard + screenshots".

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

## 10. v2 experiment — launch odds dari umur+pertumbuhan (2026-11-27, user approve "ok" 10:27 CST)
Perintah: `node tools/odds-experiment.mjs --input ../kit/token-radar-01-kit/input/snapshot.json`
Script: `tools/odds-experiment.mjs` (baru, self-contained, tanpa file kit). Ia
mereplikasi validasi v1 dari rumus lib/model.ts, lalu menguji `odds` sebagai
term ablated. Fit logistik P(token | log age, change_7d, prevalensi kategori)
hanya pada training split (WF: protokol listed ≤ cut 2025-01-29, n=334; LOO:
semua protokol kecuali yang dikeluarkan, 95 fit) — tanpa leakage. Gradient
descent deterministik (1000 iterasi WF / 600 LOO, tanpa randomness).
- LANGKAH 1 — reproduksi v1: wf_full=0.8949 (n=29), loo_full=0.8958 (n=95),
  kept=[peer,growth,maturity], dropped=[size] — COCOK PERSIS dengan §2.
  reproduced_v1=true, jadi angka odds di bawah dapat dipercaya.
- LANGKAH 2 — diagnostik sinyal (snapshot penuh, 758 protokol: 416 traded,
  342 pre-token, 113 null listed_at, 4 null change_7d): bobot logistik
  [intercept 0.1934, logAge +0.4353, change7d −0.3437, logitPrev +0.9148];
  log-loss logistik 0.5806 vs prevalensi-kategori saja 0.6179 vs global saja
  0.6884; mean P prediksi traded 0.6384 vs pre-token 0.4404. Sinyalnya NYATA:
  umur+growth memprediksi status token di luar prevalensi kategori (umur tua
  dan growth 7d rendah → lebih mungkin sudah bertoken).
- LANGKAH 3 — ablasi (aturan keep v1, TOL 0.005):
  - Varian A (raw P, semantik board sebenarnya): wf 0.8949 → 0.9193
    (gain −0.0244, MEMBURUK 2,4 poin); loo 0.8958 → 0.8928 (gain +0.0031).
    Verdict: **odds DROPPED** (WF gagal).
  - Varian B (relatif, P / mean P — diagnostik saja): wf 0.8949 → 0.8984
    (gain −0.0035); loo 0.8958 → 0.8865 (gain +0.0094). Campuran antar split,
    tidak robust.
- KEPUTUSAN: **PERTAHANKAN v1 (hybrid-1).** Tidak ada perubahan pada
  lib/model.ts, main.ts, dashboard, atau screenshot; tidak ada rebuild, tidak
  ada resubmit. Alasan yang terukur: target validasi adalah mcap terealisasi
  (value-if-launched) dari protokol yang sudah launch — mengalikan dengan
  P(launch) < 1 secara sistematis mengecilkan prediksi, dan sinyal umur/growth
  sudah ditangkap maturityMult + growthMult. Ini hasil yang valid, bukan
  kegagalan: eksperimen membuktikan v1 sudah benar, bukan menebak.
- Determinisme eksperimen: 2 run output identik (md5 92ca07cf4651be6bf76b9be5dfae0fd6).

## 11. F1+F2 — perbaikan audit Champion (2026-11-27, user approve 11:21 CST "Ya, terapkan F1+F2 + verifikasi ulang")
Audit Champion (builder 0d2904a6) menemukan 2 celah terbukti; F3/F4 opsional di-SKIP. Tidak ada file audit terpisah di folder bounty — perbaikan dikerjakan dari ringkasan audit + kode. Tidak ada push/bundle/submit (bagian parent).

### F1 — kalimat "Drops out of the top 10" rank-aware (dashboard/app.js, renderDetail)
- Sebelum (baris 173): satu kalimat untuk semua rank — "Drops out of the top 10 if TVL falls 20% (below $X) or a token is confirmed." Salah untuk rank 11–198 (sudah di luar top 10).
- Sesudah: variabel `mind`, bercabang pada `r.rank <= 10`:
  - Rank 1–10: kalimat lama dipertahankan verbatim.
  - Rank 11–198: "Drops further down the board if TVL falls 20% (below $X); a confirmed token removes it from the board entirely. Re-rank if 7d stays negative for two weeks."
  - Klausa "Re-rank if 7d stays negative for two weeks" dipertahankan di kedua cabang (tidak bergantung rank). Tidak ada angka baru yang diklaim — ambang 20% dan floor 0.8×TVL sama seperti sebelumnya.
- Verifikasi visual: detail #1 Steakhouse Financial menampilkan kalimat top-10 (floor $2.20B = 0.8 × $2.75B); detail #11 OpenTrade menampilkan kalimat non-top-10 (floor $193.2M = 0.8 × $241.5M). Keduanya dibaca langsung dari screenshot.

### F2 — whyLine driver-aware (lib/model.ts, baris 394)
- Sebelum: restatement template — `TVL $X · 7d Y% · Ad, no token · odds Z% · peers Px TVL`. Tidak menyebut driver apa yang menjelaskan rank.
- Sesudah: driver = adjustment multiplier (growthMult / maturityMult / sizeF) yang paling jauh dari netral (1.00) dalam log; ambang netral 2% (ln 1.02). Cabang:
  - Semua adjustment dalam 2% dari netral → "Peers value it at Px TVL · odds Z% · TVL $X · Ad, no token"
  - Growth dominan → "7d ±Y% lifts/drags value xM · peers Px · odds Z% · Ad, no token"
  - Maturity dominan → "Ad old, maturity xM drags value · peers Px · odds Z%" (maturity selalu ≤ 1.00, jadi selalu "drags")
  - Size dominan → "TVL $X earns a size premium / takes a size discount xM · peers Px · odds Z% · Ad, no token"
  - Tipe parameter `s` diperluas (sizeF, growthMult, maturityMult — sudah ada di hasil scoreOne, call site baris 658 tidak berubah). Null aman: change_7d null → growthMult 1.00 (tidak pernah jadi driver); age null → maturity 0.80 (default 365 hari).
  - Angka TIDAK berubah: hanya string `why` yang berubah; implied, odds, peerMultiple, semua multiplier, dan validasi tidak disentuh.
- Distribusi 198 baris: maturity-driven 165, growth-driven 28, peer-driven 5, size-driven 0 (sizeF selalu 1.00 karena term size di-drop validasi — cabang size ada untuk ketahanan, tidak pernah terpicu di model ini).
- Contoh Top 5 baru: #1 "543d old, maturity x0.85 drags value · peers 0.33x · odds 21%"; #3 "Peers value it at 0.75x TVL · odds 50% · TVL $320.2M · 1845d, no token". Angka multiplier terverifikasi: 543d → 0.70+543/1095×0.30 = 0.85; 1845d → min(1845,1095) → 1.00 (peer-driven).

### Verifikasi (semua diukur, 27 Nov 2026 ~17:24 UTC)
- `MAKEFUN_OUTPUT_DIR=out3a|out3b node main.ts --input ../kit/token-radar-01-kit/input/snapshot.json` — exit 0 dua kali, byte-identik: board.json md5 54a7f43b…, data.js 218e6c72…, dossier.json 621d4f00…, 830.483 byte (< 1,5 MiB).
- **Semua field numerik IDENTIK dengan v1**: perbandingan board.json v1 vs v2 per field — 0 perbedaan di luar `why` (rank, slug, TVL, change_7d, implied/low/high, odds, model.*, farm, farm_steps semua sama); `why` berubah 198/198 baris (diharapkan).
- **Validasi TIDAK BERUBAH**: walk-forward MdAPE 0.8949 (n=29; tanpa peer 0.9200, size 0.9318, growth 0.8985, maturity 0.9198); leave-one-out MdAPE 0.8958 (n=95; tanpa peer 0.8957, size 0.8697, growth 0.9063, maturity 0.9025); terms kept [peer, growth, maturity], dropped [size] — identik dengan §2/§9.
- **Dossier md5 BERUBAH dari v1 (a7abfd50 → 621d4f00) — ini diharapkan, bukan regresi**: dossier membungkus board.json + data.js (string `why` baru) + dashboard/app.js (kalimat F1 baru) + screenshot baru. Semua angka di dalamnya identik; hanya teks `why`, app.js, dan PNG yang berubah. Jangan samakan "dossier berubah" dengan "model berubah".
- Top 5 identik dengan v1: #1 Steakhouse $164.322.396, #2 Sentora $160.209.623, #3 Polymarket $119.339.368, #4 Gauntlet $97.113.761, #5 USDD $65.403.001; odds 21/21/50/21/52%.
- Screenshot baru 1440x900 (tools/shot.mjs, headless Chrome via CDP), dilihat langsung:
  - 1-board.png 209.329 byte — Top 5 + tabel menampilkan baris `why` baru; nilai cocok dengan board.json.
  - 2-detail.png 205.128 byte — detail #1: breakdown konsisten (Peer $912.4M x0.33, Size x1.00 dropped, Growth $904.4M x0.99, Maturity $767.6M x0.85, odds $164.3M x0.21), kalimat top-10 tampil, semua panel muat dalam 900px.
  - 3-filtered.png 186.899 byte — filter Category=Dexs: "21 of 198 rows", baris pertama Bittensor dTAO #6 $60.5M odds 72% (cocok §6).
  - Tambahan (verifikasi saja, di /tmp): detail #11 OpenTrade menampilkan kalimat F1 non-top-10.
  - Catatan: percobaan pertama memakai http://127.0.0.1:8123 gagal — Chrome memblokir dengan ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS (Local Network Access); keempat shot diambil ulang dengan file:// URL dan berhasil. Server lokal sudah dimatikan. Satu insiden: `pkill -f "http.server 8123"` mengenai shell saya sendiri (pola cocok dengan command line sendiri) dan mematikan exec itu sebelum bekerja — tidak ada file yang berubah; server akhirnya dimatikan via `fuser -k 8123/tcp`.
- `build/out/` di-refresh dari run final (out3a) agar konsisten dengan repo; direktori scratch out2a/out2b/out3a/out3b dihapus. Output v1 diamankan di /tmp/tr-v1-out (board 09593fac…, data 20d832fe…, dossier a7abfd50…).

### File yang berubah
- `lib/model.ts`: `whyLine` ditulis ulang (driver-aware; ~30 baris, komentar menjelaskan aturan).
- `dashboard/app.js`: kalimat "What would change my mind" jadi variabel `mind` rank-aware (2 cabang).
- `screenshots/1-board.png` (209.329 B), `2-detail.png` (205.128 B), `3-filtered.png` (186.899 B) — baru.
- `out/` (board.json, data.js, dossier.json, dashboard, screenshots) — hasil run final.
- `main.ts`, logika model, validasi, farm_steps, dan semua angka TIDAK berubah.

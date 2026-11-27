// Scratch harness for the model only (no kit files): builds the board from the
// snapshot, prints the validation record and the Top 10, and writes board.json
// + data.js to a directory. Run twice into two directories and compare md5s
// to prove determinism. Usage:
//   node tools/scratch.mjs --input <snapshot.json> --out <dir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from '../lib/model.ts';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
const input = arg('input', '');
const out = arg('out', '/tmp/scratch-out');
if (!input) { process.stderr.write('usage: node tools/scratch.mjs --input <snapshot.json> --out <dir>\n'); process.exit(2); }

const snapshot = parseSnapshot(readFileSync(input, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue) { process.stderr.write(`board issue: ${issue}\n`); process.exit(1); }
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

const v = radar.validation;
console.log(`protocols=${snapshot.protocols.length} watchlist=${snapshot.watchlist.length} board=${board.length} early=${radar.early_size} live=${radar.live_size} accounted=${JSON.stringify(radar.accounted)}`);
console.log(`validation: kept=[${v.terms_kept.join(',')}] dropped=[${v.terms_dropped.join(',')}] wf_mdape=${v.walk_forward.mdape_full} (n=${v.walk_forward.n_test}) loo_mdape=${v.leave_one_out.mdape_full} (n=${v.leave_one_out.n_test})`);
console.log(`wf_without=${JSON.stringify(v.walk_forward.mdape_without)} loo_without=${JSON.stringify(v.leave_one_out.mdape_without)}`);
const banned = ['bybit', 'bitfinex', 'robinhood', 'wbtc', 'binance-staked-eth', 'coinbase-bridge', 'bitget', 'binance-bitcoin', 'gemini', 'bitstamp'];
const top10 = board.slice(0, 10);
for (const r of top10) {
  console.log(`#${r.rank} ${r.slug} | ${r.name} | ${r.category} | tvl=${r.tvl_usd} 7d=${r.change_7d} | implied=$${r.implied_value_usd} [${r.implied_low_usd}-${r.implied_high_usd}] odds=${r.token_odds} why=${r.why}`);
}
const bad = top10.filter((r) => banned.includes(r.slug) || r.category === 'CEX');
console.log(`banned-in-top10=${bad.length} ${bad.map((r) => r.slug).join(',') || 'none'}`);
const wlCovered = snapshot.watchlist.filter((s) => board.some((r) => r.slug === s)).length;
console.log(`watchlist_covered=${wlCovered}/${snapshot.watchlist.length}`);

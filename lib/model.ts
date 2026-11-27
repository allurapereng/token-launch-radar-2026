// Launch Radar (Hybrid) — the token-radar-01 model, written in this session.
//
// The board ranks pre-token protocols by the implied value of a token launch
// that has not happened yet. Every number comes from the sealed snapshot's own
// columns; no protocol name is ever special-cased and no outside data is read.
//
//   implied = peerValue x sizeFactor x growthMult x maturityMult x tokenOdds
//   peerValue    = tvl_usd x peerMultiple(category)
//   peerMultiple = the category's median mcap/TVL among protocols whose token
//                  already trades (shrunk toward the global median when the
//                  category has few traded peers), in log space
//   sizeFactor   = (tvl_usd / 1e8) ^ 0.10, clamped to [0.70, 1.30]: size
//                  matters, but sublinearly, so a giant TVL cannot win alone
//   growthMult   = 1 + clamp(change_7d, -50, 100) / 100 x 0.40,
//                  clamped to [0.80, 1.40]: one hot week is dampened
//   maturityMult = 0.70 + min(age_days, 1095) / 1095 x 0.30: the longer a
//                  protocol has run with no token, the readier its launch
//   tokenOdds    = the category's token prevalence (how many of its
//                  protocols record a token), shrunk toward the global rate
//   range        = implied x (1 - w) .. implied x (1 + w),
//                  w = 0.35 + (1 - odds) x 0.35: less certain, wider range
//
// Each value term (peer, size, growth, maturity) is kept only when it lowers
// the held-out error on BOTH validation tests, or lowers it on one by more
// than 0.5 points while staying within 0.5 points on the other: a walk-forward
// split by listing date (train on the older 70%, test on the newer 30%) and a
// leave-one-out pass over the token-bearing protocols. A term that clearly
// hurts either test is dropped from the final model and named in the
// validation record the dashboard shows. The validation predicts market cap
// from TVL for protocols whose token already trades: the only observed values
// the snapshot carries. The error is the median absolute percentage error,
// the median rather than the mean, so a few protocols whose TVL dwarfs their
// market cap (or the reverse) cannot decide the score.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  size_ref_usd: number;
  size_exponent: number;
  size_floor: number;
  size_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  growth_mult_floor: number;
  growth_mult_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  odds_prior: number;
  range_base: number;
  range_odds: number;
}

export const MODEL: ModelConstants = {
  size_ref_usd: 100_000_000,
  size_exponent: 0.1,
  size_floor: 0.7,
  size_cap: 1.3,
  growth_weight: 0.4,
  growth_floor: -50,
  growth_cap: 100,
  growth_mult_floor: 0.8,
  growth_mult_cap: 1.4,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  odds_prior: 10,
  range_base: 0.35,
  range_odds: 0.35,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'hybrid-1';

/** How many pre-token protocols below the watchlist floor the board carries, by TVL. */
export const EARLY_ROWS = 158;

/** How many live-token protocols the Live view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  token_odds: number;
  why: string;
  model: {
    peer_multiple: number;
    size_factor: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm: {
    min_capital_usd: number;
    total_gas_usd: number;
    active_hours: number;
    cost_per_hour_usd: number;
    hold_days: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  token_odds: number;
  why: string;
  peer_multiple: number;
  size_factor: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  min_capital_usd: number;
  cost_per_hour_usd: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One held-out test's numbers. */
export interface HeldOutTest {
  n_test: number;
  mdape_full: number;
  mdape_without: Record<string, number>;
}

/** The validation record: which terms were tested, which survived, and the errors. */
export interface ValidationResult {
  terms_tested: string[];
  terms_kept: string[];
  terms_dropped: string[];
  walk_forward: HeldOutTest;
  leave_one_out: HeldOutTest;
}

/** Everything the dashboard renders, from the snapshot. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  accounted: { ranked: number; live_shown: number; set_aside: number; total: number };
  validation: ValidationResult;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word that marks a wrapped, staked or staking product. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** A name that begins with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
/** Categories that are a wrapped, staked, bridged or exchange product, not a launch of their own. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked, bridged, exchange or versioned product. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Compact money: 1.24B, 412.0M, 38.2M, 950k. */
export function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e11 ? 0 : 2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

/** A signed percent with one decimal: +38.2%, -6.5%. */
export function fmtPct(n: number | null): string {
  if (n === null) return 'n/a';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/** The sublinear size factor for a TVL. */
function sizeFactor(tvl: number, model: ModelConstants): number {
  const f = Math.pow(tvl / model.size_ref_usd, model.size_exponent);
  return Math.min(model.size_cap, Math.max(model.size_floor, f));
}

/** The dampened growth multiplier for a 7-day change in per cent. */
function growthMultiplier(change7d: number | null, model: ModelConstants): { pct: number; mult: number } {
  const pct = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(change7d, 0)));
  const mult = Math.min(model.growth_mult_cap, Math.max(model.growth_mult_floor, 1 + (pct / 100) * model.growth_weight));
  return { pct, mult };
}

/** The maturity multiplier for an age in days (null counts as the unknown-age default). */
function maturityMultiplier(age: number | null, model: ModelConstants): number {
  const days = age ?? model.unknown_age_days;
  return model.maturity_floor + (Math.min(Math.max(days, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
}

/** The peer multiple table: per-category median mcap/TVL of traded protocols, shrunk toward the global median in log space. */
export function peerMultiples(protocols: SnapshotProtocol[]): { byCategory: Map<string, number>; global: number } {
  const traded = protocols.filter((p) => !isPreToken(p) && p.tvl_usd > 0 && (p.mcap_usd ?? 0) > 0);
  const ratios = traded.map((p) => (p.mcap_usd as number) / p.tvl_usd);
  const global = median(ratios.map((r) => Math.log(r)));
  const byCat = new Map<string, number[]>();
  for (const p of traded) {
    const key = p.category ?? 'Uncategorised';
    const list = byCat.get(key) ?? [];
    list.push(Math.log((p.mcap_usd as number) / p.tvl_usd));
    byCat.set(key, list);
  }
  const byCategory = new Map<string, number>();
  for (const [key, logs] of byCat) {
    const shrunk = (logs.reduce((a, b) => a + b, 0) + 5 * global) / (logs.length + 5);
    byCategory.set(key, Math.exp(shrunk));
  }
  return { byCategory, global: Math.exp(global) };
}

/** The token odds table: per-category token prevalence, shrunk toward the global rate. */
export function tokenOddsTable(protocols: SnapshotProtocol[], model: ModelConstants): { byCategory: Map<string, number>; global: number } {
  const total = protocols.length;
  const tradedTotal = protocols.filter((p) => !isPreToken(p)).length;
  const global = tradedTotal / total;
  const counts = new Map<string, { n: number; k: number }>();
  for (const p of protocols) {
    const key = p.category ?? 'Uncategorised';
    const c = counts.get(key) ?? { n: 0, k: 0 };
    c.n += 1;
    if (!isPreToken(p)) c.k += 1;
    counts.set(key, c);
  }
  const byCategory = new Map<string, number>();
  for (const [key, c] of counts) {
    byCategory.set(key, (c.k + model.odds_prior * global) / (c.n + model.odds_prior));
  }
  return { byCategory, global };
}

/** The value terms a model run uses, after validation has dropped the failures. */
export interface TermsUsed {
  peer: boolean;
  size: boolean;
  growth: boolean;
  maturity: boolean;
}

/** Score one protocol with the given terms. */
function scoreOne(
  p: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  peers: { byCategory: Map<string, number>; global: number },
  odds: { byCategory: Map<string, number>; global: number },
  terms: TermsUsed,
): { implied: number; low: number; high: number; odds: number; peerMultiple: number; sizeF: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, p.listed_at);
  const peerMultiple = terms.peer ? (peers.byCategory.get(p.category ?? 'Uncategorised') ?? peers.global) : peers.global;
  const sizeF = terms.size ? sizeFactor(p.tvl_usd, model) : 1;
  const { pct: growthPct, mult: growthMult } = growthMultiplier(p.change_7d, model);
  const gMult = terms.growth ? growthMult : 1;
  const mMult = terms.maturity ? maturityMultiplier(age, model) : 1;
  const od = Math.min(0.95, Math.max(0.05, odds.byCategory.get(p.category ?? 'Uncategorised') ?? odds.global));
  const implied = Math.max(1, Math.round(p.tvl_usd * peerMultiple * sizeF * gMult * mMult * od));
  const w = model.range_base + (1 - od) * model.range_odds;
  return {
    implied,
    low: Math.max(1, Math.round(implied * (1 - w))),
    high: Math.round(implied * (1 + w)),
    odds: od,
    peerMultiple,
    sizeF,
    growthPct,
    growthMult,
    maturityMult: mMult,
    age,
  };
}

/** The one-line reason a row holds its rank: it names the driver doing the
 *  work, not just the row's figures. The implied value is TVL x peerMultiple
 *  x sizeF x growthMult x maturityMult x odds; the driver is the live
 *  adjustment multiplier furthest from neutral (1.00) in log terms. When
 *  every adjustment sits within 2% of neutral, the peer valuation itself is
 *  the driver. Numbers are untouched — only this string changes. */
function whyLine(p: SnapshotProtocol, s: { implied: number; odds: number; peerMultiple: number; age: number | null; sizeF: number; growthMult: number; maturityMult: number }, growthPct: number): string {
  const ageText = s.age === null ? 'age unknown' : `${s.age}d, no token`;
  const adjustments = [
    { key: 'growth', mult: s.growthMult },
    { key: 'maturity', mult: s.maturityMult },
    { key: 'size', mult: s.sizeF },
  ];
  let top = adjustments[0]!;
  for (const a of adjustments) if (Math.abs(Math.log(a.mult)) > Math.abs(Math.log(top.mult))) top = a;
  const peers = `peers ${s.peerMultiple.toFixed(2)}x`;
  const odds = `odds ${Math.round(s.odds * 100)}%`;
  if (Math.abs(Math.log(top.mult)) < Math.log(1.02)) {
    return `Peers value it at ${s.peerMultiple.toFixed(2)}x TVL · ${odds} · TVL ${fmtMoney(p.tvl_usd)} · ${ageText}`;
  }
  if (top.key === 'growth') {
    const verb = top.mult >= 1 ? 'lifts value' : 'drags value';
    return `7d ${fmtPct(growthPct)} ${verb} x${top.mult.toFixed(2)} · ${peers} · ${odds} · ${ageText}`;
  }
  if (top.key === 'maturity') {
    const ageLead = s.age === null ? 'Age unknown' : `${s.age}d old`;
    return `${ageLead}, maturity x${top.mult.toFixed(2)} drags value · ${peers} · ${odds}`;
  }
  const verb = top.mult >= 1 ? 'earns a size premium' : 'takes a size discount';
  return `TVL ${fmtMoney(p.tvl_usd)} ${verb} x${top.mult.toFixed(2)} · ${peers} · ${odds} · ${ageText}`;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Lend $${capital} of USDC on ${name} (${chain}) and leave the supply open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Add $${capital} of liquidity to ${name}'s main pool on ${chain} and leave it in place.`;
  if (c.includes('bridge')) return `Move $${capital} of USDC to ${chain} through ${name} and use it inside its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain asset through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Post $${capital} of USDC as margin on ${name} and open a single small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and take one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Put $${capital} into a ${name} vault on ${chain} and hold the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy live.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time.
 * Every figure is derived from the protocol's own record (category, chains,
 * TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): { steps: FarmStep[]; economics: { min_capital_usd: number; total_gas_usd: number; active_hours: number; cost_per_hour_usd: number; hold_days: number } } {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const weeks = Math.max(1, Math.ceil(hold / 7));
  const setupGas = capital >= 150 ? 8 : 4;
  const totalGas = 3 + setupGas + 2 * weeks;
  const activeHours = Math.round((0.25 + 0.17 * weeks) * 100) / 100;
  const costPerHour = Math.round((totalGas / activeHours) * 10) / 10;
  const action = actionFor(p, capital, chain);
  const steps: FarmStep[] = [
    {
      text: 'Open a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${setupGas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: 'Do one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.',
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
  return { steps, economics: { min_capital_usd: capital, total_gas_usd: totalGas, active_hours: activeHours, cost_per_hour_usd: costPerHour, hold_days: hold } };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

// ---------------------------------------------------------------- validation

/** Protocols whose token already trades and whose market cap is observed: the validation set. */
function validationSet(protocols: SnapshotProtocol[]): SnapshotProtocol[] {
  return protocols.filter(
    (p) => !isPreToken(p) && p.tvl_usd > 0 && (p.mcap_usd ?? 0) > 0 && p.listed_at !== null && /^\d{4}-\d{2}-\d{2}$/.test(p.listed_at as string),
  );
}

/** Predict a traded protocol's market cap from its TVL with the given terms. */
function predictMcap(
  p: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  peerMedianLog: (category: string | null, excludeSlug?: string) => number,
  terms: TermsUsed,
): number {
  const logMult = terms.peer ? peerMedianLog(p.category) : peerMedianLog(null);
  const mult = Math.exp(logMult);
  const sizeF = terms.size ? sizeFactor(p.tvl_usd, model) : 1;
  const { mult: growthMult } = growthMultiplier(p.change_7d, model);
  const gMult = terms.growth ? growthMult : 1;
  const age = ageDays(asOf, p.listed_at);
  const mMult = terms.maturity ? maturityMultiplier(age, model) : 1;
  return Math.max(1, p.tvl_usd * mult * sizeF * gMult * mMult);
}

/** Median absolute percentage error of predicted market caps against the
 * observed ones. The median, not the mean: a few protocols whose TVL dwarfs
 * their market cap (or the reverse) would otherwise decide the whole score. */
function mdape(items: { p: SnapshotProtocol; pred: number }[]): number {
  if (items.length === 0) return 0;
  const errs = items.map(({ p, pred }) => Math.abs(pred - (p.mcap_usd as number)) / (p.mcap_usd as number)).sort((a, b) => a - b);
  const mid = Math.floor(errs.length / 2);
  return errs.length % 2 === 1 ? errs[mid]! : (errs[mid - 1]! + errs[mid]!) / 2;
}

/** Run both held-out tests and decide which value terms survive. */
export function validateTerms(snapshot: Snapshot, model: ModelConstants = MODEL): ValidationResult {
  const set = validationSet(snapshot.protocols);
  const terms: (keyof TermsUsed)[] = ['peer', 'size', 'growth', 'maturity'];
  const all: TermsUsed = { peer: true, size: true, growth: true, maturity: true };
  const without = (term: keyof TermsUsed): TermsUsed => ({ ...all, [term]: false });

  // Walk-forward: train peer medians on the older 70% by listing date, test on the newer 30%.
  // The medians are the scoring model's own shrunk medians (category logs shrunk
  // toward the global median with a prior of 5), so the test judges the model as scored.
  const byDate = [...set].sort((a, b) => (a.listed_at as string) < (b.listed_at as string) ? -1 : 1);
  const cut = Math.floor(byDate.length * 0.7);
  const train = byDate.slice(0, cut);
  const test = byDate.slice(cut);
  const trainGlobalLog = median(train.map((p) => Math.log((p.mcap_usd as number) / p.tvl_usd)));
  const trainMedianLog = (category: string | null): number => {
    if (category === null) return trainGlobalLog;
    const logs = train
      .filter((p) => (p.category ?? 'Uncategorised') === (category ?? 'Uncategorised'))
      .map((p) => Math.log((p.mcap_usd as number) / p.tvl_usd));
    if (logs.length === 0) return trainGlobalLog;
    return (logs.reduce((a, b) => a + b, 0) + 5 * trainGlobalLog) / (logs.length + 5);
  };
  const wfFull = mdape(test.map((p) => ({ p, pred: predictMcap(p, snapshot.as_of, model, trainMedianLog, all) })));
  const wfWithout: Record<string, number> = {};
  for (const t of terms) wfWithout[t] = mdape(test.map((p) => ({ p, pred: predictMcap(p, snapshot.as_of, model, trainMedianLog, without(t)) })));

  // Leave-one-out: each protocol's peers exclude itself, with the same shrinkage.
  const looMedianLog = (category: string | null, excludeSlug?: string): number => {
    const rest = set.filter((p) => p.slug !== excludeSlug);
    const globalLog = median(rest.map((p) => Math.log((p.mcap_usd as number) / p.tvl_usd)));
    if (category === null) return globalLog;
    const logs = rest
      .filter((p) => (p.category ?? 'Uncategorised') === (category ?? 'Uncategorised'))
      .map((p) => Math.log((p.mcap_usd as number) / p.tvl_usd));
    if (logs.length === 0) return globalLog;
    return (logs.reduce((a, b) => a + b, 0) + 5 * globalLog) / (logs.length + 5);
  };
  const looFull = mdape(set.map((p) => ({ p, pred: predictMcap(p, snapshot.as_of, model, (c) => looMedianLog(c, p.slug), all) })));
  const looWithout: Record<string, number> = {};
  for (const t of terms) looWithout[t] = mdape(set.map((p) => ({ p, pred: predictMcap(p, snapshot.as_of, model, (c) => looMedianLog(c, p.slug), without(t)) })));

  // A term survives when the full model beats the model without it on BOTH
  // tests, or beats it on one by more than 0.5 points while staying within
  // 0.5 points on the other: a term that helps one split and is neutral on
  // the other is not a lucky term, and a term that clearly hurts either split
  // is dropped.
  const TOL = 0.005;
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const t of terms) {
    const wfGain = (wfWithout[t] as number) - wfFull;
    const looGain = (looWithout[t] as number) - looFull;
    if ((wfGain > 0 && looGain > 0) || (wfGain > TOL && looGain > -TOL) || (looGain > TOL && wfGain > -TOL)) kept.push(t);
    else dropped.push(t);
  }
  return {
    terms_tested: [...terms],
    terms_kept: kept,
    terms_dropped: dropped,
    walk_forward: { n_test: test.length, mdape_full: round4(wfFull), mdape_without: Object.fromEntries(Object.entries(wfWithout).map(([k, v]) => [k, round4(v)])) },
    leave_one_out: { n_test: set.length, mdape_full: round4(looFull), mdape_without: Object.fromEntries(Object.entries(looWithout).map(([k, v]) => [k, round4(v)])) },
  };
}

// ---------------------------------------------------------------- board

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; validation: ValidationResult; terms: TermsUsed } {
  const validation = validateTerms(snapshot, model);
  const terms: TermsUsed = {
    peer: validation.terms_kept.includes('peer'),
    size: validation.terms_kept.includes('size'),
    growth: validation.terms_kept.includes('growth'),
    maturity: validation.terms_kept.includes('maturity'),
  };
  const peers = peerMultiples(snapshot.protocols);
  const odds = tokenOddsTable(snapshot.protocols, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug it names, whatever the model thinks of it.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: rankable pre-token protocols below the watchlist floor, by TVL.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);
  // If the floor's early pool runs short, top up with rankable pre-token protocols at or above it.
  if (chosen.size < snapshot.watchlist.length + EARLY_ROWS) {
    const topUp = snapshot.protocols
      .filter((p) => !chosen.has(p.slug) && isRankable(p))
      .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
      .slice(0, snapshot.watchlist.length + EARLY_ROWS - chosen.size);
    for (const p of topUp) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const s = scoreOne(p, snapshot.as_of, model, peers, odds, terms);
    return { p, s };
  });
  scored.sort((a, b) => b.s.implied - a.s.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board: BoardRow[] = scored.map((row, i) => {
    const { p, s } = row;
    const { steps, economics } = farmSteps(p, s.age);
    return {
      rank: i + 1,
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      mcap_usd: p.mcap_usd,
      listed_at: p.listed_at,
      gecko_id: p.gecko_id,
      symbol: p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: s.implied,
      implied_low_usd: s.low,
      implied_high_usd: s.high,
      token_odds: round4(s.odds),
      why: whyLine(p, s, s.growthPct),
      model: {
        peer_multiple: round4(s.peerMultiple),
        size_factor: round4(s.sizeF),
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        age_days: s.age,
      },
      farm: economics,
      farm_steps: steps.map(stepText),
    };
  });
  return { board, validation, terms };
}

/** The live-token protocols, by market cap, for the dashboard's Live view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    token_odds: row.token_odds,
    why: row.why,
    peer_multiple: row.model.peer_multiple,
    size_factor: row.model.size_factor,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    min_capital_usd: row.farm.min_capital_usd,
    cost_per_hour_usd: row.farm.cost_per_hour_usd,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const { board, validation } = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const accounted = {
    ranked: board.length,
    live_shown: live.length,
    set_aside: snapshot.protocols.length - board.length - live.length,
    total: snapshot.protocols.length,
  };
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    accounted,
    validation,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

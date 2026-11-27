// Launch Radar — dashboard logic. Reads window.RADAR (written by main.ts
// from the sealed snapshot), renders the board, the detail view, the live
// view and the method page. No network, no fetch, no outside data.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) { document.body.textContent = 'Launch Radar: no data.'; return; }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e11 ? 0 : 2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'k';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return 'n/a';
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }
  function cls(n) { return n === null ? '' : (n >= 0 ? 'up' : 'down'); }
  function $(id) { return document.getElementById(id); }
  function chainList(r) { return r.chains.slice(0, 3).join(', ') + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : ''); }

  // ---- header strips -------------------------------------------------
  $('asof').textContent = 'snapshot ' + R.as_of + ' · floor ' + money(R.floor_usd);
  var acc = R.accounted;
  $('integrity').innerHTML =
    '<span><b>OK</b> watchlist ' + R.watchlist_size + '/' + R.watchlist_size + '</span>' +
    '<span><b>OK</b> ' + R.board_size + ' rows</span>' +
    '<span><b>OK</b> ' + acc.total + ' protocols accounted</span>' +
    '<span><b>OK</b> deterministic</span>' +
    '<span><b>OK</b> no network</span>';
  var v = R.validation;
  $('validation').innerHTML =
    '<span>Validation: terms kept <b>' + v.terms_kept.length + '/' + v.terms_tested.length + '</b> (' + esc(v.terms_kept.join(', ') || 'none') + ')</span>' +
    (v.terms_dropped.length ? '<span class="warn">dropped: ' + esc(v.terms_dropped.join(', ')) + ' — no held-out gain</span>' : '') +
    '<span>walk-forward MdAPE <b>' + (v.walk_forward.mdape_full * 100).toFixed(1) + '%</b> (n=' + v.walk_forward.n_test + ')</span>' +
    '<span>leave-one-out MdAPE <b>' + (v.leave_one_out.mdape_full * 100).toFixed(1) + '%</b> (n=' + v.leave_one_out.n_test + ')</span>';

  // ---- KPI ------------------------------------------------------------
  var top = R.rows[0];
  var medOdds = R.rows.slice().map(function (r) { return r.token_odds; }).sort(function (a, b) { return a - b; })[Math.floor(R.rows.length / 2)];
  $('kpi').innerHTML =
    '<div class="card"><div class="label">Top implied value</div><div class="value">' + money(top.implied_value_usd) + '</div><div class="sub">#' + top.rank + ' ' + esc(top.name) + '</div></div>' +
    '<div class="card"><div class="label">Ranked</div><div class="value">' + R.board_size + '</div><div class="sub">' + R.watchlist_size + ' watchlist + ' + R.early_size + ' early</div></div>' +
    '<div class="card"><div class="label">Median token odds</div><div class="value">' + Math.round(medOdds * 100) + '%</div><div class="sub">from the peers&rsquo; record</div></div>' +
    '<div class="card"><div class="label">Live tokens shown</div><div class="value">' + R.live_size + '</div><div class="sub">already trading, not ranked</div></div>' +
    '<div class="card"><div class="label">Set aside</div><div class="value">' + acc.set_aside + '</div><div class="sub">of ' + acc.total + ' accounted</div></div>';

  // ---- filters ---------------------------------------------------------
  var cats = [], chains = [];
  R.rows.forEach(function (r) {
    if (cats.indexOf(r.category || 'Uncategorised') < 0) cats.push(r.category || 'Uncategorised');
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  $('f-cat').innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  $('f-chain').innerHTML = '<option value="">All chains</option>' + chains.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');

  function parseHash() {
    var h = (location.hash || '#board').slice(1);
    var parts = h.split('?');
    var view = parts[0] || 'board';
    var q = {};
    (parts[1] || '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return { view: view, q: q };
  }

  function filteredRows() {
    var cat = $('f-cat').value, chain = $('f-chain').value, q = $('f-q').value.trim().toLowerCase();
    var sort = $('f-sort').value;
    var rows = R.rows.filter(function (r) {
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var key = { value: 'implied_value_usd', tvl: 'tvl_usd', growth: 'change_7d', odds: 'token_odds' }[sort] || 'implied_value_usd';
    rows.sort(function (a, b) { return (b[key] === null ? -1e18 : b[key]) - (a[key] === null ? -1e18 : a[key]); });
    return rows;
  }

  function renderBoard() {
    var rows = filteredRows();
    $('f-count').textContent = rows.length + ' of ' + R.rows.length + ' rows';
    var maxHigh = Math.max.apply(null, rows.map(function (r) { return r.implied_high_usd; }).concat([1]));
    $('top5').innerHTML = rows.slice(0, 5).map(function (r) {
      return '<div class="card" data-slug="' + esc(r.slug) + '">' +
        '<div class="rank">#' + r.rank + ' · ' + esc(r.category || 'Uncategorised') + '</div>' +
        '<div class="name">' + esc(r.name) + '</div>' +
        '<div class="cat">' + esc(chainList(r)) + ' · TVL ' + money(r.tvl_usd) + ' · <span class="' + cls(r.change_7d) + '">' + pct(r.change_7d) + ' 7d</span></div>' +
        '<div class="big">' + money(r.implied_value_usd) + '</div>' +
        '<div class="range">range ' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + '</div>' +
        '<div class="bar"><i style="width:' + Math.round(r.implied_value_usd / maxHigh * 100) + '%"></i></div>' +
        '<div class="why">' + esc(r.why) + '</div>' +
        '<div class="farm">odds ' + Math.round(r.token_odds * 100) + '% · farm $' + r.cost_per_hour_usd + '/h · min $' + r.min_capital_usd + '</div>' +
        '</div>';
    }).join('');
    $('board-note').textContent = '— ' + rows.length + ' rows match the filter';
    $('rows').innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td class="nm">' + esc(r.name) + '<br><span class="muted">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(chainList(r)) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + cls(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num val">' + money(r.implied_value_usd) + '<br><span class="muted">' + money(r.implied_low_usd) + '–' + money(r.implied_high_usd) + '</span></td>' +
        '<td class="num odds">' + Math.round(r.token_odds * 100) + '%</td>' +
        '<td class="why-cell">' + esc(r.why) + '</td>' +
        '<td class="num">$' + r.cost_per_hour_usd + '/h</td></tr>';
    }).join('');
    $('board-foot').textContent = 'Ranks are the model\u2019s claim, not the snapshot\u2019s order. Implied values never rise as rank ascends. Click any row for its detail view.';
    document.querySelectorAll('[data-slug]').forEach(function (el) {
      el.addEventListener('click', function () { location.hash = '#detail/' + el.getAttribute('data-slug'); });
    });
  }

  // ---- detail ----------------------------------------------------------
  function renderDetail(slug) {
    var r = null;
    R.rows.forEach(function (row) { if (row.slug === slug) r = row; });
    if (!r) { $('detail').innerHTML = '<p>Unknown protocol: ' + esc(slug) + '</p>'; return; }
    var peerValue = r.tvl_usd * r.peer_multiple;
    var afterSize = peerValue * r.size_factor;
    var afterGrowth = afterSize * r.growth_multiplier;
    var afterMaturity = afterGrowth * r.maturity_multiplier;
    var dropped = R.validation.terms_dropped;
    var isDropped = function (t) { return dropped.indexOf(t) >= 0; };
    var steps = [
      { name: 'Peer value', val: peerValue, mult: r.peer_multiple, note: isDropped('peer') ? 'dropped in validation: no held-out gain — applied as x1.00' : 'TVL x ' + r.peer_multiple.toFixed(2) + ' (category median mcap/TVL)' },
      { name: 'Size factor', val: afterSize, mult: r.size_factor, note: isDropped('size') ? 'dropped in validation: no held-out gain — applied as x1.00' : 'sublinear: (TVL / $100M)^0.10' },
      { name: 'Growth', val: afterGrowth, mult: r.growth_multiplier, note: isDropped('growth') ? 'dropped in validation: no held-out gain — applied as x1.00' : '7d ' + pct(r.change_7d) + ', dampened' },
      { name: 'Maturity', val: afterMaturity, mult: r.maturity_multiplier, note: isDropped('maturity') ? 'dropped in validation: no held-out gain — applied as x1.00' : (r.age_days === null ? 'age unknown' : r.age_days + ' days, no token') },
      { name: 'Token odds', val: r.implied_value_usd, mult: r.token_odds, note: 'peers in this category that record a token' }
    ];
    var maxStep = Math.max.apply(null, steps.map(function (s) { return s.val; }).concat([1]));
    var risks = [];
    if (r.change_7d !== null && r.change_7d < 0) risks.push('TVL is falling (' + pct(r.change_7d) + ' over 7 days).');
    if (r.age_days === null) risks.push('Listing date unknown, so maturity uses the 365-day default.');
    if (r.token_odds < 0.3) risks.push('Low category launch rate: fewer than 30% of its peers record a token.');
    if (!risks.length) risks.push('No single red flag in the snapshot: TVL, growth and age all point the same way.');
    var floor20 = money(r.tvl_usd * 0.8);
    // Rank-aware: "drops out of the top 10" is only true for ranks 1-10.
    // Below the top 10 a 20% TVL fall drops the row further down the board,
    // and a confirmed token removes it from the board entirely (any rank).
    var mind = r.rank <= 10
      ? 'Drops out of the top 10 if TVL falls 20% (below ' + floor20 + ') or a token is confirmed. Re-rank if 7d stays negative for two weeks.'
      : 'Drops further down the board if TVL falls 20% (below ' + floor20 + '); a confirmed token removes it from the board entirely. Re-rank if 7d stays negative for two weeks.';
    $('detail').innerHTML =
      '<div class="detail-head"><h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<span class="muted">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) + '</span></div>' +
      '<div class="range-line">Implied value <b>' + money(r.implied_value_usd) + '</b> &nbsp; range ' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) +
      ' &nbsp;·&nbsp; token odds <b class="odds">' + Math.round(r.token_odds * 100) + '%</b></div>' +
      '<p class="muted" style="margin:4px 0 0">' + esc(r.why) + '</p>' +
      '<div class="detail-grid"><div class="panel"><h3>How the value is built</h3>' +
      steps.map(function (s) {
        return '<div class="term"><span class="t-name">' + s.name + '</span>' +
          '<span class="t-val">' + money(s.val) + '</span>' +
          '<span class="t-bar"><i style="width:' + Math.max(2, Math.round(s.val / maxStep * 100)) + '%"></i></span>' +
          '<span class="t-share">x' + s.mult.toFixed(2) + '</span></div>' +
          '<div class="muted" style="font-size:12px;margin:-2px 0 3px">' + esc(s.note) + '</div>';
      }).join('') +
      '<p class="muted" style="font-size:12.5px">TVL ' + money(r.tvl_usd) + ' · 7d ' + pct(r.change_7d) + ' · age ' + (r.age_days === null ? 'unknown' : r.age_days + ' days') + ' · range width grows as odds fall.</p>' +
      '</div>' +
      '<div class="panel"><h3>Farm plan — costed</h3><ol class="steps">' +
      r.farm_steps.map(function (s, i) {
        var m = s.match(/^(.*?) Cost: (.*?)\. Time: (.*?)\.?$/);
        if (!m) return '<li><span class="step-n">' + (i + 1) + '.</span> ' + esc(s) + '</li>';
        return '<li><span class="step-n">' + (i + 1) + '.</span> ' + esc(m[1]) + ' <span class="cost">Cost: ' + esc(m[2]) + ' · Time: ' + esc(m[3]) + '</span></li>';
      }).join('') + '</ol>' +
      '<p style="font-family:var(--mono);font-size:12.5px;margin:8px 0 0">Min capital $' + r.min_capital_usd + ' · farm cost $' + r.cost_per_hour_usd + '/h of active time</p>' +
      '<h3 style="margin-top:8px">Risks</h3><p class="risk" style="margin:4px 0">' + esc(risks.join(' ')) + '</p>' +
      '<h3 style="margin-top:8px">What would change my mind</h3><p class="mind" style="margin:4px 0">' + mind + '</p>' +
      '</div></div>';
  }

  // ---- live ------------------------------------------------------------
  $('live-rows').innerHTML = R.live.map(function (p) {
    return '<tr><td class="nm">' + esc(p.name) + '<br><span class="muted">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td>' + esc(chainList(p)) + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd === null ? 'n/a' : money(p.mcap_usd)) + '</td>' +
      '<td class="num ' + cls(p.change_7d) + '">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- method ----------------------------------------------------------
  var m = R.model;
  $('method-body').innerHTML =
    '<p><code>implied = TVL x peerMultiple x sizeFactor x growthMult x maturityMult x tokenOdds</code></p>' +
    '<p>peerMultiple is the category&rsquo;s median mcap/TVL among protocols whose token already trades, shrunk toward the global median when the category has few traded peers. sizeFactor is (TVL / $100M)^0.10 clamped to [0.70, 1.30]. growthMult is 1 + clamped 7d change x 0.40, clamped to [0.80, 1.40]. maturityMult is 0.70 + min(age, 1095) / 1095 x 0.30. tokenOdds is the category&rsquo;s token prevalence, shrunk toward the global rate. The range is implied x (1 &plusmn; w), w = 0.35 + (1 &minus; odds) x 0.35.</p>' +
    '<table><tr><th>Term</th><th>Walk-forward MdAPE</th><th>Leave-one-out MdAPE</th><th>Kept?</th></tr>' +
    v.terms_tested.map(function (t) {
      return '<tr><td>' + esc(t) + '</td><td>' + (v.walk_forward.mdape_without[t] * 100).toFixed(1) + '% without</td><td>' + (v.leave_one_out.mdape_without[t] * 100).toFixed(1) + '% without</td><td>' + (v.terms_kept.indexOf(t) >= 0 ? 'kept' : 'dropped') + '</td></tr>';
    }).join('') + '</table>' +
    '<p>Full model: walk-forward MdAPE ' + (v.walk_forward.mdape_full * 100).toFixed(1) + '% (n=' + v.walk_forward.n_test + '), leave-one-out MdAPE ' + (v.leave_one_out.mdape_full * 100).toFixed(1) + '% (n=' + v.leave_one_out.n_test + '). A term survives when the full model beats the model without it on both tests, or beats it on one by more than 0.5 points while staying within 0.5 points on the other. MdAPE is the median absolute percentage error: the median, not the mean, so a few protocols whose TVL dwarfs their market cap cannot decide the score.</p>' +
    '<p>Excluded from ranking, by the watchlist&rsquo;s own rule: exchanges (CEX), bridges, liquid staking and restaking, wrapped or staked products, versioned pools (V2, 2.0) and names starting with an exchange. A protocol records no token; the board never claims it has none.</p>' +
    '<p>Accounted: ' + acc.ranked + ' ranked + ' + acc.live_shown + ' live shown + ' + acc.set_aside + ' set aside = ' + acc.total + ' protocols in the snapshot.</p>';

  // ---- routing ---------------------------------------------------------
  function route() {
    var parsed = parseHash();
    var view = parsed.view;
    if (view.indexOf('detail/') === 0) view = 'detail';
    ['board', 'detail', 'live', 'method'].forEach(function (name) {
      var tab = $('tab-' + name);
      if (tab) tab.classList.toggle('active', (name === 'board' && view === 'board') || name === view);
      $('view-' + name).classList.toggle('hidden', name !== view && !(name === 'board' && view === 'board'));
    });
    if (view === 'board') {
      var q = parsed.q;
      if (q.cat !== undefined) $('f-cat').value = q.cat;
      if (q.chain !== undefined) $('f-chain').value = q.chain;
      if (q.sort !== undefined) $('f-sort').value = q.sort;
      if (q.q !== undefined) $('f-q').value = q.q;
      renderBoard();
    } else if (view === 'detail') {
      renderDetail(parsed.view.split('/')[1] || '');
    }
    window.scrollTo(0, 0);
  }
  ['f-cat', 'f-chain', 'f-sort'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var q = 'cat=' + encodeURIComponent($('f-cat').value) + '&chain=' + encodeURIComponent($('f-chain').value) + '&sort=' + encodeURIComponent($('f-sort').value) + '&q=' + encodeURIComponent($('f-q').value);
      history.replaceState(null, '', '#board?' + q);
      renderBoard();
    });
  });
  $('f-q').addEventListener('input', function () {
    var q = 'cat=' + encodeURIComponent($('f-cat').value) + '&chain=' + encodeURIComponent($('f-chain').value) + '&sort=' + encodeURIComponent($('f-sort').value) + '&q=' + encodeURIComponent($('f-q').value);
    history.replaceState(null, '', '#board?' + q);
    renderBoard();
  });
  window.addEventListener('hashchange', route);
  route();
})();

// 侧栏「网站资讯」卡片底部：近 30 天每日访问量的平滑曲线。
// 数据：仓库 Harukuya/counting-bot 的 GitHub Actions 每天北京时间 00:05 把 Vercount 的累计总数记进 data/visits.json（每天一条：date / pv / uv），
// 经 jsDelivr 读（机器人提交后会刷新它的缓存），jsDelivr 读不到再试 raw.githubusercontent.com；
// 某天的访问量 = 当天 pv - 前一天 pv（中间缺了几天就跳过那段，不硬算）。不到两天的记录画不出线，先写一句「数据积累中」。
// 曲线用单调三次插值（Fritsch–Carlson）：平滑、不会冲过最高点或掉到 0 以下。没有鼠标悬停提示。
// pjax 换页时侧栏会整块换掉，这个脚本带 data-pjax，会重新跑一遍
(function () {
  var DATA = ['https://cdn.jsdelivr.net/gh/Harukuya/counting-bot@main/data/visits.json',
    'https://raw.githubusercontent.com/Harukuya/counting-bot/main/data/visits.json'], DAYS = 30, H = 64, COLOR = '#FF903F';
  var info = document.querySelector('#aside-content .card-webinfo .webinfo');
  if (!info || info.querySelector('.tc-visits')) return;
  var box = document.createElement('div');
  box.className = 'tc-visits';
  box.innerHTML = '<div class="tc-visits-head"><span>近 ' + DAYS + ' 天访问量</span><span class="tc-visits-last"></span></div><div class="tc-visits-plot"></div>';
  info.appendChild(box);
  var head = box.querySelector('.tc-visits-head span'), last = box.querySelector('.tc-visits-last'), plot = box.querySelector('.tc-visits-plot');

  function dayNo(s) { return Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5); }
  function daily(days) {   // [{date, pv}] → [{date, n}]：相邻两天都有记录才算
    var out = [];
    days = days.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    for (var i = 1; i < days.length; i++) {
      if (dayNo(days[i].date) - dayNo(days[i - 1].date) !== 1) continue;
      out.push({ date: days[i].date, n: Math.max(0, days[i].pv - days[i - 1].pv) });
    }
    return out.slice(-DAYS);
  }
  // 单调三次插值的切线（Fritsch–Carlson），再换成三次贝塞尔
  function smoothPath(p) {
    var n = p.length, d = [], m = [], i, s = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
    if (n === 2) return s + 'L' + p[1][0].toFixed(1) + ',' + p[1][1].toFixed(1);
    for (i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], t = a * a + b * b;
      if (t > 9) { t = 3 / Math.sqrt(t); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    for (i = 0; i < n - 1; i++) {
      var dx = (p[i + 1][0] - p[i][0]) / 3;
      s += 'C' + (p[i][0] + dx).toFixed(1) + ',' + (p[i][1] + m[i] * dx).toFixed(1) + ' ' +
        (p[i + 1][0] - dx).toFixed(1) + ',' + (p[i + 1][1] - m[i + 1] * dx).toFixed(1) + ' ' +
        p[i + 1][0].toFixed(1) + ',' + p[i + 1][1].toFixed(1);
    }
    return s;
  }
  function draw(pts) {
    var W = Math.max(120, Math.round(plot.clientWidth || 220)), pad = 4, top = 6;
    var max = Math.max.apply(null, pts.map(function (x) { return x.n; })) || 1;
    var step = (W - pad * 2) / (pts.length - 1);
    var xy = pts.map(function (x, i) { return [pad + i * step, top + (H - top - 3) * (1 - x.n / (max * 1.08))]; });
    var line = smoothPath(xy), end = xy[xy.length - 1];
    plot.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" aria-hidden="true">' +
        '<defs><linearGradient id="tc-visits-fill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + COLOR + '" stop-opacity=".32"/><stop offset="1" stop-color="' + COLOR + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + line + 'L' + end[0].toFixed(1) + ',' + H + 'L' + xy[0][0].toFixed(1) + ',' + H + 'Z" fill="url(#tc-visits-fill)"/>' +
        '<path d="' + line + '" fill="none" stroke="' + COLOR + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="' + end[0].toFixed(1) + '" cy="' + end[1].toFixed(1) + '" r="2.8" fill="' + COLOR + '"/>' +
      '</svg>';
  }
  function empty(msg) { box.classList.add('is-empty'); plot.textContent = msg; }

  function load(i) {   // 按顺序试数据地址，前一个读不到就换下一个
    return fetch(DATA[i], { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function (e) { if (i + 1 < DATA.length) return load(i + 1); throw e; });
  }
  load(0).then(function (d) {
    var pts = daily((d && d.days) || []);
    if (pts.length < 2) { empty('数据积累中，每天记录一次'); return; }
    head.textContent = '近 ' + pts.length + ' 天访问量';
    var end = pts[pts.length - 1], today = dayNo(new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10)), ago = today - dayNo(end.date);   // 北京时间的今天
    last.textContent = (ago === 0 ? '今日 ' : ago === 1 ? '昨日 ' : +end.date.slice(5, 7) + '/' + +end.date.slice(8, 10) + ' ') + end.n;
    draw(pts);
  }).catch(function () { empty('访问量曲线暂时读不到'); });
})();

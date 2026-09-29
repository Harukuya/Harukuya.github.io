// 03-cafe-room：房子本身（画进「房间」那块底色 A）+ 房间的光
// 天花板：深色木板 + 几根往镜头方向伸出来的木梁（一点透视）+ 贴着后墙的一道横梁；
// 左三列：一整面钢框落地窗（四扇大窗 + 上面一排对半分的小窗，玻璃是空的——透出后面那层窗外），窗台一道木沿，窗下一截木护墙板；
// 窗右边一根砖柱，再往右是整面红砖墙（吧台那边）；地面：木地板（一点透视的长条板，错缝），小圆桌下一块红地毯、沙发下一块圆的绿地毯。
// 光：天花板和墙角压暗；白天 / 清晨 / 黄昏太阳从窗外左上方照进来——地板上一格格窗形的光斑，空气里一道道斜光（ctx.shafts 给浮尘用）。
(function (PX) {
  'use strict';

  PX.need('03-cafe-room', ['cafeDepth', 'cafeFloorAt', 'cafeRnd', 'cafeShade']);
  var cafeDepth = PX.cafeDepth, floorAt = PX.cafeFloorAt, rnd = PX.cafeRnd, shade = PX.cafeShade;

  var WOOD_CEIL = ['#5d4130', '#654735', '#573c2c'], BEAM = '#4a3224', BEAM_LO = '#6e4f3a';
  var FRAME = '#2f3137', FRAME_HI = '#4c4f58', SILL = '#a57d5a', PANEL = '#6f4f3b', PANEL_D = '#5c412f';
  var BRICK = ['#9c5b44', '#a8664c', '#8d503d', '#b06f52'], MORTAR = '#cdbca6';
  var FLOOR = ['#a9774f', '#9d6c47', '#b4825a', '#a37250'], SEAM = '#6d4a33';

  // 砖：宽 bw、高 bh，隔行错半块；每块砖颜色按编号随机，右下一道暗边
  function brick(x, y, s, ox) {
    var bw = Math.max(6, Math.round(15 * s)), bh = Math.max(3, Math.round(6 * s)), row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0;
    var bx = Math.floor((x - ox + off) / bw), lx = (x - ox + off) - bx * bw, ly = y - row * bh;
    if (lx < 1 || ly < 1) return MORTAR;
    var c = BRICK[Math.floor(rnd(bx * 31 + row * 7, 11) * BRICK.length)];
    if (lx >= bw - 1 || ly >= bh - 1) return shade(c, 0.82);
    if (ly === 1 && rnd(bx + row * 13, 12) > 0.5) return shade(c, 1.08);
    return c;
  }

  function cafeRoom(A, ctx) {
    var L = ctx.L, s = L.s, w = L.w, win = L.win, x, y;
    // ---- 天花板 ----
    for (y = 0; y < L.CEIL; y++) {
      var k = (L.VPy - y) / (L.VPy - L.CEIL), plank = Math.floor((L.VPy - L.CEIL) * (1 - 1 / k) / (9 * s));
      for (x = 0; x < w; x++) A.px(x, y, WOOD_CEIL[((plank % 3) + 3) % 3]);
    }
    [-0.28, 0.02, 0.28, 0.54, 0.8, 1.06, 1.3].forEach(function (f) {
      var xb = L.X(f), bw = 14 * s;
      for (y = 0; y < L.CEIL; y++) {
        var k2 = (L.VPy - y) / (L.VPy - L.CEIL), xa = L.VPx + (xb - bw / 2 - L.VPx) * k2, xc = L.VPx + (xb + bw / 2 - L.VPx) * k2;
        for (x = Math.floor(xa); x < xc; x++) A.px(x, y, x < xa + 2 * s * k2 || x > xc - 2 * s * k2 ? BEAM : BEAM_LO);
      }
    });
    for (y = L.CEIL - Math.round(7 * s); y < L.CEIL + Math.round(3 * s); y++) for (x = 0; x < w; x++) A.px(x, y, y < L.CEIL - 5 * s ? BEAM_LO : BEAM);
    // ---- 后墙：窗框 + 窗下护墙板 ----
    var fw = win.fw, top = win.top, sill = win.sill;
    for (y = L.CEIL + Math.round(3 * s); y < L.FL; y++) {
      for (x = 0; x < w; x++) {
        if (x < win.x1 + fw / 2) {
          if (y < top) A.px(x, y, FRAME);                                               // 窗顶上那截
          else if (y >= sill + 3 * s) A.px(x, y, (x % Math.round(28 * s)) < 2 * s ? PANEL_D : (y > L.FL - 5 * s ? PANEL_D : PANEL));   // 护墙板
          else if (y >= sill - 3 * s) A.px(x, y, y < sill - 1 * s ? shade(SILL, 1.12) : SILL); // 窗台木沿
          else {
            var onM = win.mull.some(function (mx) { return Math.abs(x + 0.5 - mx) < fw / 2; });
            var onT = Math.abs(y + 0.5 - win.transom) < fw / 2 || y < top + fw;
            var onU = y < win.transom && win.mull.some(function (mx, i) { var nx = win.mull[i + 1]; return nx !== undefined && Math.abs(x + 0.5 - (mx + nx) / 2) < Math.max(1, s); });
            if (onM || onT || onU) A.px(x, y, (onM && Math.abs(x + 0.5 - nearest(win.mull, x)) < fw / 2 - 1.2 * s) || (onT && !onM && Math.abs(y + 0.5 - win.transom) < 1) ? FRAME_HI : FRAME);
          }
        } else if (x < L.pillar[1]) A.px(x, y, x < L.pillar[0] + 2 * s ? shade(brick(x, y, s, 0), 0.8) : brick(x, y, s, 3));   // 砖柱（左边一道暗边）
        else A.px(x, y, brick(x, y, s, 0));                                               // 砖墙
      }
    }
    // 墙脚一道踢脚线（砖墙那边）
    for (y = L.FL - Math.round(6 * s); y < L.FL; y++) for (x = Math.floor(L.pillar[0]); x < w; x++) A.px(x, y, y < L.FL - 5 * s ? '#5a4030' : '#4a3326');
  }

  // 地板（木条一点透视、错缝）+ 两块地毯；和房子分开画（挂载时分两步，免得一次太久）
  function cafeFloor(A, ctx) {
    var L = ctx.L, s = L.s, w = L.w, x, y;
    var pw = 13 * s, blen = 150 * s;
    for (y = L.FL; y < L.h; y++) {
      var fa = floorAt(L, 0, y), fb = floorAt(L, 0, y + 1);
      for (x = 0; x < w; x++) {
        var f = floorAt(L, x, y), u = f.xw / pw, pi = Math.floor(u), off = rnd(pi, 21) * blen;
        var seamX = (u - pi) * pw * f.k < 1;
        var seamZ = Math.floor((fa.D + off) / blen) !== Math.floor((fb.D + off) / blen);
        var c = FLOOR[Math.floor(rnd(pi * 3 + Math.floor((f.D + off) / blen), 22) * FLOOR.length)];
        if (!seamX && !seamZ && rnd(Math.floor(u * 6) + Math.floor(f.D / (20 * s)) * 17, 23) > 0.93) c = shade(c, 0.93);   // 木纹
        A.px(x, y, seamX || seamZ ? SEAM : c);
      }
    }
    rug(A, L, [L.X(0.235), L.X(0.425)], [70 * s, 215 * s], 'rect');
    rug(A, L, [L.X(0.44), L.X(0.575)], [8 * s, 96 * s], 'round');
  }
  function nearest(list, x) { var b = list[0]; list.forEach(function (v) { if (Math.abs(v - x) < Math.abs(b - x)) b = v; }); return b; }

  // 地毯：地面坐标（后墙 x 区间、离墙距离区间）里的一块；rect = 红底、奶白菱形、青色边；round = 圆的，暗绿 + 一圈浅边
  // 一点透视下远边会往消失点那边偏：横向要扫到近边、远边两条里更靠外的那一端（只扫近边的话，偏出去的那个角会被切掉）
  function rug(A, L, xr, dr, kind) {
    var s = L.s, near = cafeDepth(L, dr[1]), far = cafeDepth(L, dr[0]);
    var xa = Math.floor(Math.min(near.x(xr[0]), far.x(xr[0]))), xb = Math.max(near.x(xr[1]), far.x(xr[1]));
    for (var y = Math.floor(far.y()); y <= near.y(); y++) {
      for (var x = xa; x <= xb; x++) {
        var f = floorAt(L, x + 0.5, y + 0.5);
        var u = (f.xw - xr[0]) / (xr[1] - xr[0]), v = (f.D - dr[0]) / (dr[1] - dr[0]);
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        var c;
        if (kind === 'round') {
          var e = Math.hypot(u - 0.5, v - 0.5) * 2;
          if (e > 1) continue;
          c = e > 0.86 ? '#c9c09a' : e > 0.8 ? '#4a5a44' : (Math.floor(e * 7) % 2 ? '#5e7152' : '#566a4b');
        } else {
          var bu = Math.min(u, 1 - u) * (xr[1] - xr[0]), bv = Math.min(v, 1 - v) * (dr[1] - dr[0]);
          var b = Math.min(bu, bv);
          if (b < 4 * s) c = b < 1.6 * s ? '#e6d2a8' : '#3f6f6a';
          else {
            var du = Math.abs(((u * 6) % 1) - 0.5), dv = Math.abs(((v * 4) % 1) - 0.5);
            c = du + dv < 0.22 ? '#e6d2a8' : du + dv < 0.3 ? '#6e2e2c' : '#8c3d38';
          }
        }
        A.px(x, y, c);
      }
    }
  }

  // 房间的光（只打在房子本身上）：墙角 / 天花板压暗、窗边的天光、地板上的太阳光斑
  function cafeRoomLight(Lt, ctx) {
    var L = ctx.L, T = ctx.T, s = L.s, x, y;
    for (y = 0; y < L.CEIL; y++) for (x = 0; x < L.w; x++) Lt.mulPx(x, y, 0.72 + 0.18 * (y / L.CEIL));
    for (y = L.FL; y < L.FL + 10 * s; y++) for (x = 0; x < L.w; x++) Lt.mulPx(x, y, 0.72 + 0.28 * (y - L.FL) / (10 * s));
    for (y = L.CEIL; y < L.CEIL + 16 * s; y++) for (x = 0; x < L.w; x++) Lt.mulPx(x, y, 0.8 + 0.2 * (y - L.CEIL) / (16 * s));
    if (T.id !== 'night') Lt.pool(L.X(0.25), L.FL + 20 * s, L.W * 0.5, 90 * s, T.id === 'day' ? [0.2, 0.22, 0.26] : [0.18, 0.12, 0.12], 1);
    if (!T.sun) return;
    var sun = sunGeom(L, T);
    for (y = L.FL; y < L.h; y++) {
      for (x = 0; x < L.w; x++) {
        var f = floorAt(L, x + 0.5, y + 0.5);
        if (sun.hit(f.xw, f.D)) Lt.addPx(x, y, T.sun.col, T.sun.k);
      }
    }
  }
  // 太阳穿过窗子：窗面上 (xs, 离地 h) 的一点照到地面离墙 D = h / tan(仰角)、横向再偏 D × tan(方位) 的地方
  function sunGeom(L, T) {
    var win = L.win, te = Math.tan(T.sun.elev * Math.PI / 180), ta = Math.tan(T.sun.az * Math.PI / 180), fw = win.fw;
    var hs = L.FL - win.sill, ht = L.FL - win.top - fw, htr = L.FL - win.transom;
    function inWin(xs, h) {
      if (h < hs || h > ht || Math.abs(h - htr) < fw / 2) return false;
      if (xs < win.mull[0] || xs > win.mull[win.mull.length - 1]) return false;
      for (var i = 0; i < win.mull.length; i++) if (Math.abs(xs - win.mull[i]) < fw / 2) return false;
      if (h > htr) for (var j = 0; j + 1 < win.mull.length; j++) if (Math.abs(xs - (win.mull[j] + win.mull[j + 1]) / 2) < Math.max(1, L.s)) return false;
      return true;
    }
    return {
      te: te, ta: ta, hs: hs, ht: ht,
      hit: function (xw, D) { return D > 0 && inWin(xw - D * ta, D * te); },
      // 某扇窗（后墙坐标 x0 ~ x1、离地 h0 ~ h1）的光柱：窗上四角 + 落到地面的四角，取凸包
      shaft: function (x0, x1, h0, h1) {
        var pts = [[x0, L.FL - h0], [x1, L.FL - h0], [x1, L.FL - h1], [x0, L.FL - h1]];
        [[x0, h0], [x1, h0], [x1, h1], [x0, h1]].forEach(function (p) {
          var D = p[1] / te, dd = cafeDepth(L, Math.min(D, L.Dc * 0.8));
          pts.push([dd.x(p[0] + Math.min(D, L.Dc * 0.8) * ta), dd.y()]);
        });
        return hull(pts);
      }
    };
  }
  function hull(p) {
    p = p.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // 空气里的光柱（房间和家具都加一点光）；顺便记下光柱给浮尘用
  function cafeShafts(Lts, ctx) {
    var L = ctx.L, T = ctx.T;
    ctx.shafts = [];
    if (!T.sun) return;
    var sun = sunGeom(L, T), win = L.win, htr = L.FL - win.transom;
    for (var i = 0; i + 1 < win.mull.length; i++) {
      var x0 = win.mull[i] + win.fw / 2, x1 = win.mull[i + 1] - win.fw / 2;
      var poly = sun.shaft(x0, x1, sun.hs, Math.min(sun.ht, htr - win.fw / 2));
      ctx.shafts.push(poly);
      var kk = T.sun.k * 0.22, x1w = L.pillar[0];
      // 光柱只在窗前那片空气里（砖墙那边不加），越往下越淡
      Lts.forEach(function (Lt) {
        Lt.poly(poly, T.sun.col, function (x, y) { return x > x1w ? 0 : kk * Math.max(0.2, 1 - (y - L.win.top) / (L.h - L.win.top)); });
      });
    }
  }

  PX.provide('03-cafe-room', { cafeFloor: cafeFloor, cafeRoom: cafeRoom, cafeRoomLight: cafeRoomLight, cafeShafts: cafeShafts });
})(window.__abPixel = window.__abPixel || {});

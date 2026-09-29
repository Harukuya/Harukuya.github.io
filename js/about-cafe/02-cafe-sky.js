// 02-cafe-sky：窗外（画在最后面的一层，透过落地窗看到）
// 从上到下：天（四个时间各一套渐变；白天太阳在左上、清晨 / 黄昏太阳贴着海平线、夜里月牙 + 一条斜着的银河 + 满天星）→
// 远山（左右两段，越远越淡）→ 海（视平线处，太阳 / 月亮在海面拖一道碎光）→ 山坡上的小镇（屋顶、烟囱，夜里窗户亮）→
// 窗外的露台（铁栏杆、两盆植物、夜里栏杆上一串小灯）和左边一棵大树的树冠。
// 云单独一层（cafeClouds，横向首尾相接，挂载后慢慢往右飘）。
(function (PX) {
  'use strict';

  PX.need('02-cafe-sky', ['cafeLerp', 'cafeRnd', 'cafeVgrad', 'fbm2', 'noise2']);
  var lerp = PX.cafeLerp, rnd = PX.cafeRnd, vgrad = PX.cafeVgrad, fbm2 = PX.fbm2, noise2 = PX.noise2;

  var SKY = {
    dawn: ['#2c3a6c', '#4a5790', '#7c74a8', '#bb86a8', '#e9a39c', '#f7c6a0', '#fbdcb0'],
    day: ['#3a80cc', '#5093d6', '#6ea8df', '#91bee7', '#b6d4ec', '#d5e6f0', '#e6eff1'],
    dusk: ['#241f4a', '#43306c', '#7a4282', '#bb5a7c', '#e67a62', '#f6a25c', '#fcc46c'],
    night: ['#060a1c', '#0a1029', '#0f1735', '#151f42', '#1c294f', '#25345b', '#2e3e66']
  };
  // 远山 / 近山 / 海 / 海面亮部 / 小镇墙 / 屋顶 / 露台
  var PAL = {
    dawn: { far: '#8a86b0', near: '#6e6a9a', sea: ['#8d8fb8', '#7479a6', '#5c6594'], glint: '#ffd9b8', wall: '#b9a7b8', roof: ['#8e6278', '#7a5a78', '#6a6488'], deck: '#4d4660', tree: ['#3f5a5a', '#4d6b62', '#5f7d6c'] },
    day: { far: '#9dbad2', near: '#7fa2bf', sea: ['#5f9ccc', '#4a86bb', '#3a73a8'], glint: '#ffffff', wall: '#efe6d8', roof: ['#c8674c', '#b85a45', '#8a6a5a'], deck: '#6a5446', tree: ['#3f7a4a', '#4f9152', '#6aa85e'] },
    dusk: { far: '#8a5a86', near: '#6a4474', sea: ['#b8667a', '#8e4e72', '#623e68'], glint: '#ffd08a', wall: '#c89a8c', roof: ['#8a4a58', '#7a4458', '#5e3e5a'], deck: '#3e2e44', tree: ['#3a3048', '#48384e', '#5a4454'] },
    night: { far: '#1b2548', near: '#141c3a', sea: ['#1c2a52', '#162244', '#111b38'], glint: '#c9d6ff', wall: '#2a3050', roof: ['#1c2140', '#20264a', '#181d38'], deck: '#14172a', tree: ['#0f1a24', '#132230', '#18293a'] }
  };

  function ridge(r, x0, x1, base, top, col, seed, w) {
    for (var x = Math.floor(x0); x < x1; x++) {
      var t = (x - x0) / (x1 - x0), hgt = Math.sin(t * Math.PI) * (0.7 + 0.3 * fbm2(x / (w * 0.05), 0.5, seed)) * (base - top);
      for (var y = Math.round(base - hgt); y < base; y++) r.px(x, y, col);
    }
  }

  // r：整张画布的 Raster；L：布局；T：时间
  function cafeSky(r, L, T) {
    var id = T.id, P = PAL[id], s = L.s, w = L.w, hz = Math.round(L.VPy), top = L.win.top - 4;
    // 天
    for (var y = 0; y < hz; y++) {
      var t = (y - top) / (hz - top);
      for (var x = 0; x < w; x++) r.px(x, y, vgrad(SKY[id], t, x, y));
    }
    if (id === 'night') {
      // 银河：左上 → 右中的一条光带（淡紫蓝的光 + 密一点的星 + 暗的尘带）
      for (var y2 = 0; y2 < hz; y2++) {
        for (var x2 = 0; x2 < w; x2++) {
          var along = (x2 - L.X(-0.05)) / (L.X(0.75) - L.X(-0.05)), cy = L.Y(0.1) + along * (L.Y(0.36) - L.Y(0.1)), d = Math.abs(y2 - cy) / (38 * s);
          if (d < 1 && along > -0.1 && along < 1.2) {
            var n = fbm2(x2 / (26 * s), y2 / (14 * s), 51), a = (1 - d) * (1 - d) * (0.45 + n * 0.8);
            if (a > 0.12) r.px(x2, y2, n > 0.62 && d < 0.4 ? '#c7b4e8' : '#8e8fcf', Math.min(0.55, a * 0.5));
            if (noise2(x2 / (9 * s), y2 / (5 * s), 53) > 0.72 && d < 0.5) r.px(x2, y2, '#0b0f26', 0.35);
            if (rnd(x2 * 7 + y2 * 13, 55) > 1 - a * 0.1) r.px(x2, y2, '#ffffff', 0.6 + a * 0.4);
          }
        }
      }
    }
    // 星（夜里满天，清晨 / 黄昏只剩天顶几颗）
    var nStar = id === 'night' ? 0.0026 : id === 'day' ? 0 : 0.0005;
    for (var i = 0; i < w * hz * nStar; i++) {
      var sx = rnd(i, 61) * w, sy = rnd(i, 62) * hz * (id === 'night' ? 1 : 0.35), b = rnd(i, 63);
      r.px(sx, sy, b > 0.85 ? '#fff4d8' : b > 0.5 ? '#ffffff' : '#bcc8f0', id === 'night' ? 0.5 + b * 0.5 : 0.4);
      if (b > 0.93) { r.px(sx - 1, sy, '#dfe6ff', 0.35); r.px(sx + 1, sy, '#dfe6ff', 0.35); r.px(sx, sy - 1, '#dfe6ff', 0.35); r.px(sx, sy + 1, '#dfe6ff', 0.35); }
    }
    // 太阳 / 月亮
    if (id === 'day') {
      var sx1 = L.X(0.12), sy1 = L.Y(0.2);
      r.glow(sx1, sy1, 12 * s, 90 * s, '#fff6d8', 0.55);
      r.disc(sx1, sy1, 11 * s, '#fffdf2');
    } else if (id === 'dawn' || id === 'dusk') {
      var sx2 = L.X(id === 'dawn' ? 0.28 : 0.44), sy2 = hz - (id === 'dawn' ? 7 : 2) * s, rr = (id === 'dawn' ? 14 : 18) * s;
      r.glow(sx2, sy2, rr, 110 * s, id === 'dawn' ? '#ffe2c0' : '#ffc27a', 0.6);
      r.disc(sx2, sy2, rr, function (x, yy) { return yy < hz ? (yy < sy2 - rr * 0.4 ? '#fff4d6' : id === 'dawn' ? '#ffe0b0' : '#ffd08a') : null; });
    } else {
      var mx = L.X(0.47), my = L.Y(0.19), mr = 10 * s;
      r.glow(mx, my, mr, 50 * s, '#dfe6ff', 0.3);
      r.disc(mx, my, mr, function (x, yy, dx, dy) { return Math.hypot(dx - mr * 0.45, dy + mr * 0.2) < mr * 0.92 ? null : '#f4f1e2'; });
    }
    // 远山（左右两段）
    ridge(r, L.X(-0.2), L.X(0.3), hz, hz - 44 * s, P.far, 71, w);
    ridge(r, L.X(0.34), L.X(0.72), hz, hz - 26 * s, P.far, 72, w);
    ridge(r, L.X(-0.1), L.X(0.14), hz, hz - 22 * s, P.near, 73, w);
    // 海：视平线往下，太阳 / 月亮底下一道碎光
    var seaB = hz + Math.round(34 * s), gx = id === 'day' ? L.X(0.12) : id === 'dawn' ? L.X(0.28) : id === 'dusk' ? L.X(0.44) : L.X(0.47);
    for (var y3 = hz; y3 < seaB; y3++) {
      for (var x3 = 0; x3 < w; x3++) {
        var c = vgrad(P.sea, (y3 - hz) / (seaB - hz), x3, y3);
        r.px(x3, y3, c);
      }
      // 碎光：一道竖的光带里零零星星的短横线，越往近处越宽
      var spread = (5 + (y3 - hz) * 0.5) * s;
      if ((y3 - hz) % 2 === 0) {
        for (var gi = 0; gi < 3; gi++) {
          var gr = rnd(y3 * 5 + gi, 75);
          if (gr > 0.55) continue;
          var gx0 = gx + (rnd(y3 * 7 + gi, 76) - 0.5) * 2 * spread, gl = Math.round((1 + rnd(y3 + gi * 3, 77) * 3) * s);
          r.rect(gx0, y3, gl, 1, P.glint, 0.5 + (1 - Math.abs(gx0 - gx) / spread) * 0.4);
        }
      }
    }
    // 山坡上的小镇：一排排小房子，屋顶三种颜色，夜里窗户亮暖黄
    var townTop = hz + Math.round(20 * s), deckY = Math.round(L.Y(0.625));
    for (var y4 = townTop; y4 < deckY + 2; y4++) for (var x4 = 0; x4 < w; x4++) r.px(x4, y4, lerp(P.near, P.deck, (y4 - townTop) / (deckY - townTop) * 0.6));
    for (var row = 0; row < 3; row++) {
      var by = townTop + (row + 1) * 13 * s, hw = (8 + row * 3) * s;
      for (var k = 0; k < w / (hw * 2.1); k++) {
        var hx = (k + rnd(k + row * 50, 81) * 0.6) * hw * 2.1 - hw, hh = (7 + rnd(k + row * 50, 82) * 7 + row * 2) * s, rc = P.roof[Math.floor(rnd(k + row * 50, 83) * 3)];
        if (rnd(k + row * 50, 84) < 0.18) continue;
        r.rect(hx, by - hh, hw * 1.6, hh + 13 * s, P.wall);
        for (var q = 0; q < hw * 0.95; q++) r.rect(hx - 1 + q * 0.9, by - hh - q * 0.55, Math.max(1, hw * 1.6 + 2 - q * 1.8), 1, rc);
        if (rnd(k + row * 50, 85) > 0.6) r.rect(hx + hw * 1.1, by - hh - hw * 0.7, 2 * s, hw * 0.5, rc);
        var lit = id === 'night' || (id === 'dusk' && rnd(k, 86) > 0.5) || (id === 'dawn' && rnd(k, 87) > 0.8);
        r.rect(hx + hw * 0.35, by - hh * 0.55, Math.max(1, 2 * s), Math.max(1, 2 * s), lit ? '#ffd27a' : (id === 'day' ? '#6f8aa4' : '#3a4060'));
        r.rect(hx + hw * 0.95, by - hh * 0.55, Math.max(1, 2 * s), Math.max(1, 2 * s), lit && rnd(k, 88) > 0.3 ? '#ffc868' : (id === 'day' ? '#6f8aa4' : '#3a4060'));
      }
    }
    // 窗外的露台：木地台 + 铁栏杆（扶手 + 立柱）+ 两盆植物；夜里栏杆上挂一串小灯
    for (var y5 = deckY; y5 < L.h; y5++) for (var x5 = 0; x5 < w; x5++) r.px(x5, y5, (y5 - deckY) % Math.max(2, Math.round(4 * s)) === 0 ? P.roof[2] : P.deck);
    var railY = deckY - Math.round(26 * s);
    r.rect(0, railY, w, Math.max(1, Math.round(2 * s)), '#2a2830');
    r.rect(0, railY + Math.round(12 * s), w, Math.max(1, Math.round(1 * s)), '#2a2830');
    for (var px = 0; px < w; px += Math.round(9 * s)) r.rect(px, railY, Math.max(1, Math.round(1 * s)), deckY - railY, '#2a2830');
    if (id === 'night' || id === 'dusk') {
      for (var b2 = 0; b2 < w; b2 += Math.round(14 * s)) {
        var sag = Math.sin((b2 % Math.round(56 * s)) / (56 * s) * Math.PI) * 5 * s;
        r.px(b2, railY - 3 * s + sag, '#3a3440');
        if ((b2 / Math.round(14 * s)) % 2 === 0) { r.px(b2, railY - 2 * s + sag, '#ffdf9a'); r.glow(b2, railY - 2 * s + sag, 1, 5 * s, '#ffcf7a', id === 'night' ? 0.35 : 0.2); }
      }
    }
    // 左边一棵大树的树冠（盖住左上角一部分天和山），右下露台上两盆小树
    tree(r, L.X(-0.05), L.Y(0.24), 70 * s, P.tree, 91);
    tree(r, L.X(0.215), deckY - 30 * s, 16 * s, P.tree, 92);
    r.rect(L.X(0.215) - 6 * s, deckY - 14 * s, 12 * s, 14 * s, P.roof[1]);
    tree(r, L.X(0.5), deckY - 26 * s, 13 * s, P.tree, 93);
    r.rect(L.X(0.5) - 5 * s, deckY - 12 * s, 10 * s, 12 * s, P.roof[1]);
  }

  // 一团树冠：几个叠在一起的圆，按噪声分三档明暗（左上亮）
  function tree(r, cx, cy, R, tones, seed) {
    for (var y = Math.floor(cy - R * 1.2); y < cy + R * 1.2; y++) {
      for (var x = Math.floor(cx - R * 1.3); x < cx + R * 1.3; x++) {
        var dx = (x - cx) / R, dy = (y - cy) / R, n = fbm2(x / (R * 0.22), y / (R * 0.22), seed);
        var e = dx * dx * 0.7 + dy * dy - (n - 0.5) * 0.9;
        if (e > 1) continue;
        var lit = -dx * 0.5 - dy * 0.7 + n * 0.8;
        r.px(x, y, lit > 0.7 ? tones[2] : lit > 0.2 ? tones[1] : tones[0]);
      }
    }
  }

  // 云：画在一块宽 tw 的图块里（左右首尾相接），白天几朵积云，清晨 / 黄昏是被照亮下沿的长条云；夜里没有
  function cafeClouds(r, L, T, tw) {
    var id = T.id, s = L.s;
    if (id === 'night') return;
    var n = id === 'day' ? 5 : 6;
    for (var i = 0; i < n; i++) {
      var cx = (i + rnd(i, 101) * 0.6) / n * tw, cy = L.Y(0.13 + rnd(i, 102) * 0.22), sc = (0.7 + rnd(i, 103) * 0.6) * s;
      if (id === 'day') puff(r, cx, cy, sc, tw);
      else streak(r, cx, cy, sc, tw, id);
    }
  }
  function puff(r, cx, cy, sc, tw) {
    var blobs = [[0, 0, 13], [-15, 4, 9], [15, 3, 10], [6, -7, 9], [-7, -4, 8], [26, 6, 6]];
    blobs.forEach(function (b) {
      var bx = cx + b[0] * sc, by = cy + b[1] * sc, R = b[2] * sc;
      for (var y = Math.floor(by - R); y <= by + R; y++) {
        for (var x = Math.floor(bx - R); x <= bx + R; x++) {
          var dx = x + 0.5 - bx, dy = y + 0.5 - by;
          if (dx * dx + dy * dy > R * R || y > cy + 8 * sc) continue;
          var xx = ((x % tw) + tw) % tw, sh = dy / R + dx / R * 0.3;
          r.px(xx, y, sh > 0.45 ? '#c9d9e8' : sh > 0 ? '#e8f0f6' : '#ffffff');
        }
      }
    });
  }
  function streak(r, cx, cy, sc, tw, id) {
    var len = 60 * sc, th = 5 * sc;
    for (var y = Math.floor(cy - th); y <= cy + th; y++) {
      for (var x = Math.floor(cx - len); x <= cx + len; x++) {
        var dx = (x - cx) / len, dy = (y - cy) / th, e = dx * dx + dy * dy * (1 + dx * dx);
        if (e > 1) continue;
        var xx = ((x % tw) + tw) % tw, low = dy > 0.2;
        var c = id === 'dawn' ? (low ? '#ffc9b0' : '#b995b8') : (low ? '#ffb070' : '#a0587a');
        r.px(xx, y, c, e > 0.7 ? 0.6 : 0.95);
      }
    }
  }

  PX.provide('02-cafe-sky', { cafeClouds: cafeClouds, cafeSky: cafeSky, cafeTree: tree });
})(window.__abPixel = window.__abPixel || {});

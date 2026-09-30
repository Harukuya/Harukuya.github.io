// Amphoreus: broad asymmetric folded ribbon with authored broken tips.
// 右上角几块脱离主体的碎片会轻轻漂（主体不动）。漂动按「整块碎片」算：加载时把贴图按不透明像素的连通区域分块，
// 每块碎片一个相位、整块一起挪——原来按竖条（贴图横向 16 等分）+ 两条硬边界（u = 0.74 / v = 0.22）分，
// 一块碎片跨过分界线就被切成几截各漂各的，中间裂开一道缝（错位）。漂的是右半边所有脱离主体的碎片（右上两块 + 右下两块，重心在 u > 0.7）
(function (PX) {
  'use strict';
  PX.need('08b-amphoreus-ribbon', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  // 每个像素都会调一次下面两个函数：不动的部分返回同一个 [0, 0]、没有反光的地方原样返回颜色（和 mix(c, …, 0) 数值一样），不再每个像素新建数组
  var STILL = [0, 0];

  // ---------- 碎片分块（贴图 512×256：连通区域，8 邻接，透明度 > 60 算实心）----------
  var SHARDS = null;   // { w, h, id: Int16Array（每个源像素属于第几块会漂的碎片，-1 = 不漂）, phase: [每块的相位] }
  (function loadShards() {
    var img = document.createElement('img');
    img.onload = function () {
      var W = img.naturalWidth, H = img.naturalHeight, c = document.createElement('canvas');
      c.width = W; c.height = H;
      var x2 = c.getContext('2d', { willReadFrequently: true });
      x2.drawImage(img, 0, 0);
      var a = x2.getImageData(0, 0, W, H).data, lab = new Int32Array(W * H).fill(-1), comps = [], stack = [];
      for (var p = 0; p < W * H; p++) {
        if (lab[p] >= 0 || a[p * 4 + 3] <= 60) continue;
        var k = comps.length, n = 0, sx = 0, sy = 0;
        lab[p] = k; stack.push(p);
        while (stack.length) {
          var q = stack.pop(), qx = q % W, qy = (q - qx) / W;
          n++; sx += qx; sy += qy;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            var nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            var r = ny * W + nx;
            if (lab[r] < 0 && a[r * 4 + 3] > 60) { lab[r] = k; stack.push(r); }
          }
        }
        comps.push({ n: n, u: sx / n / W, v: sy / n / H });
      }
      // 会漂的：右半边脱离主体的小块（重心 u > 0.7，面积不到最大那块的一半）；相位沿用原来按竖条分的那一套（重心所在的那一条）
      var big = Math.max.apply(null, comps.map(function (s) { return s.n; })), phase = [], map = [];
      comps.forEach(function (s, i) {
        map[i] = -1;
        if (s.u > 0.7 && s.n < big / 2) { map[i] = phase.length; phase.push(Math.floor(s.u * 16)); }
      });
      var id = new Int16Array(W * H).fill(-1);
      for (var i = 0; i < W * H; i++) if (lab[i] >= 0) id[i] = map[lab[i]];
      // 边上半透明（≤ 60）的像素：归给 2 像素以内最近的那一块（贴图缩放取样后边缘会带到这些像素）
      var grown = new Int16Array(id);
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var o = y * W + x;
        if (lab[o] >= 0) continue;
        var best = 9, pick = -1;
        for (var yy = -2; yy <= 2; yy++) for (var xx = -2; xx <= 2; xx++) {
          var X = x + xx, Y = y + yy;
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          var j = Y * W + X, d = xx * xx + yy * yy;
          if (lab[j] >= 0 && d < best) { best = d; pick = id[j]; }
        }
        grown[o] = pick;
      }
      SHARDS = { w: W, h: H, id: grown, phase: phase };
    };
    img.src = '/img/about-atlas/amphoreus-ribbon.png';
  })();

  function amphoreusRibbon(r, F, t) {
    var amplitude = Math.max(0.6 * (F.pixelDensity || 1), F.s * 3), S = SHARDS, drift = null;
    if (S) drift = S.phase.map(function (f) { return [Math.sin(t * 0.45 + f) * amplitude, Math.cos(t * 0.35 + f) * amplitude * 0.7]; });
    atlasDraw(r, F, 'amphoreus-ribbon', [0, 0, 1000, 520], {
      detail: !!F.detail,
      offset: function (u, v) {
        // 主体不动；右半边几块碎片整块一起漂（分块还没算好时先都不动）
        if (!S || u < 0.7) return STILL;
        var k = S.id[Math.min(S.h - 1, (v * S.h) | 0) * S.w + Math.min(S.w - 1, (u * S.w) | 0)];
        return k >= 0 ? drift[k] : STILL;
      },
      shade: function (c, u, v) {
        var sheen = Math.pow(Math.max(0, Math.sin(u * 13 - v * 5 - t * 0.65)), 9);
        return sheen ? mix(c, '#b2eaff', sheen * 0.3) : c;
      }
    });
  }
  PX.provide('08b-amphoreus-ribbon', { amphoreusRibbon: amphoreusRibbon });
})(window.__abPixel = window.__abPixel || {});

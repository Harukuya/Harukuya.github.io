// Amphoreus: full star-centred dark disc and thin prismatic rim.
// 每一拍（景色层约 12 帧 / 秒）只有两样随时间变：外圈蓝色光晕和外圈辉光贴图的整体透明度（慢慢呼吸）。
// 所以和圆盘一起，把光晕的几何（每个像素在哪、是第几档）也只算一次缓存起来：光晕被不透明的圆盘整个盖住的那部分直接不画，
// 圆盘按行整段拷进去，辉光贴图打开 atlasDraw 的 cacheKey。画出来和逐像素现算一个字节都不差（光晕 / 混合公式同 Raster.glow / Raster.px）
(function (PX) {
  'use strict';
  PX.need('08a-amphoreus-disc', ['Raster', 'atlasDraw', 'atlasPoint', 'band', 'clamp', 'dith', 'fbm2', 'hex', 'mix']);
  var atlasDraw = PX.atlasDraw, atlasPoint = PX.atlasPoint, band = PX.band,
    clamp = PX.clamp, dith = PX.dith, fbm2 = PX.fbm2, hex = PX.hex, mix = PX.mix, Raster = PX.Raster, cache = null;
  var GLOW = hex('#315ce3');
  function amphoreusDisc(r, F, t) {
    var C = atlasPoint(F, F.lightCenter[0], F.lightCenter[1]), R = 292 * F.s;
    var key = [r.w, r.h, r.ox, r.oy, C[0], C[1], R].join(':');
    if (!cache || cache.key !== key) cache = build(r, F, C, R, key);
    var amax = 0.46 + 0.035 * Math.sin(t * 0.8);
    if (r.px !== Raster.prototype.px || !r.d) {
      // 不是普通缓冲（px 被换掉了）：照原来的画法
      r.glow(C[0], C[1], R * 0.89, R * 1.22, '#315ce3', amax);
      r.blit(cache.r, -r.ox, -r.oy);
    } else {
      drawGlow(r.d, cache.glow, amax);
      var D = r.d, B = cache.r.d, sp = cache.spans;
      for (var k = 0; k < sp.length; k += 2) D.set(B.subarray(sp[k], sp[k + 1]), sp[k]);
    }
    atlasDraw(r, F, 'amphoreus-glow', [F.lightCenter[0] - 438, F.lightCenter[1] - 438, 876, 876], {
      detail: !!F.detail,
      alpha: 0.35 + 0.035 * Math.sin(t * 0.8),
      cacheKey: 'amphoreus-disc-glow',
      opacity: function (u, v) {
        var d = Math.hypot(u - 0.5, v - 0.5) * 2;
        return clamp((d - 0.56) * 8, 0, 1);
      }
    });
  }
  function build(r, F, C, R, key) {
    var base = new Raster(r.w, r.h, r.ox, r.oy);
    base.disc(C[0], C[1], R, function (x, y, dx, dy, d) {
      var density = F.pixelDensity || 1;
      var n = fbm2(dx * 0.028 / density, dy * 0.028 / density, 74);
      var c = band(['#10182f', '#142342', '#183051', '#254266'], clamp(d * 0.45 + n * 0.45, 0, 1), x, y);
      if (d > 0.975) {
        var angle = Math.atan2(dy, dx);
        c = mix(c, band(['#55bfff', '#6699e3', '#a9bfa0', '#cee997'], (Math.sin(angle * 1.8 + 0.5) + 1) * 0.5, x, y), 0.6);
      }
      return c;
    });
    // 圆盘：一行行不透明的连续段（缓冲下标 [起, 止)）；圆盘上的像素都是不透明的（ellipse 画的是实色）
    var B = base.d, W = r.w, H = r.h, spans = [];
    for (var y = 0; y < H; y++) {
      var start = -1;
      for (var x = 0; x <= W; x++) {
        var on = x < W && B[(y * W + x) * 4 + 3] === 255;
        if (on && start < 0) start = x;
        else if (!on && start >= 0) { spans.push((y * W + start) * 4, (y * W + x) * 4); start = -1; }
      }
    }
    // 光晕：和 Raster.glow 同样的范围、距离、分档和抖动；被圆盘盖住的像素（之后会被圆盘整个覆盖）不记
    var r0 = R * 0.89, r1 = R * 1.22, cx = C[0], cy = C[1], glow = [];
    for (var gy = Math.floor(cy - r1); gy <= cy + r1; gy++) {
      var ty = gy + r.oy;
      for (var gx = Math.floor(cx - r1); gx <= cx + r1; gx++) {
        var ddx = gx + 0.5 - cx, ddy = gy + 0.5 - cy, dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < r0 || dd > r1) continue;
        var tt = 1 - (dd - r0) / (r1 - r0);
        var v = tt * tt * 3, lv = Math.floor(v), f = v - lv;
        if (dith(gx, gy, f)) lv++;
        if (lv <= 0) continue;
        var tx = gx + r.ox;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        var o = (ty * W + tx) * 4;
        if (B[o + 3] === 255) continue;
        glow.push(o, lv);
      }
    }
    return { key: key, r: base, spans: spans, glow: new Int32Array(glow) };
  }
  // 光晕逐像素混合：和 Raster.px 同一个公式（透明度 = amax × 档 / 3）
  function drawGlow(D, G, amax) {
    for (var k = 0; k < G.length; k += 2) {
      var o = G[k], a = amax * G[k + 1] / 3;
      if (a >= 1) { D[o] = GLOW[0]; D[o + 1] = GLOW[1]; D[o + 2] = GLOW[2]; D[o + 3] = 255; continue; }
      if (a <= 0) continue;
      var da = D[o + 3] / 255, oa = a + da * (1 - a);
      D[o] = (GLOW[0] * a + D[o] * da * (1 - a)) / oa;
      D[o + 1] = (GLOW[1] * a + D[o + 1] * da * (1 - a)) / oa;
      D[o + 2] = (GLOW[2] * a + D[o + 2] * da * (1 - a)) / oa;
      D[o + 3] = oa * 255;
    }
  }
  PX.provide('08a-amphoreus-disc', { amphoreusDisc: amphoreusDisc });
})(window.__abPixel = window.__abPixel || {});

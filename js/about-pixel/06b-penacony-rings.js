// Penacony: lower structure and outer cloud terrace.
(function (PX) {
  'use strict';
  PX.need('06b-penacony-rings', ['Raster', 'atlasDraw', 'clamp', 'mix']);
  var Raster = PX.Raster, atlasDraw = PX.atlasDraw, clamp = PX.clamp, mix = PX.mix;
  function penaconyBase(r, F) { atlasDraw(r, F, 'penacony-base', [128, 235, 256, 256], { detail: true }); }
  function penaconyRing(r, F, t) {
    atlasDraw(r, F, 'penacony-ring', [0, 6, 512, 512], {
      detail: true, flow: Math.max(1, F.s * 4), time: -t * 0.6,
      flowMask: function (u, v, c) {
        var radius = Math.hypot((u - 0.5) / 0.33, (v - 0.519) / 0.092);
        return radius > 0.68 && radius < 0.95 && c[2] > c[0] * 0.95 && c[1] > c[0] * 0.9;
      },
      shade: function (c, u, v) {
        var l = Math.max(c[0], c[1], c[2]);
        var crest = Math.pow(Math.max(0, Math.sin(u * 16 + v * 9 - t * 0.65)), 8);
        var water = c[2] > c[0] * 0.75 && c[1] > c[0] * 0.75;
        var highlight = Math.pow(clamp((c[0] * 0.25 + c[1] * 0.6 + c[2] * 0.15 - 115) / 110, 0, 1), 0.7);
        return mix(c, '#f7fbff', l > 95 && water ? Math.min(0.94, 0.16 + highlight * 0.72 + crest * 0.1) : crest * 0.03);
      }
    });
  }
  function penaconyDiskGlow(r, F) {
    var bloom = r._penaconyBloom;
    if (!bloom) {
      var left = Math.max(0, Math.floor(F.x + 72 * F.s)), top = Math.max(0, Math.floor(F.y + 200 * F.s));
      var w = Math.min(r.w - left, Math.ceil(368 * F.s)), h = Math.min(r.h - top, Math.ceil(134 * F.s));
      var mask = new Float32Array(w * h), horizontal = new Float32Array(w * h);
      var radius = Math.max(1, Math.ceil(F.s * 5)), weights = [], total = 0;
      for (var k = -radius; k <= radius; k++) {
        var weight = Math.exp(-k * k / (radius * radius * 0.5));
        weights.push(weight); total += weight;
      }
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var at = ((y + top) * r.w + x + left) * 4, d = r.d;
        if (d[at + 2] < d[at] * 0.88) continue;
        var luminance = d[at] * 0.25 + d[at + 1] * 0.6 + d[at + 2] * 0.15;
        mask[y * w + x] = Math.pow(clamp((luminance - 190) / 65, 0, 1), 1.4) * d[at + 3] / 255;
      }
      // Cache a soft emission fringe from the actual white water highlights.
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        var sum = 0;
        for (var dx = -radius; dx <= radius; dx++) if (xx + dx >= 0 && xx + dx < w) sum += mask[yy * w + xx + dx] * weights[dx + radius];
        horizontal[yy * w + xx] = sum / total;
      }
      var halo = new Raster(w, h, 0, 0);
      for (var by = 0; by < h; by++) for (var bx = 0; bx < w; bx++) {
        var value = 0;
        for (var dy = -radius; dy <= radius; dy++) if (by + dy >= 0 && by + dy < h) value += horizontal[(by + dy) * w + bx] * weights[dy + radius];
        halo.px(bx, by, '#d2ecff', value / total * 0.65 * (1 - mask[by * w + bx] * 0.55));
      }
      bloom = r._penaconyBloom = { raster: halo, x: left, y: top };
    }
    r.blit(bloom.raster, bloom.x, bloom.y);
  }
  PX.provide('06b-penacony-rings', { penaconyBase: penaconyBase, penaconyRing: penaconyRing, penaconyDiskGlow: penaconyDiskGlow });
})(window.__abPixel = window.__abPixel || {});

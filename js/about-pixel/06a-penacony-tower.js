// Penacony: Art Deco spire, clock face and inner terrace.
(function (PX) {
  'use strict';
  PX.need('06a-penacony-tower', ['atlasDraw', 'atlasPoint', 'clamp', 'mix']);
  var atlasDraw = PX.atlasDraw, atlasPoint = PX.atlasPoint, clamp = PX.clamp, mix = PX.mix;
  function cloudMask(u, v, c) {
    var cool = c[2] >= c[0] * 0.95 && c[1] >= c[0] * 0.93 && Math.max(c[0], c[1], c[2]) > 115;
    var terrace = Math.hypot((u - 0.5) / 0.185, (v - 0.695) / 0.05);
    var wisps = (u > 0.39 && u < 0.482 && v > 0.586 && v < 0.617) ||
      (u > 0.554 && u < 0.622 && v > 0.599 && v < 0.634);
    return cool && (wisps || (terrace > 0.68 && terrace < 0.96 && v < 0.728));
  }
  function penaconyTower(r, F, t) {
    atlasDraw(r, F, 'penacony-tower', [0, -116, 512, 512], {
      detail: true,
      flow: Math.max(1, F.s * 3), time: t * 0.65, flowMask: cloudMask,
      shade: function (c, u, v) {
        var terrace = Math.hypot((u - 0.5) / 0.185, (v - 0.695) / 0.05);
        var water = c[2] > c[0] * 0.75 && c[1] > c[0] * 0.75;
        if (terrace > 0.45 && terrace < 1.1 && water && Math.max(c[0], c[1], c[2]) > 95) {
          var highlight = Math.pow(clamp((c[0] * 0.25 + c[1] * 0.6 + c[2] * 0.15 - 110) / 110, 0, 1), 0.7);
          c = mix(c, '#f7fbff', 0.2 + highlight * 0.74);
        }
        if (cloudMask(u, v, c)) {
          var drift = 0.5 + 0.5 * Math.sin(u * 58 + v * 21 - t * 0.85);
          c = mix(c, '#e0edff', drift * 0.13);
        }
        var clock = Math.hypot((u - 0.5) / 0.054, (v - 0.68) / 0.056);
        var gold = c[0] > c[2] * 1.25 && c[0] > 110;
        if (clock < 1 && gold) c = mix(c, '#fff0a9', 0.38 + 0.18 * clamp((c[0] - 150) / 105, 0, 1));
        return c;
      }
    });
  }
  function penaconyClockLight(r, F, t) {
    var clock = atlasPoint(F, 256, 233);
    var pulse = Math.pow(0.5 + 0.5 * Math.cos(t * Math.PI * 2 / 5.8), 2);
    r.glow(clock[0], clock[1], 0, 31 * F.s, '#ffd183', 0.46 * pulse);
    r.disc(clock[0], clock[1], 22 * F.s, function (x, y, dx, dy, d) {
      return ['#fff1c8', pulse * 0.2 * (1 - d * d)];
    });
    F.clockGlow = pulse;
  }
  PX.provide('06a-penacony-tower', { penaconyTower: penaconyTower, penaconyClockLight: penaconyClockLight });
})(window.__abPixel = window.__abPixel || {});

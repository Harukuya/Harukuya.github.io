// Slow blue-grey smoke behind the station, independent of the fixed hull.
(function (PX) {
  'use strict';
  PX.need('05l-station-nebula', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  var clouds = [
    { rect: [45, 125, 300, 290], phase: 0.4, alpha: 0.35 },
    { rect: [140, 65, 300, 260], phase: 2.3, alpha: 0.4 },
    { rect: [245, 165, 240, 270], phase: 4.5, alpha: 0.27 }
  ];
  function stationNebula(r, F, t) {
    clouds.forEach(function (C, i) {
      var phase = t * (0.14 + i * 0.025) + C.phase;
      atlasDraw(r, F, 'luofu-smoke', C.rect, {
        dx: Math.sin(phase) * F.s * 5, dy: Math.cos(phase * 0.8) * F.s * 3,
        wave: Math.max(F.pixelDensity || 1, F.s * 1.5), flow: 1, time: phase,
        alpha: C.alpha * (0.97 + 0.03 * Math.sin(phase)),
        shade: function (c) { return mix(c, '#92afcd', 0.55); }
      });
    });
  }
  PX.provide('05l-station-nebula', { stationNebula: stationNebula });
})(window.__abPixel = window.__abPixel || {});

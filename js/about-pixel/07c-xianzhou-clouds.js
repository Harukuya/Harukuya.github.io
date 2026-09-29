// Luofu: elongated drifting stern scrolls with independent phases.
(function (PX) {
  'use strict';
  PX.need('07c-xianzhou-clouds', ['atlasDraw', 'mix']);
  var atlasDraw = PX.atlasDraw, mix = PX.mix;
  var clouds = [
    { name: 'luofu-cloud-2', rect: [600, -55, 430, 215], phase: 0.2 },
    { name: 'luofu-cloud-3', rect: [775, -85, 240, 180], phase: 2.1 },
    { name: 'luofu-cloud-1', rect: [720, 168, 175, 58], phase: 4.2 },
    { name: 'luofu-cloud-4', rect: [785, 170, 220, 210], phase: 1.4 }
  ];
  function xianzhouClouds(r, F, t, front) {
    clouds.forEach(function (C, i) {
      if ((i > 1) !== front) return;
      var phase = t * (0.23 + i * 0.04) + C.phase;
      atlasDraw(r, F, C.name, C.rect, {
        detail: !!F.detail,
        dx: Math.sin(phase) * F.s * 14, dy: Math.cos(phase * 0.7) * F.s * 5,
        wave: Math.max(F.pixelDensity || 1, F.s * 3), flow: 2, time: phase,
        alpha: 0.76 + 0.14 * Math.sin(phase),
        shade: function (c, u, v) { return mix(c, '#dcffed', Math.max(0, Math.sin(u * 9 - phase)) * 0.12); }
      });
    });
  }
  PX.provide('07c-xianzhou-clouds', { xianzhouClouds: xianzhouClouds });
})(window.__abPixel = window.__abPixel || {});

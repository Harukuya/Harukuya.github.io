// Amphoreus: full star-centred dark disc and thin prismatic rim.
(function (PX) {
  'use strict';
  PX.need('08a-amphoreus-disc', ['Raster', 'atlasDraw', 'atlasPoint', 'band', 'clamp', 'fbm2', 'mix']);
  var atlasDraw = PX.atlasDraw, atlasPoint = PX.atlasPoint, band = PX.band,
    clamp = PX.clamp, fbm2 = PX.fbm2, mix = PX.mix, Raster = PX.Raster, cache = null;
  function amphoreusDisc(r, F, t) {
    var C = atlasPoint(F, F.lightCenter[0], F.lightCenter[1]), R = 292 * F.s;
    r.glow(C[0], C[1], R * 0.89, R * 1.22, '#315ce3', 0.46 + 0.035 * Math.sin(t * 0.8));
    var key = [r.w, r.h, r.ox, r.oy, C[0], C[1], R].join(':');
    if (!cache || cache.key !== key) {
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
      cache = { key: key, r: base };
    }
    r.blit(cache.r, -r.ox, -r.oy);
    atlasDraw(r, F, 'amphoreus-glow', [F.lightCenter[0] - 438, F.lightCenter[1] - 438, 876, 876], {
      detail: !!F.detail,
      alpha: 0.35 + 0.035 * Math.sin(t * 0.8),
      opacity: function (u, v) {
        var d = Math.hypot(u - 0.5, v - 0.5) * 2;
        return clamp((d - 0.56) * 8, 0, 1);
      }
    });
  }
  PX.provide('08a-amphoreus-disc', { amphoreusDisc: amphoreusDisc });
})(window.__abPixel = window.__abPixel || {});

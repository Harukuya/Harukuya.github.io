// Three glints follow the original cyan beams, without moving their endpoints.
(function (PX) {
  'use strict';
  PX.need('05m-station-signals', ['atlasPoint', 'lerp']);
  var atlasPoint = PX.atlasPoint, lerp = PX.lerp;
  var beams = [[440, 381, 508, 412], [439, 391, 505, 424], [437, 399, 496, 432]];
  function stationSignals(r, F, t) {
    beams.forEach(function (B, i) {
      var head = (t * 0.14 + i / 3) % 1;
      for (var step = 0; step < 6; step++) {
        var u = head - step * 0.018;
        if (u < 0) continue;
        var p = atlasPoint(F, lerp(B[0], B[2], u), lerp(B[1], B[3], u));
        var alpha = (0.3 - step * 0.04) * (1 - u * 0.3), density = F.pixelDensity || 1;
        if (density > 1) r.rect(p[0], p[1], density, density, '#ddffff', alpha);
        else r.px(p[0], p[1], '#ddffff', alpha);
      }
    });
  }
  PX.provide('05m-station-signals', { stationSignals: stationSignals });
})(window.__abPixel = window.__abPixel || {});

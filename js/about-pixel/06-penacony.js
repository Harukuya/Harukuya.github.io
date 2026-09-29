// Penacony assembly: camera fit and back-to-front part order.
(function (PX) {
  'use strict';
  PX.need('06-penacony', ['Raster', 'atlasFrame', 'atlasLoad', 'atlasPoint', 'penaconyBase', 'penaconyClockLight', 'penaconyCloudParts', 'penaconyClouds', 'penaconyDiskGlow', 'penaconyRing', 'penaconyTower']);
  var atlasFrame = PX.atlasFrame, atlasLoad = PX.atlasLoad, penaconyBase = PX.penaconyBase,
    penaconyClouds = PX.penaconyClouds, penaconyRing = PX.penaconyRing, penaconyTower = PX.penaconyTower,
    Raster = PX.Raster, atlasPoint = PX.atlasPoint, penaconyCloudParts = PX.penaconyCloudParts, penaconyClockLight = PX.penaconyClockLight,
    penaconyDiskGlow = PX.penaconyDiskGlow;
  // Reference tip (423, 17) to clock centre (380, 443): atan(43 / 426).
  var TILT = 5.8 * Math.PI / 180;
  var parts = [
    { name: 'penacony-tower', rect: [0, -116, 512, 512] },
    { name: 'penacony-ring', rect: [0, 6, 512, 512] },
    { name: 'penacony-base', rect: [128, 235, 256, 256] },
    { name: 'penacony-cloud-back', rect: penaconyCloudParts.back },
    { name: 'penacony-cloud-front', rect: penaconyCloudParts.front }
  ];
  function loadPenacony() { return atlasLoad(parts.map(function (p) { return p.name; }).concat(['penacony-glow'])); }
  function tiltedLayer(r, F) {
    var key = [r.w, r.h, r.ox, r.oy, F.x, F.y, F.s].join(':');
    if (r._penacony && r._penacony.key === key) return r._penacony;
    var frame = { x: 32 * F.s + 2, y: 144 * F.s + 2, s: F.s };
    var source = new Raster(Math.ceil(576 * F.s) + 4, Math.ceil(744 * F.s) + 4, 0, 0);
    var pivot = atlasPoint(F, 256, 245), localPivot = atlasPoint(frame, 256, 245);
    var cr = Math.cos(TILT), sr = Math.sin(TILT), indices = new Int32Array(r.w * r.h);
    indices.fill(-1);
    // Inverse nearest-neighbour sampling keeps the shared tilt free of pinholes.
    for (var y = 0; y < r.h; y++) for (var x = 0; x < r.w; x++) {
      var dx = x - r.ox - pivot[0], dy = y - r.oy - pivot[1];
      var sx = Math.round(localPivot[0] + dx * cr + dy * sr);
      var sy = Math.round(localPivot[1] - dx * sr + dy * cr);
      if (sx >= 0 && sy >= 0 && sx < source.w && sy < source.h) indices[y * r.w + x] = (sy * source.w + sx) * 4;
    }
    return (r._penacony = { key: key, frame: frame, source: source, indices: indices, pivot: pivot });
  }
  function drawPenaconyBig(r, g, t) {
    var fit = atlasFrame(g, 'penacony', parts, { tall: true, anchor: [256, 245], keep: [[250, 0]], zoom: 1.05 });
    if (!fit) return;
    var density = r.pixelDensity || 1;
    var F = { x: fit.x * density, y: fit.y * density, s: fit.s * density };
    var layer = tiltedLayer(r, F), source = layer.source, local = layer.frame;
    source.clear();
    penaconyBase(source, local);
    penaconyClouds(source, local, t, false);
    penaconyRing(source, local, t);
    penaconyTower(source, local, t);
    penaconyDiskGlow(source, local);
    penaconyClouds(source, local, t, true);
    penaconyClockLight(source, local, t);
    var d = r.d, s = source.d;
    for (var i = 0; i < layer.indices.length; i++) {
      var k = layer.indices[i];
      if (k < 0 || !s[k + 3]) continue;
      var at = i * 4, a = s[k + 3] / 255, da = d[at + 3] / 255;
      if (a === 1 || !da) {
        d[at] = s[k]; d[at + 1] = s[k + 1]; d[at + 2] = s[k + 2]; d[at + 3] = s[k + 3];
      } else {
        var oa = a + da * (1 - a);
        for (var c = 0; c < 3; c++) d[at + c] = (s[k + c] * a + d[at + c] * da * (1 - a)) / oa;
        d[at + 3] = oa * 255;
      }
    }
    fit.tiltDegrees = 5.8; fit.clockGlow = local.clockGlow;
  }
  PX.provide('06-penacony', { drawPenaconyBig: drawPenaconyBig, loadPenacony: loadPenacony });
})(window.__abPixel = window.__abPixel || {});

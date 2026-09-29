// Herta station: original fixed-view atlas, pixel sampling and separate effects.
// 取景比原来缩小 10%（zoom 0.95 → 0.855）；灯光（05o-station-lights）画在景色上面单独的高帧率层里（drawStationFx，见 10-mount 的 view-fx 层）。
(function (PX) {
  'use strict';
  PX.need('05j-station', ['atlasFrame', 'atlasLoad', 'stationAtlasBody', 'stationLights', 'stationNebula', 'stationSignals']);
  var atlasFrame = PX.atlasFrame, atlasLoad = PX.atlasLoad, stationAtlasBody = PX.stationAtlasBody,
    stationLights = PX.stationLights, stationNebula = PX.stationNebula, stationSignals = PX.stationSignals;
  var parts = [{ name: 'station-body', rect: [0, 0, 512, 512] }];
  function loadStation() { return atlasLoad(['station-body', 'luofu-smoke']); }
  function frameOf(g) { return atlasFrame(g, 'station', parts, { anchor: [257, 250], keep: [[57, 185], [442, 385]], zoom: 0.855 }); }
  function drawStationBig(r, g, t) {
    var F = frameOf(g);
    if (!F) return;
    var density = r.pixelDensity || 1;
    if (density > 1) F = { x: F.x * density, y: F.y * density, s: F.s * density,
      pixelDensity: density, detail: true };
    stationNebula(r, F, t);
    stationAtlasBody(r, F, t);
    stationSignals(r, F, t);
  }
  function drawStationFx(r, g, t) {
    var F = frameOf(g);
    if (F) stationLights(r, F, t);
  }
  PX.provide('05j-station', { drawStationBig: drawStationBig, drawStationFx: drawStationFx, loadStation: loadStation });
})(window.__abPixel = window.__abPixel || {});

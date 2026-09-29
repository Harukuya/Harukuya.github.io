// Luofu assembly: reference orientation, window fit and part occlusion.
// 取景比原来缩小 10%（zoom 0.72 → 0.648）。
(function (PX) {
  'use strict';
  PX.need('07-xianzhou', ['atlasFrame', 'atlasLoad', 'xianzhouBody', 'xianzhouGlow', 'xianzhouClouds', 'xianzhouDetail', 'xianzhouDetailParts', 'xianzhouRibbon']);
  var atlasFrame = PX.atlasFrame, atlasLoad = PX.atlasLoad, xianzhouBody = PX.xianzhouBody,
    xianzhouGlow = PX.xianzhouGlow, xianzhouClouds = PX.xianzhouClouds, xianzhouDetail = PX.xianzhouDetail, xianzhouRibbon = PX.xianzhouRibbon;
  var parts = [
    { name: 'luofu-body', rect: [0, 0, 1000, 500] },
    { name: 'luofu-ribbon', rect: [330, -40, 680, 540] }
  ].concat(PX.xianzhouDetailParts);
  function loadXianzhou() {
    return atlasLoad(['luofu-body', 'luofu-ribbon', 'luofu-detail', 'luofu-smoke', 'luofu-cloud-1', 'luofu-cloud-2', 'luofu-cloud-3', 'luofu-cloud-4']);
  }
  function drawXianzhouBig(r, g, t) {
    var F = atlasFrame(g, 'xianzhou', parts, { anchor: [520, 245], zoom: 0.648 });
    if (!F) return;
    var density = r.pixelDensity || 1;
    if (density > 1) F = { x: F.x * density, y: F.y * density, s: F.s * density,
      detail: true, pixelDensity: density };
    xianzhouClouds(r, F, t, false);
    xianzhouDetail(r, F, t);
    xianzhouBody(r, F, t);
    xianzhouRibbon(r, F, t);
    xianzhouClouds(r, F, t, true);
    xianzhouGlow(r, F, t);
  }
  PX.provide('07-xianzhou', { drawXianzhouBig: drawXianzhouBig, loadXianzhou: loadXianzhou });
})(window.__abPixel = window.__abPixel || {});

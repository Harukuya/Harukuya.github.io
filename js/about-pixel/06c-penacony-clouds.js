// Penacony: rear / front cloud scrolls, counterflow and gentle deformation.
// 两条螺旋云带里的色块沿螺旋往卷心流（fx.advect，见 03-advect）：方向场沿每条云带的中线（贴图坐标，从尾巴到卷心）建，
// 前面那条从右上往左下、在左下卷回来，后面那条从左上往右下、在右下卷回来——两条绕着倒尖塔反向流，像一个漩涡；轮廓不动，只有里面的颜色在流。
(function (PX) {
  'use strict';
  PX.need('06c-penacony-clouds', ['advectField', 'atlasDraw']);
  var advectField = PX.advectField, atlasDraw = PX.atlasDraw;
  var penaconyCloudParts = { front: [-10, 64, 512, 512], back: [0, 43, 512, 512] };
  var PATHS = {
    front: [[415, 160], [385, 190], [340, 220], [290, 245], [240, 262], [205, 278], [183, 300], [180, 325], [193, 348], [220, 364], [260, 372], [300, 369]],
    back: [[130, 188], [190, 200], [250, 214], [300, 234], [340, 258], [370, 288], [388, 320], [385, 352], [362, 380], [325, 398], [285, 402]]
  };
  var FIELD = {}, GRID = 64, LEN = 30, PERIOD = 2.2;
  function field(key) { return FIELD[key] || (FIELD[key] = advectField(PATHS[key], 512, 512, GRID, GRID)); }
  function penaconyClouds(r, F, t, front) {
    var phase = front ? -t * 0.4 + 1.7 : t * 0.3;
    // The glow texture is a compact flare: align it with the clock, not the outer ring.
    if (!front) atlasDraw(r, F, 'penacony-glow', [128, 105, 256, 256], { alpha: 0.32 + 0.08 * Math.sin(phase) });
    atlasDraw(r, F, front ? 'penacony-cloud-front' : 'penacony-cloud-back',
      front ? penaconyCloudParts.front : penaconyCloudParts.back, {
        wave: Math.max(1, F.s * 3), time: phase,
        dx: Math.sin(phase) * F.s * 4, dy: (Math.cos(phase * 0.8) * 2 - (front ? 12 : 0)) * F.s,
        advect: { mode: 'field', field: field(front ? 'front' : 'back'), gw: GRID, gh: GRID, len: LEN * F.s, phase: t / PERIOD + (front ? 0.3 : 0), mix: 0.5 }
      });
  }
  PX.provide('06c-penacony-clouds', { penaconyClouds: penaconyClouds, penaconyCloudParts: penaconyCloudParts });
})(window.__abPixel = window.__abPixel || {});

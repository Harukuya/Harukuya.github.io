// About 页像素 Hero · 05o-station-lights：空间站「黑塔」的灯光（画在窗外景色上面单独的一层，帧率比景色层高，闪得顺）
// 位置用素材贴图（station-body，512×512）里的坐标，经同一个取景 F 换到画面：
//   · 红色信标（慢慢亮起、熄灭，各有相位）：左上那根最长天线的尖、环右边尖刺的尖、左下那根杆的尖、鼻段背上那根小天线的尖；
//   · 白色频闪（航空灯那样一次闪两下）：两块太阳能板的外端、大环顶上；大环左侧一盏绿色航行灯；
//   · 梁头顶上那盏橙灯一闪一闪；梁头射出光束的地方一团青光呼吸；
//   · 长梁侧面一排琥珀色小灯，一道亮光沿着它们往梁头跑（跑马灯）；枢纽舱上几盏暖色小灯轻轻闪烁。
// 只在这一层画，不碰素材版的站体（素材版 + cel 上色照旧在景色层）。
(function (PX) {
  'use strict';

  PX.need('05o-station-lights', ['atlasPoint', 'clamp', 'lerp']);
  var atlasPoint = PX.atlasPoint, clamp = PX.clamp, lerp = PX.lerp;

  var BEACONS = [[6, 65, 0], [266, 160, 0.35], [75, 340, 0.62], [268, 222, 0.85]];
  var STROBES = [[94, 287, 0], [199, 343, 0.33], [119, 116, 0.6]];
  var WARM = [[302, 300, 0.2], [321, 304, 1.3], [230, 293, 2.1], [224, 275, 2.9]];
  var CHASE = { a: [336, 338], b: [420, 381], n: 9 };

  // 一盏灯：芯 1 ~ 2 像素（按画面大小），外面一圈辉光；a 为亮度 0 ~ 1
  function lamp(r, x, y, s, core, glow, a, size) {
    if (a <= 0.02) return;
    size = size || 1;
    x = Math.round(x); y = Math.round(y);
    r.glow(x + 0.5, y + 0.5, 0.3, (7 + 7 * size) * s * (0.7 + 0.3 * a), glow, 0.8 * a);
    r.px(x, y, core, Math.min(1, a * 1.2));
    if (a > 0.45) {
      var ca = Math.min(1, (a - 0.45) * 1.6);
      r.px(x - 1, y, core, ca); r.px(x + 1, y, core, ca); r.px(x, y - 1, core, ca); r.px(x, y + 1, core, ca);
    }
  }
  function frac(v) { return v - Math.floor(v); }

  function stationLights(r, F, t) {
    var s = F.s;
    // 红色信标：1.6 秒一个周期，亮起的那一段是平滑的尖峰
    BEACONS.forEach(function (B) {
      var p = atlasPoint(F, B[0], B[1]), k = Math.pow(Math.max(0, Math.sin((t / 1.6 + B[2]) * Math.PI * 2)), 4);
      lamp(r, p[0], p[1], s, '#ffe0d8', '#ff3a2a', k, 1);
    });
    // 白色频闪：2.2 秒闪两下
    STROBES.forEach(function (S) {
      var p = atlasPoint(F, S[0], S[1]), f = frac(t / 2.2 + S[2]);
      var on = f < 0.03 || (f > 0.08 && f < 0.11);
      lamp(r, p[0], p[1], s, '#ffffff', '#cfe6ff', on ? 1 : 0, 1.2);
    });
    // 大环左侧的绿色航行灯：常亮、轻轻呼吸
    var g = atlasPoint(F, 52, 189);
    lamp(r, g[0], g[1], s, '#e8ffe8', '#4dff8a', 0.65 + 0.2 * Math.sin(t * 1.3), 0.8);
    // 梁头顶上的橙灯
    var o = atlasPoint(F, 432, 342), fo = frac(t / 1.1);
    lamp(r, o[0], o[1], s, '#fff0c8', '#ff9a2a', fo < 0.45 ? 1 - fo / 0.45 * 0.6 : 0.15, 0.9);
    // 光束出口的青光
    var e = atlasPoint(F, 438, 389), pe = 0.6 + 0.25 * Math.sin(t * 5.2) + 0.15 * Math.sin(t * 13.7);
    r.glow(Math.round(e[0]) + 0.5, Math.round(e[1]) + 0.5, 0.3, 12 * s, '#5fd6ff', 0.6 * pe);
    r.px(e[0], e[1], '#e8feff', clamp(pe, 0, 1));
    // 长梁侧面的跑马灯：一排暗暗的琥珀色小灯，一道亮光往梁头跑（1.4 秒跑完，2.2 秒一趟）
    var head = frac(t / 2.2) / (1.4 / 2.2);
    for (var i = 0; i < CHASE.n; i++) {
      var u = i / (CHASE.n - 1), q = atlasPoint(F, lerp(CHASE.a[0], CHASE.b[0], u), lerp(CHASE.a[1], CHASE.b[1], u));
      var d = head - u, hot = d >= 0 && d < 0.25 ? 1 - d / 0.25 : 0;
      r.px(q[0], q[1], hot > 0.5 ? '#fff0c8' : '#ffb43c', 0.45 + 0.55 * hot);
      if (hot > 0.2) r.glow(Math.round(q[0]) + 0.5, Math.round(q[1]) + 0.5, 0.3, 6 * s, '#ffb43c', 0.7 * hot);
    }
    // 枢纽舱上几盏暖色小灯：各自慢慢明暗
    WARM.forEach(function (W) {
      var p = atlasPoint(F, W[0], W[1]), k = 0.45 + 0.35 * Math.sin(t * 2.1 + W[2]) + 0.2 * Math.sin(t * 7.3 + W[2] * 3);
      lamp(r, p[0], p[1], s, '#ffe7a8', '#ffb43c', clamp(k, 0, 1) * 0.8, 0.6);
    });
  }

  PX.provide('05o-station-lights', { stationLights: stationLights });
})(window.__abPixel = window.__abPixel || {});

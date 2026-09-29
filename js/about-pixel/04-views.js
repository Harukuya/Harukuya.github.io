// About 页像素 Hero · 04-views：舷窗外景色的共用部分：各景色的光照参数 VIEW_LIGHT、雅利洛-VI、云 / 光带小工具
// 独立作用域：只能用下面 PX.need 声明过的别的文件的名字；给别的文件用的东西在末尾 PX.provide 里列出（机制见 01-core.js 开头）
(function (PX) {
  'use strict';

  PX.need('04-views', ['band', 'clamp', 'dith', 'fbm2', 'lerp', 'mix', 'noise2']);
  var band = PX.band, clamp = PX.clamp, dith = PX.dith, fbm2 = PX.fbm2, lerp = PX.lerp, mix = PX.mix,
    noise2 = PX.noise2;

  // ========== 舷窗外的景色 ==========
  // 雅利洛逐像素画球冠；其余航图以本地部件固定视角分层绘制。
  // 05 / 06 / 07 / 08 的主体按舷窗遮罩取景，约八成可见，不含金色选择框。
  var VIEW_LIGHT = {
    jarilo: { sky: ['#150a33', '#0a0c34', '#0b1a5a', '#12339c'], glow: '#9cc4ff', rim: '#e6f0ff', shadow: '#141a3a', neb: '#3a5aa8', cast: '#8fb2ff', castA: 0.1 },
    penacony: { sky: ['#130a31', '#0a0b36', '#101a60', '#1c2c8e'], glow: '#7aa2ff', rim: '#dde6ff', shadow: '#141736', neb: '#4b3fa8', cast: '#8c88ff', castA: 0.14 },
    station: { sky: ['#110a2c', '#090b30', '#0c1a52', '#142c80'], glow: '#a8c8ff', rim: '#e8f0ff', shadow: '#131a34', neb: '#3a5ab0', cast: '#92acff', castA: 0.08 },
    xianzhou: { sky: ['#07101c', '#061a24', '#083036', '#0d4a4a'], glow: '#7fe0b8', rim: '#dcffee', shadow: '#10231f', neb: '#2f8f78', cast: '#5ed8b2', castA: 0.34 },
    amphoreus: { sky: ['#0e0830', '#080a3a', '#0c1a70', '#1530a8'], glow: '#6f9cff', rim: '#e2e9ff', shadow: '#12163a', neb: '#3c4fd0', cast: '#5a74ff', castA: 0.16 }
  };

  // Catmull-Rom 样条（每段 n 个采样点；二维 / 三维点都行）
  function spline(pts, n) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t, q = [];
        for (var j = 0; j < p1.length; j++) q.push(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
        out.push(q);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  // 沿折线画一条变宽的带：width(t) 像素宽，col(t, w) → 颜色 / [颜色, 透明度] / null（t 沿长度 0~1，w 横向 -1~1）
  function strip(r, pts, width, col) {
    var acc = [0], total = 0;
    for (var i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(total); }
    if (total <= 0) return;
    var steps = Math.ceil(total * 2), j = 0;
    for (var s = 0; s <= steps; s++) {
      var L = total * s / steps;
      while (j < pts.length - 2 && acc[j + 1] < L) j++;
      var f = (L - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
      var x = lerp(pts[j][0], pts[j + 1][0], f), y = lerp(pts[j][1], pts[j + 1][1], f);
      var dx = pts[j + 1][0] - pts[j][0], dy = pts[j + 1][1] - pts[j][1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
      var t = L / total, w = Math.max(0.6, width(t));
      for (var k = -w / 2; k <= w / 2 + 0.01; k += 0.5) {
        var c = col(t, k / (w / 2), x + nx * k, y + ny * k);
        if (!c) continue;
        if (c.length === 2 && typeof c[1] === 'number') r.px(x + nx * k, y + ny * k, c[0], c[1]);
        else r.px(x + nx * k, y + ny * k, c);
      }
    }
  }

  // 一团云：fbm 扰动边缘，上亮、中间、下暗三档
  function puff(r, cx, cy, rx, ry, seed, cols, alpha, soft) {
    r.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, function (px, py, dx, dy, d) {
      var n = fbm2(px * 0.12, py * 0.12, seed), edge = 0.45 + n * 0.65;
      if (d > edge) return null;
      if (soft && !dith(px, py, clamp((edge - d) / soft, 0, 1))) return null;
      var sh = dy / ry + (n - 0.5) * 0.9;
      var c = sh < -0.3 ? cols[0] : sh < 0.25 ? cols[1] : cols[2];
      return alpha < 1 ? [c, alpha] : c;
    });
  }

  // ---------- 雅利洛-VI：像参考图里的行星那样从窗底升起的巨大冰雪星球（露出上半个球冠）；
  //            白灰地表带淡淡的灰色云斑，一簇簇细碎的蕾丝状蓝色冰纹；左上受光、右侧渐入蓝灰暗面；外圈一层亮白大气 ----------
  function drawJariloBig(r, g) {
    var P = g.planet, R = P.R, cx = P.x, cy = P.y;
    var L = [-0.38, -0.72, 0.58];
    r.glow(cx, cy, R, R * 1.13, [120, 176, 255], 0.5);
    r.glow(cx, cy, R, R * 1.04, [214, 234, 255], 0.9);
    var y0 = Math.max(Math.floor(cy - R), -g.m), y1 = Math.min(Math.ceil(cy + R), g.H + g.m);
    var shade = ['#3a3f4c', '#484e5c', '#585f6e', '#6a7282', '#7e8696', '#939aa9', '#a8afbc', '#bcc2cd', '#cfd4dc', '#dfe3e9', '#ecf0f4', '#f7f9fb'];
    for (var py = y0; py < y1; py++) {
      var span = Math.sqrt(Math.max(0, R * R - Math.pow(py + 0.5 - cy, 2)));
      for (var px = Math.max(-g.m, Math.floor(cx - span)); px <= Math.min(g.W + g.m, cx + span); px++) {
        if (!g.fullView && py > g.sillAt(px) + 2) continue;   // 平时窗台下面被舱壁挡着不画；hero 退场挪走舱室时（10-mount fillSky）画完整
        var nx = (px + 0.5 - cx) / R, ny = (py + 0.5 - cy) / R, q = nx * nx + ny * ny;
        if (q > 1) continue;
        var nz = Math.sqrt(1 - q);
        var lam = nx * L[0] + ny * L[1] + nz * L[2];
        // 球面坐标（纹理贴着球面弯，越靠边越挤）
        var lon = Math.atan2(nx, nz), lat = Math.asin(clamp(ny, -1, 1));
        var u = lon * g.jk, v = lat * g.jk;
        var mott = fbm2(u * 1.1 + 11, v * 1.4 + 3, 41);
        var c = band(shade, clamp(lam * 1.15 + 0.12 + (mott - 0.5) * 0.12, 0, 1), px, py);
        // 冰纹：只在几簇区域里（patch 高）出现，簇里是细碎的树枝状蓝纹，簇心更密
        var patch = fbm2(u * 0.38 + 2, v * 0.55 + 7, 47);
        if (patch > 0.56) {
          var k = clamp((patch - 0.56) / 0.14, 0, 1);
          var ridge = 1 - Math.abs(fbm2(u * 2.1 + 5, v * 2.6 + 9, 43) * 2 - 1);
          var fine = noise2(u * 8 + 1, v * 10 + 3, 44);
          if (ridge > 0.92 - k * 0.12 || (k > 0.6 && fine > 0.84 - k * 0.1)) {
            c = mix(c, ridge > 0.955 || fine > 0.88 ? '#3a6ec2' : '#6c9cdc', clamp(0.45 + lam * 0.5, 0.3, 0.92));
          }
        }
        if (q > 0.93) c = mix(c, '#dceaff', (q - 0.93) / 0.07 * 0.7);
        r.px(px, py, c);
      }
    }
  }

  PX.provide('04-views', { VIEW_LIGHT: VIEW_LIGHT, drawJariloBig: drawJariloBig, puff: puff, spline: spline,
    strip: strip });
})(window.__abPixel = window.__abPixel || {});

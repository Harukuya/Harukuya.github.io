// 06-cafe-bar：右边的砖墙和吧台
// 砖墙：正中上方一块霓虹招牌（橙色咖啡杯 + 青色 TECH、粉色 CAFE，白天暗、夜里亮，偶尔闪一下；离墙顶的横梁留一段空）；
//       招牌下面两层浮板木架——上层三罐咖啡豆、一只帕姆小摆件、几本书、一盆垂下来的绿萝；下层三只马克杯、两瓶糖浆、一辆星穹列车模型、一盆仙人掌，
//       下层底下一排挂钩挂着杯子，架子底下的暖光灯带（黄昏 / 夜里亮）；
//       左边一只木框挂钟（指针交给 fx 走）+ 一块软木板（三张拍立得、一张便签、一张票根）；
//       右边一块木框黑板菜单（粉笔字：MENU、几样咖啡和价格、今日特调 FIREFLY LATTE、角落画一只杯子），上面一盏黄铜画灯。
// 吧台：胡桃木竖条正面、黄铜踏脚杆、厚木台面（左端露出侧面）；台面上：磨豆机、双头意式咖啡机（压力表、蒸汽棒、杯架上一排杯子、红色指示灯）、
//       玻璃罩蛋糕架（草莓奶油蛋糕切了一角）、收银平板 + 小费罐、黑胶唱机（唱片会转）+ 一摞靠着的唱片；吧台左端地上一袋咖啡豆。
// 吧台上方天花板里三盏筒灯。
(function (PX) {
  'use strict';

  PX.need('06-cafe-bar', ['cafeDepth', 'cafeHot', 'cafeRnd', 'cafeSpot', 'drawText', 'textWidth']);
  var cafeDepth = PX.cafeDepth, cafeHot = PX.cafeHot, rnd = PX.cafeRnd, cafeSpot = PX.cafeSpot, drawText = PX.drawText, textWidth = PX.textWidth;

  function pen(sp) { return function (ux, uy) { return [sp.x + ux * sp.k, sp.y + uy * sp.k]; }; }
  function bar(B, a, b, w, c) { B.capsule(a[0], a[1], b[0], b[1], w, w, c); }

  var FRONT_D = 150, BACK_D = 96, TOP_H = 80;   // 吧台前沿 / 后沿离墙、台高（家具单位）

  // ---------- 墙上 ----------
  function menu(B, ctx, x0, y0, x1, y1) {
    var s = ctx.L.s, fw = Math.max(2, Math.round(4 * s)), gs = Math.max(1, Math.round(s));
    B.rect(x0, y0, x1 - x0, y1 - y0, '#6a4a34');
    B.rect(x0, y0, x1 - x0, Math.max(1, s), '#8a6448');
    B.rect(x0 + fw, y0 + fw, x1 - x0 - 2 * fw, y1 - y0 - 2 * fw, '#2b3431');
    for (var i = 0; i < (x1 - x0) * (y1 - y0) * 0.04; i++) B.px(x0 + fw + rnd(i, 201) * (x1 - x0 - 2 * fw), y0 + fw + rnd(i, 202) * (y1 - y0 - 2 * fw), '#56605b', 0.5);   // 擦过的粉笔灰
    var cx = (x0 + x1) / 2, y = y0 + fw + 4 * gs, W = '#ebe7dc', Y = '#f2d27a', Pk = '#f3a9b8';
    drawText(B, cx - textWidth('MENU', gs * 2) / 2, y, 'MENU', W, gs * 2);
    y += 13 * gs;
    B.rect(cx - 14 * gs, y - 2 * gs, 28 * gs, gs, W, 0.6);
    [['LATTE', '28'], ['MOCHA', '30'], ['AMERICANO', '22'], ['FLAT WHITE', '30'], ['MATCHA', '32'], ['COLD BREW', '26'], ['CAKE', '26']].forEach(function (it) {
      if (y > y1 - 26 * gs) return;
      drawText(B, x0 + fw + 4 * gs, y, it[0], W, gs);
      drawText(B, x1 - fw - 4 * gs - textWidth(it[1], gs), y, it[1], Y, gs);
      y += 8 * gs;
    });
    y += 2 * gs;
    drawText(B, x0 + fw + 4 * gs, y, 'TODAY', Pk, gs);
    drawText(B, x0 + fw + 4 * gs, y + 7 * gs, 'FIREFLY', Y, gs);
    drawText(B, x0 + fw + 4 * gs, y + 14 * gs, 'LATTE', Y, gs);
    // 角落画一只冒气的杯子
    var dx = x1 - fw - 14 * gs, dy = y1 - fw - 12 * gs;
    B.rect(dx, dy, 8 * gs, gs, W); B.rect(dx, dy, gs, 7 * gs, W); B.rect(dx + 7 * gs, dy, gs, 7 * gs, W); B.rect(dx, dy + 6 * gs, 8 * gs, gs, W);
    B.rect(dx + 8 * gs, dy + 2 * gs, 2 * gs, gs, W); B.rect(dx + 9 * gs, dy + 2 * gs, gs, 3 * gs, W); B.rect(dx + 8 * gs, dy + 4 * gs, 2 * gs, gs, W);
    B.rect(dx + 2 * gs, dy - 4 * gs, gs, 2 * gs, W, 0.7); B.rect(dx + 5 * gs, dy - 5 * gs, gs, 3 * gs, W, 0.7);
  }

  // 黑板上方一盏黄铜小画灯（亮的时候照亮黑板）
  function menuLight(B, ctx, x0, x1, y0) {
    var k = ctx.L.ps, cx = (x0 + x1) / 2, T = ctx.T;
    B.rect(cx - 1 * k, y0 - 6 * k, 2 * k, 6 * k, '#8a6a32');
    B.capsule(cx, y0 - 5 * k, cx, y0 - 10 * k, 1.2 * k, 1.2 * k, '#b8903c');
    B.poly([[cx - 14 * k, y0 - 12 * k], [cx + 14 * k, y0 - 12 * k], [cx + 12 * k, y0 - 8 * k], [cx - 12 * k, y0 - 8 * k]], function (x, y) { return y < y0 - 11 * k ? '#e0b85a' : '#a8802e'; });
    if (T.lamps > 0) {
      ctx.E.rect(cx - 12 * k, y0 - 8 * k, 24 * k, Math.max(1, 0.8 * k), '#fff0c0');
      ctx.lights.push({ x: cx, y: y0 + 30 * k, rx: (x1 - x0) * 0.75, ry: 70 * k, col: [1, 0.8, 0.5], k: 0.7, on: 'lamps' });
    }
  }

  // 一袋咖啡豆（麻布袋，口卷着，印一个 TC，几颗豆子掉在地上）
  function sack(B, ctx, sp) {
    var k = sp.k, x = sp.x, y = sp.y;
    B.poly([[x - 15 * k, y], [x + 15 * k, y], [x + 17 * k, y - 20 * k], [x + 12 * k, y - 36 * k], [x - 12 * k, y - 36 * k], [x - 17 * k, y - 20 * k]], function (xx, yy) {
      var u = (xx - x) / k, v = (yy - y) / k, weave = (Math.floor(u + 40) + Math.floor(v + 60)) % 2;
      return u < -9 ? (weave ? '#c4a574' : '#b8996a') : u > 11 ? (weave ? '#8e7248' : '#846a42') : (weave ? '#b39464' : '#a8895a');
    });
    B.poly([[x - 13 * k, y - 36 * k], [x + 13 * k, y - 36 * k], [x + 11 * k, y - 40 * k], [x - 11 * k, y - 40 * k]], '#d8bd8a');
    for (var i = 0; i < 9; i++) B.ellipse(x - 8 * k + i * 2 * k, y - 38 * k - (i % 2) * 1.4 * k, 1.3 * k, 0.9 * k, 0.3, '#5a3a24');
    drawText(B, x - 5 * k, y - 24 * k, 'TC', '#6a4e30', Math.max(1, Math.round(k * 1.4)));
    for (var j = 0; j < 5; j++) B.ellipse(x + (18 + j * 3.4) * k, y - (j % 2) * 1.2 * k, 1.2 * k, 0.8 * k, 0.4, '#5a3a24');
    ctx.shadows.push({ x: x, y: y + 1, rx: 20 * k, ry: 4 * k, f: 0.55 });
  }

  function clock(B, ctx, x, y, r) {
    var T = ctx.T;
    B.disc(x, y, r + 2 * ctx.L.s, '#5a3e2c');
    B.disc(x, y, r, function (xx, yy, dx, dy) { return dx + dy < -r * 0.6 ? '#fbf4e4' : '#efe5cf'; });
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2, rr = i % 3 ? r * 0.82 : r * 0.74;
      B.line(x + Math.sin(a) * rr, y - Math.cos(a) * rr, x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9, '#3a302a');
    }
    // 这四个时间在钟上对应的时刻（指针由 fx 从这里开始走）
    ctx.fx.push({ kind: 'clock', lit: true, x: x, y: y, r: r, base: { dawn: 6 * 60 + 40, day: 14 * 60 + 10, dusk: 18 * 60 + 25, night: 22 * 60 + 50 }[T.id] });
  }

  // 霓虹：左边一只咖啡杯（橙），右边两行 3×5 像素字放大（青色 TECH、粉色 CAFE）；亮芯 + 彩色外圈 + 光晕；白天也开着但很淡。
  // mx = 整块招牌的水平中心，top = 最上沿（杯子上的热气）。灯管本身（不亮时的玻璃管）画进 B，亮光画进单独的层：
  // 杯子进 ctx.N、字进 ctx.N2（挂载时各一块画布，各闪各的，不会一起闪；关掉招牌时连光晕一起灭）
  // 字的光晕沿着灯管走：每个像素按离最近那格灯管的距离平滑变淡（透明度连续，不分档、不抖动）——字中间也有光，
  // 不像原来那样绕整个词画一圈、正中留个空洞
  function tubeHalo(E, m, x0, y0, col, amax, R) {
    var lit = [];
    for (var yy = 0; yy < m.h; yy++) for (var xx = 0; xx < m.w; xx++) if (m.get(xx, yy)) lit.push(xx, yy);
    for (var gy = -R; gy < m.h + R; gy++) {
      for (var gx = -R; gx < m.w + R; gx++) {
        if (m.get(gx, gy)) continue;   // 灯管本身另画
        var best = R * R + 1;
        for (var k = 0; k < lit.length; k += 2) {
          var dx = lit[k] - gx, dy = lit[k + 1] - gy, d2 = dx * dx + dy * dy;
          if (d2 < best) best = d2;
        }
        if (best > R * R) continue;
        var f = 1 - Math.sqrt(best) / (R + 1);
        E.px(x0 + gx, y0 + gy, col, amax * f * f);
      }
    }
  }
  // 平滑的圆形光（中心最亮、往外连续变淡，不抖动）
  function softGlow(E, cx, cy, r, col, amax) {
    for (var y = Math.floor(cy - r); y <= cy + r; y++) {
      for (var x = Math.floor(cx - r); x <= cx + r; x++) {
        var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r) continue;
        var f = 1 - d / r;
        E.px(x, y, col, amax * f * f);
      }
    }
  }

  function neon(B, ctx, mx, top, gs) {
    var T = ctx.T, a = 0.35 + 0.65 * T.neon, cu = gs * 2, E = ctx.N, E2 = ctx.N2 || ctx.N;
    var total = 24 * gs + textWidth('TECH', gs) + 2, x = Math.round(mx - total / 2), y = top + 6 * gs;
    function word(str) {
      var m = new PX.Raster(Math.ceil(textWidth(str, gs)) + 2, 5 * gs + 2, 0, 0);
      drawText(m, 1, 1, str, '#ffffff', gs);
      return m;
    }
    function tubes(m, x0, y0, core, col) {
      for (var yy = 0; yy < m.h; yy++) for (var xx = 0; xx < m.w; xx++) {
        if (!m.get(xx, yy)) continue;
        var edge = !m.get(xx - 1, yy) || !m.get(xx + 1, yy) || !m.get(xx, yy - 1) || !m.get(xx, yy + 1);
        B.px(x0 + xx, y0 + yy, '#8a8290');                         // 灯管本身（不亮时是灰白的玻璃管）
        E2.px(x0 + xx, y0 + yy, edge ? col : core, a);
      }
    }
    // 咖啡杯：杯身 + 把手 + 两缕热气（热气在最上面）
    var cy = y + 2 * gs;
    [[0, 0, 7, 1], [0, 0, 1, 6], [6, 0, 1, 6], [1, 6, 5, 1], [7, 1, 2, 1], [8, 1, 1, 3], [7, 3, 2, 1], [2, -3, 1, 2], [4, -4, 1, 3]].forEach(function (r) {
      for (var yy = 0; yy < r[3] * cu; yy++) {
        for (var xx = 0; xx < r[2] * cu; xx++) {
          B.px(x + r[0] * cu + xx, cy + r[1] * cu + yy, '#8a8290');
          E.px(x + r[0] * cu + xx, cy + r[1] * cu + yy, xx === 0 || yy === 0 ? '#ffb45a' : '#ffe2b0', a);
        }
      }
    });
    E.glow(x + 4 * cu, cy + 3 * cu, 3 * cu, 14 * cu, '#ff9a3a', 0.2 * T.neon + 0.03);
    var tx = x + 12 * cu, mT = word('TECH'), mC = word('CAFE'), yT = y - gs * 2, yC = y + gs * 5;
    // 字那层（ctx.N2）从下往上：招牌照在砖墙上的一片粉光（跟着字一起闪、关掉招牌时一起灭，不进光照图）→ 两个词的光晕 → 灯管
    softGlow(E2, mx, y + gs * 4, 30 * gs, '#ff6ab8', 0.1 * T.neon);
    tubeHalo(E2, mT, tx, yT, '#40e0d0', 0.3 * T.neon + 0.04, 3 * gs);
    tubeHalo(E2, mC, tx, yC, '#ff5fb0', 0.3 * T.neon + 0.04, 3 * gs);
    tubes(mT, tx, yT, '#e8fffb', '#40e0d0');
    tubes(mC, tx, yC, '#ffe9f4', '#ff5fb0');
    cafeHot(ctx, 'neon', [[x, top], [tx + textWidth('TECH', gs) + 2, y + gs * 10 + 2]], 3);
  }

  // 软木板：木框 + 软木（深浅斑点），钉着三张拍立得（窗外的海 / 樱花 / 夜空）、一张黄便签、一张票根，图钉红 / 青 / 黄
  function corkboard(B, ctx, x0, y0, x1, y1) {
    var k = ctx.L.ps, fw = Math.max(2, Math.round(2.4 * k)), W = x1 - x0, H = y1 - y0;
    B.rect(x0, y0, W, H, '#7a5238');
    B.rect(x0, y0, W, Math.max(1, 0.8 * k), '#9a6a46');
    for (var yy = y0 + fw; yy < y1 - fw; yy++) {
      for (var xx = x0 + fw; xx < x1 - fw; xx++) {
        var r = rnd(Math.floor(xx) * 7 + Math.floor(yy) * 13, 231);
        B.px(xx, yy, r > 0.9 ? '#a87c4a' : r < 0.08 ? '#dcb680' : '#c69a64');
      }
    }
    function polaroid(px, py, scene, pin) {
      var pw = 14 * k, ph = 16 * k;
      B.rect(px, py, pw, ph, '#f7f4ee');
      B.rect(px + pw - 1 * k, py + 1 * k, 1 * k, ph - 1 * k, '#cfc8bb');
      var ix = px + 1.5 * k, iy = py + 1.5 * k, iw = pw - 3 * k, ih = 10 * k;
      for (var v = 0; v < ih; v++) {
        for (var u = 0; u < iw; u++) {
          var t = v / ih, c;
          if (scene === 0) c = t < 0.55 ? (t < 0.25 ? '#7fb4e2' : '#a9cdea') : t < 0.7 ? '#3f7fae' : '#e8d8b0';
          else if (scene === 1) c = t < 0.6 ? (rnd(Math.floor(u) + Math.floor(v) * 9, 232) > 0.55 ? '#f4b6c8' : '#e896ae') : '#7a5a44';
          else c = t < 0.75 ? (rnd(Math.floor(u) * 3 + Math.floor(v) * 11, 233) > 0.93 ? '#ffffff' : '#1c2650') : '#10162e';
          B.px(ix + u, iy + v, c);
        }
      }
      if (scene === 2) B.disc(ix + iw * 0.7, iy + ih * 0.3, 1.4 * k, '#f4f1e2');
      B.disc(px + pw / 2, py + 1 * k, 1.1 * k, pin);
    }
    polaroid(x0 + 0.08 * W, y0 + 0.12 * H, 0, '#d8433e');
    polaroid(x0 + 0.52 * W, y0 + 0.08 * H, 2, '#3f8a86');
    polaroid(x0 + 0.3 * W, y0 + 0.5 * H, 1, '#e0b44c');
    var nx = x0 + 0.66 * W, ny = y0 + 0.56 * H;                                  // 便签
    B.rect(nx, ny, 11 * k, 10 * k, '#f2d56a');
    for (var i = 0; i < 3; i++) B.rect(nx + 1.5 * k, ny + (2.5 + i * 2.2) * k, 7.5 * k, Math.max(1, 0.5 * k), '#9a7a3a');
    B.disc(nx + 5.5 * k, ny + 0.8 * k, 1 * k, '#d8433e');
    B.rect(x0 + 0.06 * W, y0 + 0.72 * H, 13 * k, 6 * k, '#e8c0a0');              // 票根
    B.rect(x0 + 0.06 * W + 9 * k, y0 + 0.72 * H, Math.max(1, 0.5 * k), 6 * k, '#b88a6a');
  }

  // 天花板里的筒灯（离后墙 D 处）：一圈暗框 + 灯面；亮的时候灯面发光、后墙和台面上各一片光
  function downlight(B, ctx, x, D) {
    var L = ctx.L, dd = cafeDepth(L, D * L.s), y = L.VPy - (L.VPy - L.CEIL) * dd.k, k = dd.k * L.ps, on = ctx.T.lamps > 0;
    B.ellipse(x, y, 7 * k, 1.8 * k, 0, '#2a2624');
    if (on) {
      ctx.E.ellipse(x, y + 0.3 * k, 5 * k, 1.1 * k, 0, '#fff4d6');
      ctx.E.glow(x, y + 2 * k, 3 * k, 16 * k, '#ffd28a', 0.18 * ctx.T.lamps);
      ctx.lights.push({ x: x, y: L.Y(0.3), rx: 36 * k, ry: 70 * k, col: [0.9, 0.68, 0.4], k: 0.35, on: 'lamps' });
      ctx.lights.push({ x: x, y: L.Y(0.56), rx: 40 * k, ry: 18 * k, col: [1, 0.76, 0.44], k: 0.6, on: 'lamps' });
    } else B.ellipse(x, y + 0.3 * k, 5 * k, 1.1 * k, 0, '#e8e2d4');
  }

  // 浮板木架 + 架上的东西；items = [[种类, 相对位置 0..1], ...]
  function shelf(B, ctx, x0, x1, y, items, hooks) {
    var k = ctx.L.ps, T = ctx.T;
    B.rect(x0, y, x1 - x0, 4 * k, '#8a6040');
    B.rect(x0, y, x1 - x0, Math.max(1, 1 * k), '#a87a52');
    B.rect(x0, y + 4 * k, x1 - x0, Math.max(1, 0.8 * k), '#4a3222');
    [0.12, 0.88].forEach(function (f) { B.rect(x0 + (x1 - x0) * f - 1 * k, y + 4 * k, 2 * k, 5 * k, '#2a2626'); });
    items.forEach(function (it) { ITEMS[it[0]](B, ctx, x0 + (x1 - x0) * it[1], y, k, it[2]); });
    if (hooks) {
      for (var i = 0; i < 5; i++) {
        var hx = x0 + (x1 - x0) * (0.2 + i * 0.15), hy = y + 5 * k;
        B.rect(hx, hy, Math.max(1, 0.6 * k), 3 * k, '#2a2626');
        var c = ['#e9e3d6', '#3f8a86', '#c46a42', '#e9e3d6', '#2f3f63'][i];
        B.rect(hx - 3 * k, hy + 3 * k, 6 * k, 5.5 * k, c);
        B.rect(hx - 3 * k, hy + 3 * k, 1.5 * k, 5.5 * k, PX.cafeShade(c, 1.12));
        B.rect(hx + 3 * k, hy + 4.5 * k, 1.4 * k, 2.4 * k, c);
      }
    }
    // 架子底下的暖光灯带
    if (T.id !== 'day') {
      ctx.E.rect(x0 + 2 * k, y + 4.8 * k, x1 - x0 - 4 * k, Math.max(1, 0.6 * k), '#ffe7b0', 0.9);
      ctx.lights.push({ x: (x0 + x1) / 2, y: y + 14 * k, rx: (x1 - x0) * 0.55, ry: 16 * k, col: [1, 0.78, 0.45], k: 0.55, on: 'warm' });
    }
  }
  var ITEMS = {
    jar: function (B, ctx, x, y, k, fill) {
      var h = 13 * k, w = 8 * k, lv = fill || 0.7;
      B.rect(x - w / 2, y - h, w, h, '#cfe1e0', 0.35);
      for (var yy = y - h * lv; yy < y; yy++) for (var xx = x - w / 2 + 1; xx < x + w / 2 - 1; xx++) B.px(xx, yy, rnd(xx * 3 + yy * 7, 211) > 0.5 ? '#5a3a24' : '#7a5234');
      B.rect(x - w / 2 - 0.5 * k, y - h - 2.4 * k, w + 1 * k, 2.4 * k, '#b58a5c');
      B.line(x - w / 2 + 1, y - h + 1, x - w / 2 + 1, y - 2, '#f4fbfa', 0.7);
      B.rect(x - w / 2 + 1.5 * k, y - h * 0.62, w - 3 * k, 3 * k, '#efe6d2');
    },
    mug: function (B, ctx, x, y, k, c) {
      B.rect(x - 3.5 * k, y - 7 * k, 7 * k, 7 * k, c);
      B.rect(x - 3.5 * k, y - 7 * k, 1.6 * k, 7 * k, PX.cafeShade(c, 1.15));
      B.rect(x + 3.5 * k, y - 5.5 * k, 1.6 * k, 3.5 * k, c);
    },
    bottle: function (B, ctx, x, y, k, c) {
      B.rect(x - 3 * k, y - 14 * k, 6 * k, 14 * k, c);
      B.rect(x - 1.4 * k, y - 19 * k, 2.8 * k, 5 * k, c);
      B.rect(x - 1.8 * k, y - 20.5 * k, 3.6 * k, 1.8 * k, '#2a2626');
      B.rect(x - 3 * k, y - 10 * k, 6 * k, 4.5 * k, '#efe6d2');
      B.line(x - 2 * k, y - 13 * k, x - 2 * k, y - 1 * k, '#ffffff', 0.5);
    },
    books: function (B, ctx, x, y, k) {
      [['#8a3f3a', 15], ['#3f5f7a', 13], ['#c9a45a', 14.5], ['#4f6f4f', 12]].forEach(function (b, i) {
        B.rect(x + (i - 2) * 3.4 * k, y - b[1] * k, 3.2 * k, b[1] * k, b[0]);
        B.rect(x + (i - 2) * 3.4 * k, y - b[1] * k + 2 * k, 3.2 * k, Math.max(1, 0.6 * k), '#efe6d2', 0.7);
      });
      B.rect(x + 6 * k, y - 3 * k, 12 * k, 3 * k, '#b85a3c');
    },
    plant: function (B, ctx, x, y, k) {
      B.poly([[x - 5 * k, y - 8 * k], [x + 5 * k, y - 8 * k], [x + 4 * k, y], [x - 4 * k, y]], '#e8e2d6');
      for (var v = 0; v < 4; v++) {
        for (var t = 0; t < (18 + v * 9) * k; t++) {
          var px = x + (v - 1.5) * 3 * k + Math.sin(t / (5 * k) + v) * 1.6 * k, py = y - 6 * k + t;
          B.px(px, py, '#3e6a36');
          if (Math.floor(t / (4 * k)) !== Math.floor((t - 1) / (4 * k))) B.ellipse(px + (Math.floor(t / (4 * k)) % 2 ? 1.6 : -1.6) * k, py, 1.8 * k, 1.3 * k, 0, '#5f9a4c');
        }
      }
      for (var l = 0; l < 6; l++) B.ellipse(x + (l - 2.5) * 2 * k, y - 9 * k - (l % 2) * 2 * k, 2.2 * k, 1.6 * k, 0, l % 2 ? '#6aa052' : '#4f873e');
    },
    cactus: function (B, ctx, x, y, k) {
      B.poly([[x - 4 * k, y - 6 * k], [x + 4 * k, y - 6 * k], [x + 3 * k, y], [x - 3 * k, y]], '#c47148');
      B.rect(x - 2 * k, y - 16 * k, 4 * k, 10 * k, '#5f8a4c');
      B.rect(x - 2 * k, y - 16 * k, 1.2 * k, 10 * k, '#78a260');
      B.rect(x + 2 * k, y - 12 * k, 2.4 * k, 1.6 * k, '#5f8a4c'); B.rect(x + 3.4 * k, y - 15 * k, 1.6 * k, 4 * k, '#5f8a4c');
    },
    // 帕姆：灰白的小兔子，戴列车长帽（深蓝 + 金边），长耳朵从帽子两边垂下来
    pompom: function (B, ctx, x, y, k) {
      cafeHot(ctx, 'pompom', [[x - 6 * k, y - 19 * k], [x + 6 * k, y]], 2);
      B.ellipse(x, y - 4 * k, 5 * k, 4 * k, 0, '#d3d1da');
      B.ellipse(x, y - 10 * k, 5.4 * k, 4.6 * k, 0, function (xx, yy, dx, dy) { return dy > 0.5 * k && Math.abs(dx) < 3 * k ? '#f4f3f7' : '#cfcdd8'; });
      B.px(x - 1.8 * k, y - 10.5 * k, '#2a2440'); B.px(x + 1.8 * k, y - 10.5 * k, '#2a2440');
      B.ellipse(x - 5.6 * k, y - 8 * k, 1.6 * k, 4 * k, 0.3, '#bdbbc8'); B.ellipse(x + 5.6 * k, y - 8 * k, 1.6 * k, 4 * k, -0.3, '#bdbbc8');
      B.rect(x - 4 * k, y - 18 * k, 8 * k, 4 * k, '#2d3350');
      B.rect(x - 5.4 * k, y - 14.6 * k, 10.8 * k, 1.4 * k, '#2d3350');
      B.rect(x - 4 * k, y - 15.4 * k, 8 * k, Math.max(1, 0.8 * k), '#d8b04a');
      B.px(x, y - 16.6 * k, '#e8c45e');
    },
    // 星穹列车模型：黑色车头（金线、红色排障器）+ 一节奶白车厢
    train: function (B, ctx, x, y, k) {
      B.rect(x - 14 * k, y - 7 * k, 12 * k, 6 * k, '#e8e0cc');
      B.rect(x - 13 * k, y - 6 * k, 10 * k, 1.6 * k, '#6fa8c8');
      B.rect(x - 1 * k, y - 8 * k, 13 * k, 7 * k, '#2a2b33');
      B.rect(x + 7 * k, y - 11 * k, 2.4 * k, 3 * k, '#2a2b33');
      B.rect(x - 1 * k, y - 5 * k, 13 * k, Math.max(1, 0.7 * k), '#d8b04a');
      B.poly([[x + 12 * k, y - 4 * k], [x + 14.5 * k, y - 1 * k], [x + 12 * k, y - 1 * k]], '#b23b3b');
      [-10, -5, 2, 8].forEach(function (u) { B.disc(x + u * k, y - 1 * k, 1.3 * k, '#1a1a1e'); });
    }
  };

  // ---------- 吧台 ----------
  function counter(B, ctx) {
    var L = ctx.L, ps = L.ps, F = cafeDepth(L, FRONT_D * L.s), Bk = cafeDepth(L, BACK_D * L.s), kF = F.k * ps, kB = Bk.k * ps;
    var xlF = L.X(0.612), xw = L.VPx + (xlF - L.VPx) / F.k, xlB = Bk.x(xw), right = L.w + 2;
    var yF = F.y(), yB = Bk.y(), topF = yF - TOP_H * kF, topB = yB - TOP_H * kB, slab = 5 * kF;
    // 左端侧面
    B.poly([[xlB, topB], [xlF, topF], [xlF, yF], [xlB, yB]], function (x, y) { return y > yF - 6 * kF ? '#3e281c' : '#7a5238'; });
    // 正面：竖条护板 + 黄铜踏脚杆 + 踢脚
    B.poly([[xlF, topF + slab], [right, topF + slab], [right, yF], [xlF, yF]], function (x, y) {
      if (y > yF - 6 * kF) return '#2e1f16';
      var st = Math.floor((x - xlF) / (7 * kF));
      if ((x - xlF) - st * 7 * kF < Math.max(1, 0.8 * kF)) return '#3e281c';
      return st % 2 ? '#5e3d2b' : '#6b4631';
    });
    var ry = yF - 20 * kF;
    B.rect(xlF + 4 * kF, ry, right - xlF, Math.max(2, 2.2 * kF), '#c9a04a');
    B.rect(xlF + 4 * kF, ry, right - xlF, Math.max(1, 0.7 * kF), '#f0d68a');
    for (var bx = xlF + 10 * kF; bx < right; bx += 60 * kF) B.rect(bx, ry, 1.6 * kF, 14 * kF, '#8a6a32');
    // 台面：顶面（看得到一窄条）+ 前沿厚度
    B.poly([[xlB, topB], [right, topB], [right, topF], [xlF, topF]], function (x, y) { return y < topB + 1 * kB ? '#b98a60' : '#a8744c'; });
    B.poly([[xlF, topF], [right, topF], [right, topF + slab], [xlF, topF + slab]], function (x, y) { return y < topF + 1.2 * kF ? '#c7966a' : '#8a5a3c'; });
    ctx.shadows.push({ x: (xlF + right) / 2, y: yF + 3 * L.s, rx: (right - xlF) * 0.6, ry: 12 * L.s, f: 0.5 });
    ctx.counter = { topF: topF, topB: topB, xlF: xlF };
  }
  // 台面上的东西：放在离墙 D = 120 处，底边落在台面上
  function onTop(ctx, fx) {
    var L = ctx.L, dd = cafeDepth(L, 122 * L.s), k = dd.k * L.ps;
    return { x: L.X(fx), y: dd.y() - TOP_H * k, k: k };
  }

  function grinder(B, ctx, sp) {
    var p = pen(sp), k = sp.k;
    B.poly([p(-8, 0), p(8, 0), p(7, -16), p(-7, -16)], function (x) { return x < sp.x - 3 * k ? '#3a3a40' : '#2a2a2f'; });
    B.rect(p(-3, -9)[0], p(-3, -9)[1], 6 * k, 3 * k, '#9ea3ab');
    B.rect(p(-5, -21)[0], p(-5, -21)[1], 10 * k, 5 * k, '#2a2a2f');
    B.poly([p(-5, -21), p(5, -21), p(10, -38), p(-10, -38)], function (x, y) {
      var fill = y > p(0, -33)[1];
      return fill ? (rnd(Math.floor(x) * 7 + Math.floor(y) * 3, 221) > 0.5 ? '#5a3a24' : '#7a5234') : ['#dfe9ea', 0.3];
    });
    B.poly([p(-10.5, -38), p(10.5, -38), p(9, -41), p(-9, -41)], '#2a2a2f');
    B.line(p(-8, -36)[0], p(-8, -36)[1], p(-5, -23)[0], p(-5, -23)[1], '#ffffff', 0.6);
  }

  function espresso(B, ctx, sp) {
    var p = pen(sp), k = sp.k, E = ctx.E;
    // 机身
    B.poly([p(-36, 0), p(36, 0), p(36, -30), p(33, -33), p(-33, -33), p(-36, -30)], function (x, y) {
      var u = (x - sp.x) / k, v = (y - sp.y) / k;
      if (v < -30) return '#e8ecf1';
      if (u < -30) return '#f2f5f8';
      if (u > 31) return '#8e949e';
      return Math.abs(u) < 12 && v > -30 && v < -16 ? '#b7bdc6' : '#c9ced6';
    });
    // 杯架上一排倒扣的杯子 + 围栏
    for (var i = 0; i < 5; i++) {
      var cx = p(-24 + i * 12, -33);
      B.rect(cx[0] - 4 * k, cx[1] - 6 * k, 8 * k, 6 * k, '#f6f3ee');
      B.rect(cx[0] + 2 * k, cx[1] - 6 * k, 2 * k, 6 * k, '#d8d3cb');
    }
    B.rect(p(-34, -38)[0], p(-34, -38)[1], 68 * k, 1.2 * k, '#9ea3ab');
    // 压力表 + 铜铭牌 + 指示灯
    var g = p(0, -24);
    B.disc(g[0], g[1], 5 * k, '#6a6e76');
    B.disc(g[0], g[1], 4 * k, '#f6f2e6');
    B.line(g[0], g[1], g[0] + 2.4 * k, g[1] - 2.2 * k, '#b83a2e');
    B.rect(p(-6, -15)[0], p(-6, -15)[1], 12 * k, 3 * k, '#b87a4a');
    E.px(p(9, -27)[0], p(9, -27)[1], '#ff5a4a'); E.glow(p(9, -27)[0], p(9, -27)[1], 1, 4 * k, '#ff5a4a', 0.4);
    // 两个冲煮头 + 手柄 + 底下的小杯
    [-18, 18].forEach(function (u, j) {
      var h = p(u, -17);
      B.rect(h[0] - 5 * k, h[1] - 2 * k, 10 * k, 4 * k, '#7a8089');
      B.rect(h[0] - 4 * k, h[1] + 2 * k, 8 * k, 3 * k, '#aeb4bd');
      var hd = p(u + (j ? 9 : -9), -8);
      bar(B, [h[0] + (j ? 3 : -3) * k, h[1] + 3.5 * k], hd, 2.6 * k, '#1f1f24');
      var cup = p(u, -5);
      B.rect(cup[0] - 3 * k, cup[1] - 3.5 * k, 6 * k, 3.5 * k, '#f6f3ee');
      ctx.fx.push({ kind: 'drip', x: h[0], y: h[1] + 5 * k, to: cup[1] - 3.5 * k, k: k, seed: j, lit: true });
    });
    // 接水盘
    B.rect(p(-33, -3)[0], p(-33, -3)[1], 66 * k, 3 * k, '#5a5e66');
    for (var gx = -32; gx < 33; gx += 3) B.px(p(gx, -2)[0], p(gx, -2)[1], '#3a3d44');
    // 蒸汽棒（右）+ 热水口（左）
    bar(B, p(37, -26), p(41, -10), 1.2 * k, '#cfd4db');
    B.disc(p(37, -28)[0], p(37, -28)[1], 2 * k, '#2a2a2f');
    bar(B, p(-37, -26), p(-39, -14), 1.2 * k, '#cfd4db');
    ctx.fx.push({ kind: 'steam', x: p(41, -10)[0], y: p(41, -10)[1], k: k, big: true, lit: true });
    ctx.fx.push({ kind: 'steam', x: p(-12, -40)[0], y: p(-12, -40)[1], k: k * 0.8, lit: true });
    cafeHot(ctx, 'espresso', [p(-40, -40), p(43, 1)], 1);
  }

  function cake(B, ctx, sp) {
    var p = pen(sp), k = sp.k;
    B.ellipse(p(0, 0)[0], p(0, 0)[1], 17 * k, 3 * k, 0, '#6a4a34');
    B.rect(p(-2, -6)[0], p(-2, -6)[1], 4 * k, 6 * k, '#8a6448');
    B.ellipse(p(0, -6)[0], p(0, -6)[1], 14 * k, 2.4 * k, 0, '#efe9df');
    // 蛋糕：三层海绵 + 奶油，切掉右前一角露出截面，顶上草莓
    for (var yy = -24; yy < -7; yy++) {
      for (var xx = -11; xx <= 11; xx++) {
        var cut = xx > 3 && yy > -22;
        var layer = ((-yy - 7) % 6) < 2 ? '#fbf1dc' : '#e9c88a';
        var c = cut ? (xx < 5 ? '#d9b270' : layer) : (xx < -7 ? '#f3e6d0' : '#fbf3e4');
        if (cut && xx === 4) c = '#caa46a';
        B.rect(p(xx, yy)[0], p(xx, yy)[1], Math.ceil(k), Math.ceil(k), c);
      }
    }
    for (var i = -2; i <= 1; i++) { B.disc(p(i * 4.6 - 1, -26)[0], p(i * 4.6 - 1, -26)[1], 2 * k, '#d8433e'); B.px(p(i * 4.6 - 1, -28)[0], p(i * 4.6 - 1, -28)[1], '#4f873e'); }
    // 玻璃罩：一圈亮边 + 左上一道高光
    B.ellipse(p(0, -18)[0], p(0, -18)[1], 16 * k, 20 * k, 0, function (x, y, dx, dy, d) {
      if (dy > 12 * k) return null;
      if (d > 0.93) return ['#eef6f6', 0.55];
      if (d > 0.8 && dx < -4 * k && dy < -4 * k) return ['#ffffff', 0.45];
      return ['#dcecec', 0.12];
    });
    B.disc(p(0, -38.5)[0], p(0, -38.5)[1], 2 * k, '#c9a04a');
  }

  function register(B, ctx, sp) {
    var p = pen(sp), k = sp.k, T = ctx.T;
    bar(B, p(0, 0), p(0, -9), 2 * k, '#3a3a40');
    B.poly([p(-10, -10), p(10, -10), p(9, -24), p(-9, -24)], '#2a2a30');
    var scr = T.id === 'night' || T.id === 'dusk' ? ctx.E : B;
    scr.poly([p(-8.4, -11.4), p(8.4, -11.4), p(7.6, -22.6), p(-7.6, -22.6)], '#dfe8ee');
    for (var i = 0; i < 6; i++) scr.rect(p(-6.5 + (i % 3) * 4.6, -21 + Math.floor(i / 3) * 4.6)[0], p(-6.5 + (i % 3) * 4.6, -21 + Math.floor(i / 3) * 4.6)[1], 3.6 * k, 3.4 * k, ['#e0a45a', '#7fb8c8', '#c792b8'][i % 3]);
    // 小费罐
    var j = p(15, 0);
    B.rect(j[0] - 4 * k, j[1] - 10 * k, 8 * k, 10 * k, '#cfe1e0', 0.35);
    for (var c = 0; c < 6; c++) B.rect(j[0] - 3 * k + (c % 3) * 2 * k, j[1] - 2 * k - Math.floor(c / 3) * 1.4 * k, 1.6 * k, 1 * k, '#d8b04a');
    B.rect(j[0] - 3 * k, j[1] - 7 * k, 6 * k, 3 * k, '#efe6d2');
  }

  function turntable(B, ctx, sp) {
    var p = pen(sp), k = sp.k;
    B.poly([p(-22, 0), p(22, 0), p(22, -8), p(-22, -8)], function (x, y) { return y < p(0, -7)[1] ? '#9a6a46' : '#7a5238'; });
    B.poly([p(-20, -8), p(20, -8), p(18, -11), p(-18, -11)], '#b07e56');
    var c = p(-3, -10);
    B.ellipse(c[0], c[1], 15 * k, 3.2 * k, 0, function (x, y, dx, dy, d) { return d < 0.28 ? '#c8423a' : (Math.floor(d * 9) % 2 ? '#1c1c20' : '#26262c'); });
    // 唱臂交给 fx 画：放音乐时搭在唱片上，不放时收在右边的架子上
    ctx.fx.push({ kind: 'record', x: c[0], y: c[1], rx: 15 * k, ry: 3.2 * k, k: k, lit: true, pivot: p(17, -12), armOn: p(8, -10.6), armOff: p(20.5, -7.5) });
    B.rect(p(19.6, -9)[0], p(19.6, -9)[1], 2 * k, 1.2 * k, '#6a4a34');
    B.disc(p(17, -12)[0], p(17, -12)[1], 2 * k, '#9ea3ab');
    cafeHot(ctx, 'record', [p(-23, -16), p(23, 1)], 2);
    // 旁边靠着一摞唱片
    [['#e0a45a', -2], ['#3f6f8a', 0], ['#c05a6a', 2]].forEach(function (r, i) {
      var q = p(34 + i * 3, 0);
      B.poly([[q[0] - 9 * k + r[1] * k * 0.3, q[1] - 18 * k], [q[0] + 9 * k + r[1] * k * 0.3, q[1] - 18.5 * k], [q[0] + 9 * k, q[1]], [q[0] - 9 * k, q[1]]], r[0]);
      B.disc(q[0] + r[1] * 0.2 * k, q[1] - 9 * k, 3.4 * k, PX.cafeShade(r[0], 0.8));
    });
  }

  function cafeBar(B, ctx) {
    var L = ctx.L, s = L.s, gs = Math.max(1, Math.round(s));
    // 砖墙（砖柱右边到屏幕右边）：正中上方霓虹招牌（离墙顶的横梁留一段空）；招牌下面两层木架；
    // 左边一只挂钟 + 一块软木板（钉着拍立得和便签）；右边黑板菜单（右边留白里整块看得见）
    var wl = L.pillar[1], wr = L.X(1), mid = (wl + wr) / 2, ns = Math.max(2, Math.round(3 * s));
    neon(B, ctx, mid, L.CEIL + 12 * s, ns);
    clock(B, ctx, L.X(0.674), L.Y(0.175), 15 * L.ps);
    corkboard(B, ctx, L.X(0.636), L.Y(0.255), L.X(0.724), L.Y(0.39));
    shelf(B, ctx, mid - 0.066 * L.W, mid + 0.066 * L.W, L.Y(0.29), [['jar', 0.08, 0.8], ['jar', 0.19, 0.55], ['jar', 0.3, 0.35], ['pompom', 0.47], ['books', 0.68], ['plant', 0.92]]);
    shelf(B, ctx, mid - 0.066 * L.W, mid + 0.066 * L.W, L.Y(0.39), [['mug', 0.08, '#3f8a86'], ['mug', 0.17, '#efe6d2'], ['mug', 0.26, '#c46a42'], ['bottle', 0.4, '#b8742e'],
      ['bottle', 0.49, '#9a2f3a'], ['train', 0.7], ['cactus', 0.92]], true);
    menu(B, ctx, L.X(0.89), L.Y(0.2), L.X(0.99), L.Y(0.47));
    menuLight(B, ctx, L.X(0.89), L.X(0.99), L.Y(0.2));
    counter(B, ctx);
    grinder(B, ctx, onTop(ctx, 0.645));
    espresso(B, ctx, onTop(ctx, 0.705));
    cake(B, ctx, onTop(ctx, 0.782));
    register(B, ctx, onTop(ctx, 0.845));
    turntable(B, ctx, onTop(ctx, 0.915));
    // 吧台上方天花板里三盏筒灯（亮的时候照亮台面和后墙）
    [0.7, 0.8, 0.9].forEach(function (f) { downlight(B, ctx, L.X(f), 70); });
    sack(B, ctx, cafeSpot(L, 0.6, 176));
  }

  PX.provide('06-cafe-bar', { cafeBar: cafeBar });
})(window.__abPixel = window.__abPixel || {});

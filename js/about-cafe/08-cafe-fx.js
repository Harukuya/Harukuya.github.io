// 08-cafe-fx：会动的小东西，每 83 毫秒重画一次（直接用 2D 画布一个个像素点 fillRect，量很少）
// 屋里（cafeFxIn，画在房间那层上面）：杯子 / 咖啡机的热气、斜光里的浮尘、猫尾巴尖隔一会儿甩一下、萤火虫瓶里的光点、窗顶小灯偶尔一闪、
//   笔记本上的光标、挂钟的时针分针秒针（从这个时间对应的时刻开始走）、唱片机（放音乐时唱片转、唱臂搭上去、飘出像素音符）、咖啡机偶尔滴一滴；
//   纯享背景时点出来的：猫甩尾巴、萤火虫从瓶子里飞出来绕一圈再回去、咖啡机喷一大团蒸汽（env.ev 里记着各自被点的时刻）；
//   家具上的东西（热气、指针…）按那一处的光调暗（lit：挂载时从光照图取样存进 mul）。
// 窗外（cafeFxOut，画在天那层上面、房间后面）：夜里亮星一闪一闪、隔一阵一颗流星、星穹列车沿着一道淡金色的光轨从天上驶过；白天 / 清晨 / 黄昏几只鸟飞过；
//   点望远镜：马上划过一颗大流星（什么时间都有）。
(function (PX) {
  'use strict';

  PX.need('08-cafe-fx', ['CAFE_TAIL_FIX', 'cafeCatTail', 'cafeRnd']);
  var TAIL_FIX = PX.CAFE_TAIL_FIX, catTail = PX.cafeCatTail, rnd = PX.cafeRnd;

  function dot(g, x, y, c, a, sz) {
    g.fillStyle = 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a.toFixed(3) + ')';
    g.fillRect(Math.round(x), Math.round(y), sz || 1, sz || 1);
  }
  function lit(f, c) { var m = f.mul || [1, 1, 1]; return [Math.min(255, c[0] * m[0]), Math.min(255, c[1] * m[1]), Math.min(255, c[2] * m[2])]; }
  function inPoly(pts, x, y) {
    var ins = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      if ((pts[i][1] > y) !== (pts[j][1] > y) && x < pts[i][0] + (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1])) ins = !ins;
    }
    return ins;
  }
  function line(g, x0, y0, x1, y1, c, a) {
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (var i = 0; i <= n; i++) dot(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, a);
  }

  // 像素音符（5 × 6）
  var NOTE = ['..##.', '..#.#', '..#..', '..#..', '###..', '###..'];
  function noteSprite(g, x, y, sz, c, a) {
    if (a <= 0.02) return;
    for (var r = 0; r < NOTE.length; r++) for (var q = 0; q < 5; q++) if (NOTE[r][q] === '#') dot(g, x + q * sz, y + r * sz, c, a, sz);
  }
  // 萤火虫飞出来：u = 0 ~ 1（7 秒）：先从瓶口往上散开，再在桌子上方绕圈，最后飞回瓶里
  function escaped(g, f, t, u) {
    var k = f.k;
    for (var j = 0; j < 8; j++) {
      var ang = t * (0.8 + j * 0.09) + j * 0.8, cx = f.x - 20 * k + j * 5 * k, cy = f.y - 60 * k - (j % 3) * 8 * k, r = (16 + j * 3) * k;
      var wx = cx + Math.cos(ang) * r, wy = cy + Math.sin(ang) * r * 0.55, x, y;
      if (u < 0.14) { var e = u / 0.14; x = f.x + (wx - f.x) * e; y = f.y + (wy - f.y) * e; }
      else if (u > 0.84) { var e2 = (u - 0.84) / 0.16; x = wx + (f.x - wx) * e2; y = wy + (f.y - wy) * e2; }
      else { x = wx; y = wy; }
      var a = 0.45 + 0.55 * Math.max(0, Math.sin(t * (3 + j * 0.3) + j));
      dot(g, x, y, [230, 255, 150], a, 2);
      dot(g, x - 1, y, [170, 240, 110], a * 0.4); dot(g, x + 2, y, [170, 240, 110], a * 0.4); dot(g, x, y - 1, [170, 240, 110], a * 0.4); dot(g, x, y + 2, [170, 240, 110], a * 0.4);
    }
  }

  // 猫甩尾巴的那一下（0 ~ 1 ~ 0）：每 6 秒一次、1.2 秒；被点了（env.ev.tail）就从那一刻起马上甩
  function tailKick(t, env) {
    var kick = t - env.ev.tail, ph = kick >= 0 && kick < 1.2 ? kick : t % 6;
    return ph < 1.2 ? Math.sin(ph / 1.2 * Math.PI) : 0;
  }
  // 这一刻要不要把小动画提到高帧率（猫正在甩尾巴）
  function cafeFxFast(env, t) { return tailKick(t, env) > 0; }

  var DRAW = {
    steam: function (g, f, t, i, env) {
      var burst = f.big && t - env.ev.burst >= 0 && t - env.ev.burst < 2.4;
      var n = burst ? 14 : f.big ? 5 : 3, H = (burst ? 46 : f.big ? 26 : 16) * f.k, c = lit(f, [250, 248, 244]), sz = Math.max(1, Math.round(f.k * (burst ? 0.8 : 0.5)));
      for (var j = 0; j < n; j++) {
        var ph = (t * (f.big ? 0.9 : 0.55) + j / n + rnd(i, 401)) % 1, hh = ph * H;
        if (ph < 0.06) continue;
        var x = f.x + Math.sin(t * 1.6 + j * 2.1 + hh * 0.18 / f.k) * (1.4 + ph * 2.4) * f.k, y = f.y - hh;
        dot(g, x, y, c, (1 - ph) * (burst ? 0.6 : f.big ? 0.42 : 0.3), sz);
        dot(g, x + sz, y - sz, c, (1 - ph) * 0.18, sz);
      }
    },
    tail: function (g, f, t, i, env) {
      // 甩一下（1.2 秒）：每 6 秒一次，被点了就马上甩；平时一直微微晃。两者叠加（甩的那一下首尾是 0），接缝处不跳。
      // 尾巴尖和画死的那截尾巴接得上：圆点按和 Raster.disc 一样的方式取像素（像素中心在圆里），颜色 = 底色 × 这一格实际的光（occ.light，
      // 挂载时按 cafeCompose 同一套算法记下）；猫前面的东西（小圆桌）挡住的像素不画（occ.mask，见 04-cafe-window 的 cat）
      var occ = f.occ && f.occ.mask ? f.occ : null, lift = 0.12 * Math.sin(t * 1.3) + tailKick(t, env);
      for (var n = TAIL_FIX + 1; n <= 20; n++) {
        var q = catTail(n), w = (n - TAIL_FIX) / (20 - TAIL_FIX);
        var cx = f.x + (q[0] + w * lift * 2) * f.k, cy = f.y + (q[1] - w * w * lift * 7) * f.k, r = 2.6 * f.k, R = r + 1;
        var base = n > 17 ? [94, 88, 83] : [124, 117, 111];
        for (var y = Math.floor(cy - R); y <= cy + R; y++) for (var x = Math.floor(cx - R); x <= cx + R; x++) {
          var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy > r * r) continue;
          var mx = x - (occ ? occ.x0 : 0), my = y - (occ ? occ.y0 : 0), inBox = occ && mx >= 0 && my >= 0 && mx < occ.w && my < occ.h;
          if (inBox && occ.mask[my * occ.w + mx]) continue;
          var c;
          if (inBox && occ.light) { var li = (my * occ.w + mx) * 3; c = [Math.min(255, base[0] * occ.light[li]), Math.min(255, base[1] * occ.light[li + 1]), Math.min(255, base[2] * occ.light[li + 2])]; }
          else c = lit(f, base);
          dot(g, x, y, c, 1);
        }
      }
    },
    fireflies: function (g, f, t, i, env) {
      var u = (t - env.ev.jar) / 7;
      if (u >= 0 && u < 1) return escaped(g, f, t, u);
      if (!f.on) return;
      for (var j = 0; j < 5; j++) {
        var a = Math.max(0, Math.sin(t * (2.2 + j * 0.4) + j * 1.7));
        if (a < 0.05) continue;
        var x = f.x + Math.sin(t * (0.7 + j * 0.13) + j * 2) * 2.2 * f.k, y = f.y + Math.cos(t * (0.9 + j * 0.11) + j) * 3 * f.k;
        dot(g, x, y, [220, 255, 140], a);
        dot(g, x - 1, y, [170, 240, 110], a * 0.35); dot(g, x + 1, y, [170, 240, 110], a * 0.35); dot(g, x, y - 1, [170, 240, 110], a * 0.35); dot(g, x, y + 1, [170, 240, 110], a * 0.35);
      }
    },
    bulb: function (g, f, t) {
      var v = Math.sin(t * 0.9 + f.seed * 2.39);
      if (v < 0.9) return;
      var a = (v - 0.9) * 10;
      dot(g, f.x, f.y, [255, 250, 225], a);
      dot(g, f.x - 1, f.y, [255, 220, 150], a * 0.5); dot(g, f.x + 1, f.y, [255, 220, 150], a * 0.5); dot(g, f.x, f.y - 1, [255, 220, 150], a * 0.5); dot(g, f.x, f.y + 1, [255, 220, 150], a * 0.5);
    },
    cursor: function (g, f, t) {
      if (Math.floor(t * 1.8) % 2) return;
      g.fillStyle = f.E ? 'rgba(210,230,255,0.95)' : 'rgba(200,220,245,0.8)';
      g.fillRect(Math.round(f.x), Math.round(f.y), Math.max(1, Math.round(0.8 * f.k)), Math.max(1, Math.round(1.1 * f.k)));
    },
    clock: function (g, f, t) {
      var mins = f.base + t / 60, sec = Math.floor(t) % 60, dk = lit(f, [42, 36, 32]);
      var ha = (mins / 720) * Math.PI * 2, ma = (mins % 60) / 60 * Math.PI * 2, sa = sec / 60 * Math.PI * 2;
      [[ha, 0.5, 1], [ma, 0.76, 1]].forEach(function (h) {
        line(g, f.x, f.y, f.x + Math.sin(h[0]) * f.r * h[1], f.y - Math.cos(h[0]) * f.r * h[1], dk, 1);
        if (f.r > 14) line(g, f.x + 1, f.y, f.x + 1 + Math.sin(h[0]) * f.r * h[1] * 0.9, f.y - Math.cos(h[0]) * f.r * h[1] * 0.9, dk, 0.6);
      });
      line(g, f.x, f.y, f.x + Math.sin(sa) * f.r * 0.86, f.y - Math.cos(sa) * f.r * 0.86, lit(f, [184, 58, 46]), 1);
      dot(g, f.x, f.y, lit(f, [184, 58, 46]), 1, 2);
    },
    record: function (g, f, t, i, env) {
      var on = env.music && env.music.playing(), k = f.k;
      if (on) {
        var a = t * 3.6;
        [0.45, 0.7, 0.88].forEach(function (r, j) {
          var b = a + j * 2.1;
          dot(g, f.x + Math.cos(b) * f.rx * r, f.y + Math.sin(b) * f.ry * r, lit(f, [220, 220, 230]), 0.45);
        });
        dot(g, f.x + Math.cos(a) * f.rx * 0.16, f.y + Math.sin(a) * f.ry * 0.16, lit(f, [240, 220, 200]), 0.9);
        // 飘出来的像素音符（跟着低频冲击多冒几个亮点）
        var beat = env.music.beat ? env.music.beat() : 0, sz = Math.max(1, Math.round(k * 0.55));
        for (var j = 0; j < 3; j++) {
          var ph = (t * 0.42 + j / 3) % 1, nx = f.x + (j - 1) * 7 * k + Math.sin(t * 1.7 + j * 2) * 4 * k, ny = f.y - 6 * k - ph * 44 * k;
          noteSprite(g, nx, ny, sz, [255, 214, 140], Math.min(1, (1 - ph) * 1.4) * (ph < 0.08 ? ph / 0.08 : 1));
        }
        if (beat > 0.35) dot(g, f.x + Math.sin(t * 13) * f.rx * 0.8, f.y - 3 * k - Math.abs(Math.cos(t * 9)) * 8 * k, [255, 236, 190], beat);
      }
      var end = on ? f.armOn : f.armOff, c = lit(f, [205, 212, 219]);
      line(g, f.pivot[0], f.pivot[1], end[0], end[1], c, 1);
      line(g, f.pivot[0], f.pivot[1] + 1, end[0], end[1] + 1, lit(f, [140, 146, 156]), 1);
      dot(g, end[0] - 1, end[1], lit(f, [60, 62, 70]), 1, Math.max(1, Math.round(k)));
    },
    drip: function (g, f, t) {
      var ph = (t + f.seed * 1.37) % 2.6;
      if (ph > 0.45) return;
      dot(g, f.x, f.y + (f.to - f.y) * (ph / 0.45), lit(f, [90, 58, 36]), 1, Math.max(1, Math.round(f.k * 0.6)));
    }
  };

  // 斜光里的浮尘：固定一群点，慢慢往右下飘、上下晃，只画在光柱里
  function dust(g, env, t) {
    var sh = env.shafts;
    if (!sh || !sh.length) return;
    var b = env.dustBox;
    if (!b) {
      b = env.dustBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      sh.forEach(function (p) { p.forEach(function (q) { b.x0 = Math.min(b.x0, q[0]); b.y0 = Math.min(b.y0, q[1]); b.x1 = Math.max(b.x1, q[0]); b.y1 = Math.max(b.y1, q[1]); }); });
      b.x1 = Math.min(b.x1, env.L.pillar[0]);
    }
    var n = Math.round((b.x1 - b.x0) * (b.y1 - b.y0) / 1400);
    for (var i = 0; i < n; i++) {
      var x = b.x0 + ((rnd(i, 411) * (b.x1 - b.x0) + t * (3 + rnd(i, 412) * 4)) % (b.x1 - b.x0));
      var y = b.y0 + ((rnd(i, 413) * (b.y1 - b.y0) + t * (1.5 + rnd(i, 414) * 2) + Math.sin(t * 0.8 + i) * 3) % (b.y1 - b.y0));
      var ok = false;
      for (var k = 0; k < sh.length && !ok; k++) ok = inPoly(sh[k], x, y);
      if (!ok) continue;
      dot(g, x, y, [255, 244, 214], 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7)));
    }
  }

  function cafeFxIn(g, env, t) {
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    dust(g, env, t);
    env.fx.forEach(function (f, i) { if (DRAW[f.kind]) DRAW[f.kind](g, f, t, i, env); });
  }

  // 窗外：夜里亮星闪、流星、星穹列车；白天 / 清晨 / 黄昏飞鸟
  function cafeFxOut(g, env, t) {
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    var L = env.L, T = env.T, s = L.s, hz = L.VPy, x1 = L.win.x1;
    var ds = t - env.ev.scope;                                        // 点了望远镜：一颗大流星从右上划到左下
    if (ds >= 0 && ds < 1.1) {
      var q = ds / 1.1, hx = x1 * (0.95 - q * 0.8), hy = L.win.top + (18 + q * 120) * s;
      for (var n = 0; n < 34; n++) {
        var fade = (1 - n / 34) * (q < 0.8 ? 1 : (1 - q) / 0.2);
        dot(g, hx + n * 2.2 * s, hy - n * 0.8 * s, [255, 255, 255], fade, n < 3 ? 2 : 1);
        if (n % 3 === 0) dot(g, hx + n * 2.2 * s, hy - n * 0.8 * s + 1, [255, 230, 180], fade * 0.5);
      }
    }
    if (T.id === 'night') {
      for (var i = 0; i < 16; i++) {
        var a = Math.sin(t * (1 + rnd(i, 421) * 1.6) + i * 1.3);
        if (a < 0.2) continue;
        var x = rnd(i, 422) * x1, y = L.win.top + rnd(i, 423) * (hz - L.win.top - 30 * s);
        dot(g, x, y, [255, 255, 255], a);
        dot(g, x - 1, y, [200, 215, 255], a * 0.4); dot(g, x + 1, y, [200, 215, 255], a * 0.4); dot(g, x, y - 1, [200, 215, 255], a * 0.4); dot(g, x, y + 1, [200, 215, 255], a * 0.4);
      }
      var sp = t % 11;                                              // 流星
      if (sp < 0.7) {
        var sx = x1 * 0.8 - sp * 200 * s, sy = L.win.top + 30 * s + sp * 80 * s;
        for (var k = 0; k < 14; k++) dot(g, sx + k * 2 * s, sy - k * 0.8 * s, [255, 255, 255], (1 - k / 14) * (1 - sp / 0.7));
      }
      var tp = (t % 36) / 10;                                       // 星穹列车：每 36 秒从右往左驶过（10 秒）
      if (tp < 1) {
        var tx = x1 + 30 * s - tp * (x1 + 80 * s), ty = L.Y(0.24) + Math.sin(tp * Math.PI) * -10 * s;
        for (var q = 0; q < x1 + 60 * s; q += 1) {
          var qx = tx + 36 * s + q, fade = Math.max(0, 0.5 - q / (260 * s));
          if (fade > 0) dot(g, qx, ty + 4 * s + (qx - tx) * 0.04, [241, 210, 138], fade);
        }
        for (var c = 0; c < 4; c++) {
          var cx = tx + c * 9 * s, cy = ty + c * 9 * s * 0.04;
          g.fillStyle = c === 0 ? '#2a2b33' : '#3a3f6a';
          g.fillRect(Math.round(cx), Math.round(cy), Math.round(8 * s), Math.round(4 * s));
          g.fillStyle = '#ffe39a';
          g.fillRect(Math.round(cx + s), Math.round(cy + s), Math.round(6 * s), Math.max(1, Math.round(s)));
        }
        g.fillStyle = '#ffffff'; g.fillRect(Math.round(tx - s), Math.round(ty + s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
      }
    } else {
      var bp = (t % 17) / 8;                                        // 一小群鸟从左往右飞过
      if (bp < 1) {
        var col = T.id === 'day' ? [70, 80, 96] : [60, 44, 64];
        for (var b = 0; b < 4; b++) {
          var bx = -20 * s + bp * (x1 + 40 * s) - b * 9 * s - (b % 2) * 4 * s, by = L.Y(0.28) + b * 3 * s + Math.sin(t * 2 + b) * 2 * s;
          var fl = Math.sin(t * 9 + b * 1.3) > 0 ? -1 : 1;
          dot(g, bx, by, col, 1); dot(g, bx - s, by + fl * s, col, 1); dot(g, bx + s, by + fl * s, col, 1); dot(g, bx - 2 * s, by + fl * 2 * s, col, 0.8); dot(g, bx + 2 * s, by + fl * 2 * s, col, 0.8);
        }
      }
    }
  }

  PX.provide('08-cafe-fx', { cafeFxFast: cafeFxFast, cafeFxIn: cafeFxIn, cafeFxOut: cafeFxOut });
})(window.__abPixel = window.__abPixel || {});

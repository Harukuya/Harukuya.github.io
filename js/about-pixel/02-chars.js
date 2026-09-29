// About 页像素 Hero · 02-chars：角色：流萤与开拓者的卡通平涂小人（姿势、手臂、配色）
// 独立作用域：只能用下面 PX.need 声明过的别的文件的名字；给别的文件用的东西在末尾 PX.provide 里列出（机制见 01-core.js 开头）
(function (PX) {
  'use strict';

  PX.need('02-chars', ['Raster', 'band', 'clamp', 'hex', 'lerp', 'mix', 'rotPt']);
  var Raster = PX.Raster, band = PX.band, clamp = PX.clamp, hex = PX.hex, lerp = PX.lerp, mix = PX.mix,
    rotPt = PX.rotPt;

  // ========== 角色：卡通平涂小人（背影为主，可转头 / 侧身）==========
  // 画法沿用上一版：按官方三视图的背面服装，平涂色块 + 两三档明暗，逆光只勾亮剪影边。
  // 坐标仍用上一版的"像素"（原点 = 两脚中点的地面，y 向上为负，身高约 105），画的时候按 k 缩到画面高度的四分之一左右。
  // 在此基础上加了自然的姿态：头可以转（转过去时露出一点侧脸和耳朵）、可以歪；身体可以侧一点（背后的纹样跟着偏）；
  // 重心落在一条腿上（胯往一侧顶，另一条腿放松、膝盖微屈）；手臂 = 肩 → 肘 → 腕三点。

  function rad(d) { return d * Math.PI / 180; }

  // 画笔：局部坐标 → 精灵缓冲（缩放 k，外加随高度变化的横向错切 sh(y)，用来做身体倾斜）
  function Pen(r, ox, oy, k, sh) { this.r = r; this.ox = ox; this.oy = oy; this.k = k; this.sh = sh || function () { return 0; }; }
  Pen.prototype.X = function (x, y) { return this.ox + (x + this.sh(y)) * this.k; };
  Pen.prototype.Y = function (y) { return this.oy + y * this.k; };
  Pen.prototype.loc = function (px, py) { var ly = (py + 0.5 - this.oy) / this.k; return [(px + 0.5 - this.ox) / this.k - this.sh(ly), ly]; };
  // 颜色函数统一收到 (局部 x, 局部 y, 像素 x, 像素 y)
  Pen.prototype.fn = function (c) {
    if (typeof c !== 'function') return c;
    var s = this;
    return function (x, y) { var q = s.loc(x, y); return c(q[0], q[1], x, y); };
  };
  Pen.prototype.poly = function (pts, c) {
    var s = this;
    this.r.poly(pts.map(function (p) { return [s.X(p[0], p[1]), s.Y(p[1])]; }), this.fn(c));
  };
  Pen.prototype.disc = function (cx, cy, rr, c) {
    var s = this, f = typeof c === 'function' ? function (x, y, dx, dy, d) { var q = s.loc(x, y); return c(q[0], q[1], x, y, d); } : c;
    this.r.ellipse(this.X(cx, cy), this.Y(cy), Math.max(0.5, rr * this.k), Math.max(0.5, rr * this.k), 0, f);
  };
  Pen.prototype.capsule = function (x0, y0, x1, y1, w0, w1, c) {
    this.r.capsule(this.X(x0, y0), this.Y(y0), this.X(x1, y1), this.Y(y1), Math.max(1, w0 * this.k), Math.max(1, w1 * this.k), this.fn(c));
  };
  Pen.prototype.line = function (x0, y0, x1, y1, c, a) { this.r.line(this.X(x0, y0), this.Y(y0), this.X(x1, y1), this.Y(y1), c, a); };
  Pen.prototype.px = function (x, y, c, a) { this.r.px(this.X(x, y), this.Y(y), c, a); };
  Pen.prototype.rect = function (x, y, w, h, c) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c); };

  // ---------- 手臂：肩 → 肘 → 腕（相对肩膀的偏移；外侧为负）----------
  var ARM = {
    relaxed: { e: [-1.6, 16.5], w: [0.8, 15], layer: 'side' },
    behind: { e: [-1.3, 15], w: [9.6, 5.6], layer: 'over' },
    holdOut: { e: [-3.4, 16], w: [-5.2, 13.5], layer: 'side' },
    point: { e: [-9, -11.5], w: [-8, -11], layer: 'mid' },
    hip: { e: [-7.5, 10], w: [4.8, 7.5], layer: 'side' },
    pocket: { e: [-2.4, 15], w: [2.6, 10.5], layer: 'side', noHand: true },
    head: { e: [-9, -8], w: [6.8, -8], layer: 'over' },
    wave: { e: [-6.5, -9], w: [-1.5, -13], layer: 'mid' },
    shoulder: { e: [-5.5, 8], w: [-6.5, -5.5], layer: 'over' }
  };

  // 两人的姿势组合。order：从左到右；front：谁在前（压在另一人上面）；gap：两人中心距（上一版像素）。
  // 每人：L / R 两只手（L = 画面左边那只）、turn 身体侧转（+ = 朝画面右转）、look 头转向（+ = 看向右边，右侧露出侧脸）、
  // tilt 歪头（度）、hip 顶胯（+ = 胯往右、重心在右腿）、rest 放松的那条腿、lean 上身倾斜
  var POSES = [
    { name: '搭肩看窗外', order: ['tb', 'ff'], front: 'tb', gap: 27,
      tb: { L: 'hip', R: 'shoulder', turn: 0.25, look: 0.35, hip: -1.6, rest: 'R' },
      ff: { L: 'relaxed', R: 'behind', turn: -0.2, look: -0.75, tilt: -5, hip: 1.2, rest: 'L' } },
    { name: '牵手', order: ['tb', 'ff'], front: 'ff', gap: 33,
      tb: { L: 'relaxed', R: 'holdOut', turn: 0.15, look: 0.2, hip: -1.4, rest: 'R' },
      ff: { L: 'holdOut', R: 'relaxed', turn: -0.15, look: -0.45, hip: 1.4, rest: 'L' } },
    { name: '指给你看', order: ['ff', 'tb'], front: 'ff', gap: 29,
      ff: { L: 'point', R: 'relaxed', turn: -0.15, look: -0.3, hip: 1.2, rest: 'L' },
      tb: { L: 'relaxed', R: 'hip', turn: -0.2, look: -0.45, hip: 1.4, rest: 'L' } },
    { name: '靠在肩上', order: ['tb', 'ff'], front: 'ff', gap: 23,
      tb: { L: 'pocket', R: 'pocket', turn: 0.1, look: 0.25, tilt: 3, hip: -1, rest: 'R' },
      ff: { L: 'relaxed', R: 'relaxed', turn: -0.2, look: -0.4, tilt: -13, hip: 0.6, lean: -2.2, rest: 'R' } },
    { name: '伸懒腰', order: ['tb', 'ff'], front: 'tb', gap: 31,
      tb: { L: 'head', R: 'head', turn: 0, look: 0, tilt: 5, hip: 1.4, rest: 'L' },
      ff: { L: 'behind', R: 'behind', turn: -0.25, look: -0.8, tilt: -4, hip: 1.2, rest: 'L' } },
    { name: '挥手', order: ['tb', 'ff'], front: 'ff', gap: 30,
      tb: { L: 'relaxed', R: 'pocket', turn: 0.2, look: 0.45, hip: -1.4, rest: 'R' },
      ff: { L: 'relaxed', R: 'wave', turn: 0.1, look: 0.2, tilt: 4, hip: -1, rest: 'R' } }
  ];

  function armGeom(side, name, sx, sy, scale) {
    var a = ARM[name] || ARM.relaxed, m = side === 'L' ? 1 : -1;
    var e = [sx + a.e[0] * m * scale, sy + a.e[1] * scale];
    var w = [e[0] + a.w[0] * m * scale, e[1] + a.w[1] * scale];
    return { s: [sx, sy], e: e, w: w, layer: a.layer, noHand: a.noHand };
  }

  // 手臂：上臂（袖）→ 小臂（可分段：袖 / 袖口带 / 露出的皮肤）→ 手
  function drawArm(P, A, st) {
    var s = A.s, e = A.e, w = A.w;
    var fx = w[0] - e[0], fy = w[1] - e[1], fl = Math.hypot(fx, fy) || 1, ux = fx / fl, uy = fy / fl;
    if (st.foreSegs) {
      var from = 0;
      st.foreSegs.forEach(function (sg) {
        P.capsule(e[0] + fx * from, e[1] + fy * from, e[0] + fx * sg[0], e[1] + fy * sg[0], sg[2], sg[2], sg[1]);
        from = sg[0];
      });
    } else P.capsule(e[0], e[1], w[0], w[1], st.foreW[0], st.foreW[1], st.fore);
    if (st.frill) {
      var fw = A.layer === 'over' ? 4 : 5.2;
      P.capsule(w[0] - ux * 1.2, w[1] - uy * 1.2, w[0] + ux * 0.4, w[1] + uy * 0.4, fw, fw + 0.4, st.frill);
    }
    P.capsule(s[0], s[1], e[0], e[1], st.upperW[0], st.upperW[1], st.upper);
    if (st.emblem) {
      var mx = (s[0] + e[0]) / 2, my = (s[1] + e[1]) / 2 + 1;
      P.disc(mx, my, 1.9, st.emblemEdge);
      P.disc(mx, my, 1.1, st.emblem);
    }
    if (!A.noHand) P.disc(w[0] + ux * 2, w[1] + uy * 2, st.handR || 1.8, st.hand);
  }
  function drawArms(P, arms, layer, st) { ['L', 'R'].forEach(function (k) { if (arms[k].layer === layer) drawArm(P, arms[k], st); }); }

  // 腿：胯 → 膝 → 踝三点；重心腿直、放松的那条膝盖往里收、脚跟略抬
  function legGeom(side, pose, hipY, hipW, ankleY) {
    var m = side === 'L' ? -1 : 1, rest = pose.rest === side, hx = pose.hip || 0;
    var foot = m * (rest ? 4.8 : 3.7) + (rest ? hx * 0.2 : hx * 0.55);
    var hip = [m * hipW + hx, hipY], ank = [foot, ankleY - (rest ? 1.2 : 0)];
    var knee = [lerp(hip[0], ank[0], 0.5) - (rest ? m * 1.4 : 0), lerp(hipY, ankleY, 0.52)];
    return { m: m, hip: hip, knee: knee, ank: ank, rest: rest };
  }
  function legPoly(L, w) {
    var pts = [[L.hip, w[0]], [L.knee, w[1]], [L.ank, w[2]]], a = [], b = [];
    pts.forEach(function (q) { a.push([q[0][0] - q[1] / 2, q[0][1]]); b.push([q[0][0] + q[1] / 2, q[0][1]]); });
    return a.concat(b.reverse());
  }

  // ---------- 头发 + 头（长发 / 短发通用）----------
  // o.look：头转向（+ = 看向右边：右侧露出侧脸，头发整体往反方向让一点）；o.tilt：歪头（弧度，绕颈根）
  function tiltPt(p, o) { return o.tilt ? rotPt(p, o.pivot[0], o.pivot[1], o.tilt * clamp(1 - (p[1] - o.pivot[1]) / 22, 0, 1)) : p; }
  function hairFill(o) {
    return function (lx, ly, x, y) {
      if (o.tilt) { var q = rotPt([lx, ly], o.pivot[0], o.pivot[1], -o.tilt * clamp(1 - (ly - o.pivot[1]) / 22, 0, 1)); lx = q[0]; ly = q[1]; }
      lx -= o.dx;
      var t = (ly - o.top) / (o.bottom - o.top);
      var dx = lx - o.cx, dy = ly - o.cy, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      if (o.band && dy < -1 && dist > o.r - 2.2 && dist < o.r - 0.4 && ang < -0.35 && ang > -2.8) return o.band;
      if (dist > o.r - 3.6 && dist < o.r - 2 && ang > -2.5 && ang < -1.5 && dy < 0) return o.gloss;
      var shade = lx > o.shadeX - o.look * 3;
      for (var k = 0; k < o.strands.length; k++) {
        var sx = o.strands[k] + Math.sin(ly * 0.23 + k * 1.7) * 0.8;
        if (ly > o.strandFrom && Math.abs(lx - sx) < 0.8) { shade = true; break; }
      }
      if (lx < o.hiX - o.look * 2 && ly > o.cy - 4) return mix(band(o.stops, t, x, y), '#ffffff', 0.28);
      return band(shade ? o.shade : o.stops, t, x, y);
    };
  }
  function longHairPts(cx, cy, r, sides, bottomY, waveAmp, halfBottom) {
    var pts = [];
    for (var a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 14) pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    sides.forEach(function (p) { pts.push([p[0], p[1]]); });
    for (var x = halfBottom, i = 0; x >= -halfBottom - 1e-6; x -= 1.9, i++) pts.push([x, bottomY + (i % 2 ? waveAmp : 0)]);
    for (var j = sides.length - 1; j >= 0; j--) pts.push([-sides[j][0], sides[j][1]]);
    return pts;
  }
  // 头转过去时：转向那侧的头发往里收一点，给侧脸留位置
  function hairMakeRoom(pts, o, yMax, xMin) {
    if (Math.abs(o.look) < 0.2) return pts;
    var s = o.look > 0 ? 1 : -1;
    return pts.map(function (p) { return p[1] < yMax && (p[0] - o.dx) * s > xMin ? [p[0] - s * Math.abs(o.look) * 2.4, p[1]] : p; });
  }
  // 侧脸：转向那侧露出一弯脸颊 + 下颌（先画，头发压在上面）
  function drawFace(P, o, skin) {
    if (Math.abs(o.look) < 0.2) return;
    var s = o.look > 0 ? 1 : -1, cx = o.cx + o.dx, cy = o.cy, r = o.r, k = clamp(Math.abs(o.look), 0, 1);
    var pts = [[s * r * 0.35, cy + r * 0.05], [s * (r * 0.92 + k * 1.4), cy + r * 0.12], [s * (r * 0.88 + k * 1.8), cy + r * 0.55], [s * (r * 0.62 + k * 1.2), cy + r * 1.02], [s * r * 0.2, cy + r * 1.08]]
      .map(function (p) { return tiltPt([cx + p[0], p[1]], o); });
    P.poly(pts, function (lx) { return (lx - cx) * s > r * 0.8 ? skin[0] : skin[1]; });
  }

  // ---------- 流萤 ----------
  // 三视图背面：银白长卷发渐变到薄荷青的发梢；黑色发箍；左侧叶形发饰 + 深蓝蝴蝶结；深色短外套、泡泡袖上有青色菱形徽饰；
  // 白色长袖 + 荷叶边袖口；外套后摆两条长燕尾（深色 → 青绿渐变，金边）；腰后金色铃铛；奶白色百褶裙带青色翼纹；
  // 深蓝长筒袜（上缘青色 + 白色袜口）；短靴带青色荷叶边、浅灰鞋跟
  var FF_SKIN = ['#e9c9ba', '#f5dccf'];
  function drawFirefly(P, pose) {
    var tilt = rad(pose.tilt || 0), tw = (pose.turn || 0) * 2.4, look = pose.look || 0, hx = pose.hip || 0;
    var arms = { L: armGeom('L', pose.L, -11 + hx * 0.4, -83, 1), R: armGeom('R', pose.R, 11 + hx * 0.4, -83, 1) };
    var armStyle = { upper: '#3b3339', upperW: [7.2, 5.4], emblem: '#6cc0b6', emblemEdge: '#caa45e', fore: '#eeeef2', foreW: [4.2, 3.6], frill: '#ffffff', hand: '#f1d8ca', handR: 1.7 };
    // 腿：长筒袜（上缘青色袜口 + 白边），短靴
    ['L', 'R'].forEach(function (sd) {
      var L = legGeom(sd, pose, -58, 3.9, -8), m = L.m;
      P.poly(legPoly(L, [6.8, 5.2, 3.2]), function (x, y, px, py) {
        var outer = (x - L.knee[0]) * m > 0.6;
        if (y < -47) return FF_SKIN[0];
        if (y < -46) return '#e8eef0';
        if (y < -42) return outer ? '#3f8b93' : '#4d9ea6';
        return band(outer ? ['#27304a', '#1c2032', '#141725'] : ['#34405f', '#262b40', '#1c1f2e'], (y + 42) / 34, px, py);
      });
      var a = L.ank, lift = L.rest ? 1.2 : 0;
      P.poly([[a[0] - 2.2, a[1] - 2], [a[0] + 2.2, a[1] - 2], [a[0] + 2.6, a[1] + 1], [a[0] - 2.6, a[1] + 1]], function (x, y, px, py) { return (px + py) % 2 ? '#9bd8cf' : '#5ba5aa'; });
      P.poly([[a[0] - 2.2, a[1] + 1], [a[0] + 2.2, a[1] + 1], [a[0] + 2.4, a[1] + 8 + lift], [a[0] - 2.4, a[1] + 8 + lift]], '#272a36');
      P.rect(a[0] - 1.5, a[1] + 5.4 + lift, 3, 2.6, '#c7cbd4');
    });
    // 以下是胯以上：整体随顶胯平移 hx
    var X = function (x) { return x + hx; };
    // 百褶裙：奶白底 + 五片青色翼纹（翼纹跟着身体侧转偏移）
    P.poly([[X(-7.5), -65], [X(7.5), -65], [X(13.8), -48], [X(-13.8), -48]], function (x, y) { return y > -49 ? '#d6d6c4' : '#eeeddc'; });
    for (var k = -2; k <= 2; k++) {
      var o = X(k * 2.8 - tw);
      P.poly([[o - 1.8, -65], [o + 1.8, -65], [X(k * 4.8 - tw) + 1.4, -54], [X(k * 4.8 - tw), -51], [X(k * 4.8 - tw) - 1.4, -54]], function (x, y, px, py) {
        return band(['#4fa3a2', '#6cbfb6', '#9ad8cf'], (y + 65) / 14, px, py);
      });
    }
    // 燕尾：两条长后摆，深色 → 青绿 → 近白，外缘金边
    [-1, 1].forEach(function (m) {
      var d = X(-tw * 0.8);
      var tail = [[m * 8.6 + d, -69], [m * 2 + d, -67.5], [m * 3.2 + d, -56], [m * 6.6 + d, -40], [m * 9.8 + d, -28], [m * 12.3 + d, -25.5], [m * 12.7 + d, -38], [m * 11.9 + d, -56]];
      P.poly(tail, function (x, y, px, py) { return band(['#2f2931', '#2f2931', '#2f2931', '#34474c', '#5a9f9d', '#9ad6cc', '#d8f1e8'], (y + 69) / 43, px, py); });
      P.line(m * 11.9 + d, -56, m * 12.7 + d, -38, '#c7a15a');
      P.line(m * 12.7 + d, -38, m * 12.3 + d, -26, '#c7a15a');
    });
    // 腰后金铃
    var bx = X(-tw);
    P.poly([[bx - 1.8, -64], [bx + 1.8, -64], [bx + 3, -58.5], [bx - 3, -58.5]], function (x) { return x < bx - 0.5 ? '#f1d28a' : '#d4a84e'; });
    // 短外套背面（侧转时远侧一窄条压暗）
    P.poly([[X(-11.6), -86], [X(11.6), -86], [X(12), -82], [X(8.2), -66], [X(-8.2), -66], [X(-12), -82]], function (x, y) {
      if (y < -84) return '#51474f';
      return (x - hx) * (tw >= 0 ? 1 : -1) > 8.2 - Math.abs(tw) ? '#322b31' : '#3b3339';
    });
    P.line(X(-8.2), -66, X(8.2), -66, '#caa45e');
    drawArms(P, arms, 'side', armStyle);
    drawArms(P, arms, 'mid', armStyle);
    // 长卷发 + 侧脸
    var ho = { cx: 0, cy: -95.6, r: 8.9, dx: hx - look * 1.2 + tw * 0.2, look: look, tilt: tilt, pivot: [hx, -87], top: -104.5, bottom: -57.5,
      stops: ['#e6e6ea', '#e0e1e4', '#d8dadd', '#ced7d8', '#b9dcd5', '#98cfc7', '#7cc1ba'],
      shade: ['#c6c8ce', '#bdc0c6', '#b3b8bd', '#a8b8b8', '#8fbfb7', '#72b1aa', '#5fa39e'],
      shadeX: 7.6, hiX: -9.2, strands: [-6.4, -3, 0.6, 4], strandFrom: -92, gloss: '#fafafc', band: '#211d27' };
    drawFace(P, ho, FF_SKIN);
    var side = [[9.7, -90], [10.6, -85], [10.4, -81], [11.4, -76], [11.1, -71], [12, -66], [11.8, -62]];
    var hp = longHairPts(0, ho.cy, ho.r, side, -58.2, 1.6, 11.6).map(function (q) { return [q[0] + (q[1] < -85 ? ho.dx : hx + (ho.dx - hx) * 0.4), q[1]]; });
    hp = hairMakeRoom(hp, ho, -86, 3).map(function (p) { return tiltPt(p, ho); });
    P.poly(hp, hairFill(ho));
    // 左侧叶形发饰 + 深蓝蝴蝶结（跟着头一起转、一起歪）
    var H = function (p) { return tiltPt([p[0] + ho.dx, p[1]], ho); };
    P.poly([H([-8.4, -98]), H([-11.5, -103.5]), H([-14.2, -105.5]), H([-12.2, -100.5])], '#d3f0c9');
    P.poly([H([-8.6, -97]), H([-13.6, -99.5]), H([-16, -98.6]), H([-12.4, -95.8])], '#b6e4bb');
    P.poly([H([-9, -95]), H([-12, -97]), H([-12.4, -93]), H([-9.4, -92])], '#2b3566');
    P.poly([H([-10, -93]), H([-11.8, -88]), H([-10.6, -87.6]), H([-9.4, -92])], '#1d2550');
    drawArms(P, arms, 'over', armStyle);
  }

  // ---------- 开拓者共用：长外套背面 ----------
  // 三视图背面：深炭灰长外套（带兜帽，下摆外角露出金色内衬）；后腰中间一块浅灰机械纹面板，下摆两枚金色扣片；
  // 上背金色半圆纹章（星的长发会盖住）；tw 为身体侧转时背后纹样的横向偏移，hx 为顶胯平移
  function drawCoat(P, o, tw, hx) {
    function X(x) { return x + hx; }
    var sh = o.shoulderY, hw = o.shoulderW, hem = o.hemY, hemW = o.hemW;
    P.poly([[X(-hw), sh], [X(hw), sh], [X(hw + 1), sh + 8], [X(hw + 1.6), sh + 24], [X(hemW), hem + 1], [X(hemW - 3), hem + 2], [X(-hemW + 3), hem + 2.5], [X(-hemW), hem + 1.5], [X(-hw - 1.6), sh + 24], [X(-hw - 1), sh + 8]], function (x, y) {
      var lx = x - hx;
      if (y < sh + 3) return '#55565d';
      if (Math.abs(Math.abs(lx + tw) - hw * 0.62) < 0.6 && y > sh + 22) return '#2c2d32';
      var far = tw >= 0 ? lx > hw * 0.75 - tw * 1.5 : lx < -hw * 0.75 - tw * 1.5;
      return far ? '#35363c' : '#3e3f45';
    });
    P.poly([[X(-hemW), hem + 1.5], [X(-hemW + 3.2), hem + 2.5], [X(-hemW + 1.2), hem - 3.5]], '#e3b53f');
    P.poly([[X(hemW), hem + 1], [X(hemW - 3.2), hem + 2], [X(hemW - 1.2), hem - 4]], '#e3b53f');
    var pt = o.panelTop, c = X(-tw);
    P.poly([[c - 4.2, pt], [c + 4.2, pt], [c + 4.8, hem + 2], [c - 4.8, hem + 2]], function (x, y) {
      if (Math.abs(Math.abs(x - c) - 1.6) < 0.6) return '#9a9aa3';
      return y > hem - 1 ? '#c9c9cf' : '#dcdce1';
    });
    P.poly([[c - 4.6, pt + 2], [c - 3, pt - 0.6], [c, pt - 1.4], [c + 3, pt - 0.6], [c + 4.6, pt + 2], [c + 3.4, pt + 2], [c + 2.2, pt + 0.6], [c, pt], [c - 2.2, pt + 0.6], [c - 3.4, pt + 2]], '#d9ab45');
    P.rect(c - 4, hem - 1, 2, 3, '#d9ab45'); P.rect(c + 2, hem - 1, 2, 3, '#d9ab45');
    // 兜帽（堆在后颈）
    var hy = sh - 3, hc = X(-tw * 0.3);
    P.poly([[hc - 7.2, hy], [hc + 7.2, hy], [hc + 8.8, hy + 4], [hc + 6.2, hy + 10], [hc - 6.2, hy + 10], [hc - 8.8, hy + 4]], function (x, y) {
      return y < hy + 2 ? '#4a4b52' : '#36373c';
    });
    if (o.emblem) {
      var ey = sh + 14;
      P.disc(c, ey, 5.4, '#d9ab45');
      P.disc(c, ey, 4.2, '#3e3f45');
      P.rect(c - 6, ey, 12, 5.5, '#3e3f45');
      P.disc(c, ey, 2.4, '#d9ab45');
      P.disc(c, ey, 1.2, '#2a2b30');
    }
  }

  var TB_ARM = {
    upper: '#3e3f45', upperW: [6, 5.2],
    foreSegs: [[0.52, '#3e3f45', 4.8], [0.66, '#8e8f97', 4.8], [0.8, '#f2dacb', 3.4], [1, '#25252b', 3.8]],
    hand: '#25252b', handR: 2
  };
  var TB_SKIN = ['#e6c4b3', '#f2dacb'];

  // ---------- 星 ----------
  // 三视图背面：灰色长直发（到背中，发尾略深），头顶一撮呆毛；长外套 + 从左肩斜挎到右腰的黄色长带；
  // 七分袖（灰色袖口带）+ 黑色半指手套；光腿，黑色短靴（金色靴口）
  function drawStelle(P, pose) {
    var tw = (pose.turn || 0) * 2.4, look = pose.look || 0, tilt = rad(pose.tilt || 0), hx = pose.hip || 0;
    var arms = { L: armGeom('L', pose.L, -11 + hx, -85, 1.02), R: armGeom('R', pose.R, 11 + hx, -85, 1.02) };
    ['L', 'R'].forEach(function (sd) {
      var L = legGeom(sd, pose, -50, 3.7, -12), m = L.m;
      P.poly(legPoly(L, [6.3, 4.8, 3]), function (x) { return (x - L.knee[0]) * m < -0.5 ? '#dcbfb2' : '#f2dacb'; });
      var a = L.ank, lift = L.rest ? 1.2 : 0;
      P.poly([[a[0] - 2, a[1]], [a[0] + 2, a[1]], [a[0] + 2.3, a[1] + 12 + lift], [a[0] - 2.3, a[1] + 12 + lift]], function (x, y) { return y < a[1] + 1.6 ? '#d8a642' : '#26262c'; });
      P.rect(a[0] - 1.6, a[1] + 9 + lift, 3.2, 3, '#3c3c44');
    });
    drawCoat(P, { shoulderY: -88, shoulderW: 11, hemY: -45, hemW: 15.5, panelTop: -63, emblem: false }, tw, hx);
    // 黄色长带：左肩 → 右腰（外加右肩一小段短带）
    P.capsule(hx - 8.5 - tw * 0.3, -86, hx + 13.5 - tw * 0.5, -55, 2.4, 2.4, '#e5b83a');
    P.line(hx - 8.5 - tw * 0.3, -84.4, hx + 13.4 - tw * 0.5, -53.6, '#b88a24');
    P.capsule(hx + 8.5, -87, hx + 9.4, -79, 1.6, 1.6, '#e5b83a');
    drawArms(P, arms, 'side', TB_ARM);
    drawArms(P, arms, 'mid', TB_ARM);
    var ho = { cx: 0, cy: -98, r: 8.4, dx: hx - look * 1.2 + tw * 0.2, look: look, tilt: tilt, pivot: [hx, -89], top: -106.5, bottom: -62,
      stops: ['#d2d1d7', '#c5c4cb', '#b7b6be', '#a9a8b1', '#9b9aa4'],
      shade: ['#b3b2ba', '#a5a4ad', '#98979f', '#8b8a94', '#7e7d88'],
      shadeX: 7, hiX: -8.6, strands: [-6, -2.4, 1.6, 4.6], strandFrom: -94, gloss: '#eeeef2' };
    drawFace(P, ho, TB_SKIN);
    var hp = longHairPts(0, ho.cy, ho.r, [[9.2, -91], [9.9, -84], [10.4, -76], [10.6, -69], [10.3, -64]], -62.5, 2.2, 10.2)
      .map(function (q) { return [q[0] + (q[1] < -86 ? ho.dx : hx + (ho.dx - hx) * 0.4), q[1]]; });
    hp = hairMakeRoom(hp, ho, -88, 3).map(function (p) { return tiltPt(p, ho); });
    P.poly(hp, hairFill(ho));
    // 呆毛
    [[1, -106.5], [2, -107.6], [3, -108.2], [4, -107.8], [4.8, -106.9]].forEach(function (p) { var q = tiltPt([p[0] + ho.dx, p[1]], ho); P.disc(q[0], q[1], 0.9, '#c5c4cb'); });
    drawArms(P, arms, 'over', TB_ARM);
  }

  // ---------- 穹 ----------
  // 三视图背面：灰色短碎发（后颈参差），呆毛；长外套（上背金色半圆纹章露在外面）+ 两肩垂下的黄色细带；
  // 深灰长裤带竖向接缝，黑色运动鞋白鞋底
  function drawCaelus(P, pose) {
    var tw = (pose.turn || 0) * 2.4, look = pose.look || 0, tilt = rad(pose.tilt || 0), hx = pose.hip || 0;
    var arms = { L: armGeom('L', pose.L, -12.3 + hx, -89, 1.07), R: armGeom('R', pose.R, 12.3 + hx, -89, 1.07) };
    ['L', 'R'].forEach(function (sd) {
      var L = legGeom(sd, pose, -54, 4.1, -8), m = L.m;
      P.poly(legPoly(L, [7.1, 5.6, 4]), function (x) {
        if (Math.abs(x - L.knee[0] - m * 0.4) < 0.6) return '#4b4c54';
        return (x - L.knee[0]) * m < -0.6 ? '#26272c' : '#34353b';
      });
      var a = L.ank, lift = L.rest ? 1.2 : 0;
      P.poly([[a[0] - 2.6, a[1]], [a[0] + 2.6, a[1]], [a[0] + 3.2, a[1] + 6.4 + lift], [a[0] - 3.2, a[1] + 6.4 + lift]], '#27272d');
      P.rect(a[0] - 3.4, a[1] + 6 + lift, 6.8, 2, '#e6e6ea');
    });
    drawCoat(P, { shoulderY: -93, shoulderW: 12.4, hemY: -48, hemW: 16.5, panelTop: -67, emblem: true }, tw, hx);
    [-1, 1].forEach(function (m) { P.capsule(hx + m * 9.2 - tw * 0.2, -92, hx + m * 11.4 - tw * 0.3, -66, 1.3, 1.3, '#e5b83a'); });
    drawArms(P, arms, 'side', TB_ARM);
    drawArms(P, arms, 'mid', TB_ARM);
    var ho = { cx: 0, cy: -103, r: 8.7, dx: hx - look * 1.2 + tw * 0.2, look: look, tilt: tilt, pivot: [hx, -94], top: -111.7, bottom: -92,
      stops: ['#d0cfd6', '#c3c2ca', '#b3b2bb', '#a4a3ad'],
      shade: ['#b0afb8', '#a2a1aa', '#94939d', '#86858f'],
      shadeX: 6.4, hiX: -8.8, strands: [-5.4, -1.6, 2.2, 5.6], strandFrom: -100, gloss: '#eeeef2' };
    // 脖子 + 侧脸 + 耳朵（短发盖不住耳朵）
    P.poly([[hx - 3.6, -95], [hx + 3.6, -95], [hx + 3.8, -90.5], [hx - 3.8, -90.5]], TB_SKIN[0]);
    drawFace(P, ho, TB_SKIN);
    // 耳朵只在头转过去的那一侧露出来（贴着发际，不外支）
    if (Math.abs(look) >= 0.2) {
      var sE = look > 0 ? 1 : -1, qE = tiltPt([sE * (7.6 - Math.abs(look) * 1.2) + ho.dx, -100.5], ho);
      P.disc(qE[0], qE[1], 1.4, TB_SKIN[0]);
    }
    var pts = [];
    for (var a2 = Math.PI * 0.92; a2 <= Math.PI * 2.08; a2 += Math.PI / 14) pts.push([Math.cos(a2) * ho.r + ho.dx, ho.cy + Math.sin(a2) * ho.r]);
    [[9.2, -99], [8.8, -95.5], [7.4, -93.2], [6, -94.6], [4.6, -92.4], [3, -94], [1.4, -92], [-0.2, -93.8], [-1.8, -91.8], [-3.4, -93.6], [-4.8, -92.2], [-6.4, -94.4], [-7.6, -93], [-9, -95.6], [-9.3, -99]].forEach(function (p) { pts.push([p[0] + ho.dx, p[1]]); });
    pts = hairMakeRoom(pts, ho, -93, 5).map(function (p) { return tiltPt(p, ho); });
    P.poly(pts, hairFill(ho));
    [[1, -111.4], [2, -112.6], [3.2, -113], [4.2, -112.4]].forEach(function (p) { var q = tiltPt([p[0] + ho.dx, p[1]], ho); P.disc(q[0], q[1], 0.9, '#c3c2ca'); });
    drawArms(P, arms, 'over', TB_ARM);
  }

  // 角色精灵：先按服装画在透明缓冲上，再压暗 + 加轮廓光（逆光：窗外的光从人物正前方照来，只勾亮剪影边缘），
  // 最后在剪影外描一圈淡淡的深色边，人物站在亮的星球前也看得清
  function charSprite(kind, pose, light, k) {
    var W = Math.ceil(84 * k) + 6, H = Math.ceil(122 * k) + 6;
    var r = new Raster(W, H, Math.round(W / 2), H - 3);
    var lean = pose.lean || 0;
    var P = new Pen(r, 0, 0, k, function (y) { return y > -56 ? 0 : lean * clamp((-56 - y) / 50, 0, 1); });
    if (kind === 'firefly') drawFirefly(P, pose);
    else if (kind === 'stelle') drawStelle(P, pose);
    else drawCaelus(P, pose);
    var d = r.d, src = new Uint8ClampedArray(d);
    var shadow = hex(light.shadow), rim = hex(light.rim);
    function alphaAt(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? 0 : src[(y * W + x) * 4 + 3]; }
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        if (!src[i + 3]) continue;
        var c = mix([src[i], src[i + 1], src[i + 2]], shadow, light.dim);
        var edge = !alphaAt(x, y - 1) || !alphaAt(x - 1, y) || !alphaAt(x + 1, y);
        if (edge) c = mix(c, rim, light.rimA);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
    }
    var ol = hex(light.outline || '#0a0c1e');
    for (var y2 = 0; y2 < H; y2++) {
      for (var x2 = 0; x2 < W; x2++) {
        if (src[(y2 * W + x2) * 4 + 3]) continue;
        if (alphaAt(x2 - 1, y2) || alphaAt(x2 + 1, y2) || alphaAt(x2, y2 - 1) || alphaAt(x2, y2 + 1)) r.px(x2 - r.ox, y2 - r.oy, ol, light.outlineA === undefined ? 0.5 : light.outlineA);
      }
    }
    r.ax = r.ox; r.ay = r.oy;   // 精灵里原点（脚下）的位置
    return r;
  }

  PX.provide('02-chars', { POSES: POSES, charSprite: charSprite });
})(window.__abPixel = window.__abPixel || {});

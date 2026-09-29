// 08b-cafe-play：纯享背景时点东西的反馈
// 弹出来的字 / 音符（DOM 小气泡，放在 #ab-cafe 里，往上飘、淡出后自己删掉），和两段现合成的声音（Web Audio，不用音频文件）：
//   吉他：Karplus-Strong 拨弦（一小段噪声在环形缓冲里反复取平均 = 衰减的弦音），随机一个和弦从低到高扫一遍；
//   咖啡机：一段带通的白噪声，快起慢落的「滋——」。
// 声音上下文第一次用到时才建（要在点击里建，浏览器才让出声）。
(function (PX) {
  'use strict';

  var ac = null;
  function audio() {
    if (!ac) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // 一根弦：freq 赫兹，在 when 时刻拨响，音量 gain
  function pluck(c, freq, when, gain) {
    var sr = c.sampleRate, len = Math.floor(sr * 1.8), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    var N = Math.max(2, Math.round(sr / freq)), ring = new Float32Array(N), i;
    for (i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    for (i = 0; i < len; i++) {
      var j = i % N, nx = ring[(j + 1) % N];
      d[i] = ring[j];
      ring[j] = 0.4985 * (ring[j] + nx);
    }
    var src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    lp.type = 'lowpass'; lp.frequency.value = 3000;
    g.gain.value = gain;
    src.connect(lp); lp.connect(g); g.connect(c.destination);
    src.start(when);
  }
  // C / G / Am / F 四个和弦（从低到高五根弦）
  var CHORDS = [[130.81, 164.81, 196, 261.63, 329.63], [98, 123.47, 146.83, 196, 246.94], [110, 164.81, 220, 261.63, 329.63], [87.31, 130.81, 174.61, 220, 261.63]];
  function cafeStrum() {
    var c = audio();
    if (!c) return;
    var ch = CHORDS[Math.floor(Math.random() * CHORDS.length)], t = c.currentTime + 0.02;
    ch.forEach(function (f, i) { pluck(c, f, t + i * 0.035, 0.2); });
  }

  function cafeHiss() {
    var c = audio();
    if (!c) return;
    var sr = c.sampleRate, len = Math.floor(sr * 1.1), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    src.buffer = buf;
    bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.9;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.06);
    g.gain.linearRampToValueAtTime(0.05, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + 1.05);
    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t);
  }

  // 弹出一个小气泡（note = 音符：没有底框、金色、往旁边飘一点再淡出）；x, y = 气泡尖所在的位置（相对 #ab-cafe）
  function cafePop(box, text, x, y, note, delay) {
    setTimeout(function () {
      var el = document.createElement('div');
      el.className = 'ab-cafe-pop' + (note ? ' is-note' : '');
      el.textContent = text;
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
      if (note) {
        el.style.setProperty('--dx', Math.round((Math.random() - 0.3) * 50) + 'px');
        el.style.setProperty('--rot', Math.round((Math.random() - 0.5) * 40) + 'deg');
      }
      box.appendChild(el);
      el.addEventListener('animationend', function () { el.remove(); });
      setTimeout(function () { el.remove(); }, 2600);
    }, delay || 0);
  }

  PX.provide('08b-cafe-play', { cafeHiss: cafeHiss, cafePop: cafePop, cafeStrum: cafeStrum });
})(window.__abPixel = window.__abPixel || {});

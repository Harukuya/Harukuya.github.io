/**
 * About 页面动画与交互脚本
 * 依赖：GSAP + ScrollTrigger + TypeIt
 */

// ========== 配置数据 ==========

// Hero 打字机内容库
// 每个单位包含 lines（分行内容数组）和 source（来源）
const HERO_QUOTES = [
  {
    lines: ["你好，世界", "这里是一般路过小辉夜", "欢迎来到 TechCafe"],
    source: "— Noctuna"
  },
  {
    lines: ["代码是诗", "每一行都是思想的痕迹", "每一个 bug 都是成长的印记"],
    source: "— 个人感悟"
  },
  {
    lines: ["探索未知", "用好奇心驱动前行", "在技术的海洋里航行"],
    source: "— TechCafe 理念"
  }
];

// Split 区域打字机内容库
const SPLIT_QUOTES = [
  {
    lines: ["上海", "材料科学与工程背景", "正在探索技术与艺术的交汇点"],
    source: "— 关于我"
  },
  {
    lines: ["INTJ", "逻辑与直觉并存", "在理性与感性之间寻找平衡"],
    source: "— 性格标签"
  }
];

const SPLIT2_QUOTES = [
  {
    lines: ["流萤厨", "剧情党", "星萤 / 穹萤 / 小鸟兄妹 cb"],
    source: "— 崩铁成分"
  },
  {
    lines: ["喜欢收集周边", "逛展子", "演唱会", "交换无料"],
    source: "— 线下活动"
  }
];

// ========== 工具函数 ==========

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 计算博客运行天数
function calcRuntime() {
  const start = new Date('2023-04-12');
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const el = document.getElementById('about-runtime');
  if (el) el.textContent = days;
}

// 更新时间
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const el = document.getElementById('about-time');
  if (el) el.textContent = timeStr;
}

// ========== 打字机初始化 ==========

function initTypewriter(containerId, quote, delay = 0) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 清空容器
  container.innerHTML = '';

  // 创建内容行容器
  const linesEl = document.createElement('div');
  linesEl.className = 'about-typewriter-lines';
  container.appendChild(linesEl);

  // 创建来源元素（初始隐藏）
  const sourceEl = document.createElement('div');
  sourceEl.className = 'about-typewriter-source';
  sourceEl.textContent = quote.source;
  container.appendChild(sourceEl);

  // 使用 TypeIt 逐行打印
  const ti = new TypeIt(linesEl, {
    speed: 85,
    cursor: true,
    cursorSpeed: 530,
    startDelay: delay,
    afterComplete: () => {
      sourceEl.style.opacity = '1';
    }
  });

  quote.lines.forEach((line, i) => {
    ti.type(line);
    if (i < quote.lines.length - 1) {
      ti.break();
    }
  });

  ti.go();
  return ti;
}

// ========== GSAP 动画 ==========

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  const universe = document.getElementById('universe');

  // ------ 1. Hero 遮罩变暗 ------
  gsap.to('.about-hero-overlay', {
    opacity: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#about-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });

  // ------ 2. Block 1 卡片浮现 ------
  gsap.from('.about-card', {
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#block-1',
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    }
  });

  // ------ 3. Split 1 分割展开 ------
  const split1Tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#split-1',
      start: 'top top',
      end: '+=350%',
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      onEnter: () => {
        // 进入 Split 1 时触发打字机
        const quote = randomPick(SPLIT_QUOTES);
        initTypewriter('split-text-1', quote, 600);
      }
    }
  });

  // 阶段 1：白线从中心向两边展开 (0% - 10%)
  split1Tl.fromTo('#split-1 .about-split-line',
    { scaleX: 0 },
    { scaleX: 1, ease: 'power2.inOut' },
    0
  );

  // 阶段 2：上下遮罩分离到 1/4 和 3/4 (10% - 35%)
  split1Tl.fromTo('#split-1 .about-split-mask-top',
    { y: 0 },
    { y: '-25vh', ease: 'power2.inOut' },
    0.1
  );
  split1Tl.fromTo('#split-1 .about-split-mask-bottom',
    { y: 0 },
    { y: '25vh', ease: 'power2.inOut' },
    0.1
  );

  // 同时星空淡出
  if (universe) {
    split1Tl.to(universe,
      { opacity: 0, ease: 'power2.inOut' },
      0.1
    );
  }

  // 图片和文字轻微放大显现
  split1Tl.fromTo('#split-1 .about-split-image',
    { scale: 0.9, opacity: 0.6 },
    { scale: 1, opacity: 1, ease: 'power2.out' },
    0.15
  );

  // 阶段 3：保持 (35% - 65%)
  // 这段时间画面固定，用户可以看到完整的图片和打字机文字

  // 阶段 4：合拢 (65% - 90%)
  split1Tl.to('#split-1 .about-split-mask-top',
    { y: 0, ease: 'power2.inOut' },
    0.65
  );
  split1Tl.to('#split-1 .about-split-mask-bottom',
    { y: 0, ease: 'power2.inOut' },
    0.65
  );

  if (universe) {
    split1Tl.to(universe,
      { opacity: 1, ease: 'power2.inOut' },
      0.65
    );
  }

  split1Tl.to('#split-1 .about-split-line',
    { scaleX: 0, ease: 'power2.inOut' },
    0.75
  );

  // 阶段 5：快要完全合拢时，Block 2 浮现 (85% - 100%)
  split1Tl.to('#block-2',
    { opacity: 1, y: 0, ease: 'power2.out' },
    0.85
  );

  // ------ 4. Block 2 卡片浮现（额外的滚动触发，确保进入视口时也有动画） ------
  gsap.from('#block-2 .about-card', {
    y: 40,
    opacity: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#block-2',
      start: 'top 75%',
      toggleActions: 'play none none reverse'
    }
  });

  // ------ 5. Split 2 分割展开 ------
  const split2Tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#split-2',
      start: 'top top',
      end: '+=350%',
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      onEnter: () => {
        const quote = randomPick(SPLIT2_QUOTES);
        initTypewriter('split-text-2', quote, 600);
      }
    }
  });

  split2Tl.fromTo('#split-2 .about-split-line',
    { scaleX: 0 },
    { scaleX: 1, ease: 'power2.inOut' },
    0
  );

  split2Tl.fromTo('#split-2 .about-split-mask-top',
    { y: 0 },
    { y: '-25vh', ease: 'power2.inOut' },
    0.1
  );
  split2Tl.fromTo('#split-2 .about-split-mask-bottom',
    { y: 0 },
    { y: '25vh', ease: 'power2.inOut' },
    0.1
  );

  if (universe) {
    split2Tl.to(universe,
      { opacity: 0, ease: 'power2.inOut' },
      0.1
    );
  }

  split2Tl.fromTo('#split-2 .about-split-image',
    { scale: 0.9, opacity: 0.6 },
    { scale: 1, opacity: 1, ease: 'power2.out' },
    0.15
  );

  split2Tl.to('#split-2 .about-split-mask-top',
    { y: 0, ease: 'power2.inOut' },
    0.65
  );
  split2Tl.to('#split-2 .about-split-mask-bottom',
    { y: 0, ease: 'power2.inOut' },
    0.65
  );

  if (universe) {
    split2Tl.to(universe,
      { opacity: 1, ease: 'power2.inOut' },
      0.65
    );
  }

  split2Tl.to('#split-2 .about-split-line',
    { scaleX: 0, ease: 'power2.inOut' },
    0.75
  );

  split2Tl.to('#block-3',
    { opacity: 1, y: 0, ease: 'power2.out' },
    0.85
  );

  // ------ 6. Block 3 卡片浮现 ------
  gsap.from('#block-3 .about-card', {
    y: 40,
    opacity: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#block-3',
      start: 'top 75%',
      toggleActions: 'play none none reverse'
    }
  });

  // ------ 7. 页脚浮现 ------
  gsap.from('#footer', {
    opacity: 0,
    y: 20,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#footer',
      start: 'top 90%',
      toggleActions: 'play none none reverse'
    }
  });
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
  // 时间更新
  updateTime();
  setInterval(updateTime, 1000);

  // 运行天数
  calcRuntime();

  // Hero 打字机（随机选取一个单位）
  const heroQuote = randomPick(HERO_QUOTES);
  initTypewriter('about-typewriter', heroQuote, 800);

  // GSAP 动画
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof TypeIt !== 'undefined') {
    initAnimations();
  } else {
    // CDN 加载失败时降级：直接显示内容
    console.warn('GSAP / ScrollTrigger / TypeIt 未加载，动画已降级');
    document.querySelectorAll('#block-2, #block-3').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
});

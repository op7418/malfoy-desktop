// 马尔福小姐 · Three.js 特效库（宣传片与正片共用）
// 所有效果都是 progress / time 的纯函数：由 GSAP 时间轴的 onUpdate 驱动，不用 rAF，不用 Math.random。
(function () {
  const W = 1920, H = 1080;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.setClearColor(0x000000, 0);
    return r;
  }

  // 像素坐标正交相机：x 0..1920 向右，y 0..1080 向下
  function pixelCamera() {
    const cam = new THREE.OrthographicCamera(0, W, 0, -H, -2000, 2000);
    cam.position.z = 1000;
    return cam;
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }

  const ease = {
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: (x) => 1 - Math.pow(1 - x, 3),
    in: (x) => x * x * x,
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // ---------------------------------------------------------------- 碎裂
  // opts: { image, cx, cy (0..1 冲击点), cols, rows, seed, spread }
  function shatter(canvas, opts) {
    const o = Object.assign({ cols: 20, rows: 12, seed: 7, cx: 0.5, cy: 0.5, spread: 1 }, opts);
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const fov = 30;
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
    const planeH = 9, planeW = 16;
    camera.position.z = planeH / 2 / Math.tan((fov * Math.PI) / 360);
    let mesh = null, mat = null;
    const state = { p: 0 };

    const ready = loadImage(o.image).then((img) => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.NoColorSpace;
      const R = rng(o.seed);
      // 抖动网格顶点（边缘不抖），每个格子两三角
      const vx = [], vy = [];
      for (let j = 0; j <= o.rows; j++) {
        for (let i = 0; i <= o.cols; i++) {
          let u = i / o.cols, v = j / o.rows;
          if (i > 0 && i < o.cols) u += (R() - 0.5) * 0.8 / o.cols;
          if (j > 0 && j < o.rows) v += (R() - 0.5) * 0.8 / o.rows;
          vx.push(u); vy.push(v);
        }
      }
      const idx = (i, j) => j * (o.cols + 1) + i;
      const pos = [], uv = [], cen = [], rnd = [], bary = [];
      const tri = (a, b, c) => {
        const cxu = (vx[a] + vx[b] + vx[c]) / 3, cyv = (vy[a] + vy[b] + vy[c]) / 3;
        const r1 = R(), r2 = R(), r3 = R(), r4 = R();
        [a, b, c].forEach((k, n) => {
          pos.push((vx[k] - 0.5) * planeW, (0.5 - vy[k]) * planeH, 0);
          uv.push(vx[k], 1 - vy[k]);
          cen.push((cxu - 0.5) * planeW, (0.5 - cyv) * planeH, 0);
          rnd.push(r1, r2, r3, r4);
          bary.push(n === 0 ? 1 : 0, n === 1 ? 1 : 0, n === 2 ? 1 : 0);
        });
      };
      for (let j = 0; j < o.rows; j++) {
        for (let i = 0; i < o.cols; i++) {
          const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
          if (R() > 0.5) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("aCenter", new THREE.Float32BufferAttribute(cen, 3));
      g.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 4));
      g.setAttribute("aBary", new THREE.Float32BufferAttribute(bary, 3));
      mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTex: { value: tex },
          uP: { value: 0 },
          uImpact: { value: new THREE.Vector2((o.cx - 0.5) * planeW, (0.5 - o.cy) * planeH) },
          uSpread: { value: o.spread },
        },
        vertexShader: `
          attribute vec3 aCenter; attribute vec4 aRand; attribute vec3 aBary;
          uniform float uP; uniform vec2 uImpact; uniform float uSpread;
          varying vec2 vUv; varying vec3 vBary; varying float vT;
          mat3 rotAxis(vec3 ax, float a){ ax=normalize(ax); float s=sin(a), c=cos(a), oc=1.0-c;
            return mat3(oc*ax.x*ax.x+c, oc*ax.x*ax.y+ax.z*s, oc*ax.z*ax.x-ax.y*s,
                        oc*ax.x*ax.y-ax.z*s, oc*ax.y*ax.y+c, oc*ax.y*ax.z+ax.x*s,
                        oc*ax.z*ax.x+ax.y*s, oc*ax.y*ax.z-ax.x*s, oc*ax.z*ax.z+c); }
          void main(){
            vUv = uv; vBary = aBary;
            vec2 d = aCenter.xy - uImpact; float dist = length(d);
            float delay = dist / 18.0 * 0.55 + aRand.w * 0.08;
            float t = clamp((uP - delay) / (1.0 - 0.55), 0.0, 1.0);
            vT = t;
            float e = t * t;
            vec3 local = position - aCenter;
            vec3 axis = vec3(aRand.x - 0.5, aRand.y - 0.5, 0.6);
            local = rotAxis(axis, e * (2.0 + aRand.z * 5.0)) * local;
            local *= (1.0 - 0.35 * e);
            vec2 dir = dist > 0.001 ? d / dist : vec2(0.0, 1.0);
            vec3 c = aCenter;
            c.xy += dir * e * (3.0 + aRand.x * 4.0) * uSpread;
            c.y -= e * e * 2.5;
            c.z += e * (6.0 + aRand.y * 10.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(c + local, 1.0);
          }`,
        fragmentShader: `
          uniform sampler2D uTex; varying vec2 vUv; varying vec3 vBary; varying float vT;
          void main(){
            vec4 col = texture2D(uTex, vUv);
            float edge = 1.0 - smoothstep(0.0, 0.035, min(min(vBary.x, vBary.y), vBary.z));
            float crack = edge * smoothstep(0.0, 0.08, vT) ;
            vec3 silver = vec3(0.86, 0.9, 0.93);
            col.rgb = mix(col.rgb, silver, crack * 0.85);
            col.rgb *= 1.0 + vT * 0.35;
            col.a = 1.0 - smoothstep(0.55, 1.0, vT);
            gl_FragColor = col;
          }`,
      });
      mesh = new THREE.Mesh(g, mat);
      scene.add(mesh);
      render();
    });

    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p;
      renderer.render(scene, camera);
    }
    return { state, render, ready };
  }

  // ---------------------------------------------------------------- 银尘消散
  // opts: { image, step(px), seed, dir: 1 左→右 / -1 右→左 }
  function dust(canvas, opts) {
    const o = Object.assign({ step: 5, seed: 11, dir: 1 }, opts);
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = pixelCamera();
    let mat = null;
    const state = { p: 0 };
    const ready = loadImage(o.image).then((img) => {
      const cw = Math.floor(W / o.step), ch = Math.floor(H / o.step);
      const c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      const R = rng(o.seed);
      const n = cw * ch;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const k = j * cw + i, q = k * 4;
        pos[k * 3] = (i + 0.5) * o.step; pos[k * 3 + 1] = -(j + 0.5) * o.step; pos[k * 3 + 2] = 0;
        // 输出 sRGB，片元里直接用
        col[k * 3] = data[q] / 255; col[k * 3 + 1] = data[q + 1] / 255; col[k * 3 + 2] = data[q + 2] / 255;
        rnd[k * 4] = R(); rnd[k * 4 + 1] = R(); rnd[k * 4 + 2] = R(); rnd[k * 4 + 3] = R();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
      g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
      mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uP: { value: 0 }, uStep: { value: o.step }, uDir: { value: o.dir } },
        vertexShader: `
          attribute vec3 aCol; attribute vec4 aRand;
          uniform float uP; uniform float uStep; uniform float uDir;
          varying vec3 vCol; varying float vT;
          void main(){
            vCol = aCol;
            float x = position.x / 1920.0; if (uDir < 0.0) x = 1.0 - x;
            float delay = x * 0.5 + aRand.x * 0.12 + sin(position.y * 0.01) * 0.03;
            float t = clamp((uP - delay) / 0.38, 0.0, 1.0);
            vT = t;
            float e = t * t;
            vec3 p = position;
            float swirl = aRand.y * 6.2831;
            p.x += uDir * e * (420.0 + aRand.z * 900.0);
            p.y += e * (160.0 + aRand.w * 420.0) + sin(swirl + t * 7.0) * 60.0 * t;
            p.x += cos(swirl + t * 5.0) * 70.0 * t;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            float sz = uStep * 1.45;
            gl_PointSize = t > 0.0 ? mix(sz, 1.6 + aRand.x * 2.2, smoothstep(0.0, 0.35, t)) : sz;
          }`,
        fragmentShader: `
          varying vec3 vCol; varying float vT;
          void main(){
            vec2 q = gl_PointCoord - 0.5;
            float r = length(q);
            float shape = vT > 0.0 ? 1.0 - smoothstep(0.3, 0.5, r) : 1.0;
            vec3 silver = vec3(0.88, 0.92, 0.95);
            vec3 c = mix(vCol, silver, smoothstep(0.02, 0.4, vT));
            c += vec3(0.25) * smoothstep(0.0, 0.15, vT) * (1.0 - smoothstep(0.15, 0.6, vT));
            float a = shape * (1.0 - smoothstep(0.45, 1.0, vT));
            gl_FragColor = vec4(c, a);
          }`,
      });
      scene.add(new THREE.Points(g, mat));
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p;
      renderer.render(scene, camera);
    }
    return { state, render, ready };
  }

  // ---------------------------------------------------------------- 选择特效
  // 衔尾蛇粒子环 + 漂浮银尘 + 悬停聚拢 + 点击冲击波
  // opts: { cx, cy, rx, ry (环，像素), hoverX, hoverY (被选项中心), seed }
  // state: { t (秒), appear 0..1, hover 0..1, click 0..1 (点击后经过的归一化时间) }
  function choiceFx(canvas, opts) {
    const o = Object.assign({ cx: 560, cy: 760, rx: 520, ry: 190, hoverX: 520, hoverY: 840, seed: 23, count: 2600 }, opts);
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = pixelCamera();
    const R = rng(o.seed);
    const n = o.count;
    const rnd = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = R(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uT: { value: 0 }, uAppear: { value: 0 }, uHover: { value: 0 }, uClick: { value: 0 },
        uC: { value: new THREE.Vector2(o.cx, -o.cy) }, uRad: { value: new THREE.Vector2(o.rx, o.ry) },
        uH: { value: new THREE.Vector2(o.hoverX, -o.hoverY) },
      },
      vertexShader: `
        attribute vec4 aRand;
        uniform float uT, uAppear, uHover, uClick; uniform vec2 uC, uRad, uH;
        varying float vA; varying float vHot;
        void main(){
          float ring = step(0.28, aRand.w); // 72% 在环上，其余是漂浮银尘
          float ang = aRand.x * 6.2831 + uT * (0.35 + aRand.y * 0.15);
          // 衔尾蛇：环的粗细沿角度变化（头粗尾细）
          float thick = mix(6.0, 34.0, fract(aRand.x + uT * 0.05));
          vec2 onRing = uC + vec2(cos(ang) * uRad.x, sin(ang) * uRad.y) + vec2(aRand.z - 0.5, aRand.y - 0.5) * thick;
          vec2 drift = vec2(aRand.x * 1920.0, -aRand.y * 1080.0) + vec2(sin(uT * 0.4 + aRand.z * 6.0) * 40.0, uT * (12.0 + aRand.z * 20.0));
          drift.y = -mod(-drift.y, 1080.0);
          vec2 p = mix(drift, onRing, ring);
          // 悬停：环上粒子向被选项收拢
          vec2 toH = uH + vec2(cos(ang * 3.0) * 260.0, sin(ang * 3.0) * 46.0);
          p = mix(p, toH, ring * uHover * 0.55 * (0.6 + 0.4 * aRand.z));
          // 点击：从被选项向外爆散
          vec2 dir = normalize(p - uH + vec2(0.0001));
          float burst = uClick * uClick;
          p += dir * burst * (300.0 + aRand.y * 700.0) * ring;
          vHot = uHover * ring;
          float tw = 0.55 + 0.45 * sin(uT * 3.0 + aRand.z * 40.0);
          vA = uAppear * (ring > 0.5 ? (0.55 + 0.45 * tw) : 0.25 * tw) * (1.0 - smoothstep(0.35, 1.0, uClick));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
          gl_PointSize = (ring > 0.5 ? 2.2 + aRand.z * 3.2 : 1.4 + aRand.z * 2.0) * (1.0 + uHover * 0.5 * ring);
        }`,
      fragmentShader: `
        varying float vA; varying float vHot;
        void main(){
          float r = length(gl_PointCoord - 0.5);
          float a = (1.0 - smoothstep(0.1, 0.5, r)) * vA;
          vec3 silver = vec3(0.85, 0.9, 0.94);
          vec3 emerald = vec3(0.35, 0.78, 0.55);
          gl_FragColor = vec4(mix(silver, emerald, vHot * 0.55), a);
        }`,
    });
    scene.add(new THREE.Points(g, mat));
    // 冲击波：两圈环
    const waves = [0, 1].map((k) => {
      const m = new THREE.MeshBasicMaterial({ color: k ? 0x6fd39a : 0xe6edf1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const w = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 128), m);
      w.position.set(o.hoverX, -o.hoverY, 1);
      scene.add(w);
      return { w, m, k };
    });
    const state = { t: 0, appear: 0, hover: 0, click: 0 };
    function render() {
      // 可选：实时程序里动态改环的位置与被悬停项
      if (state.cx != null) mat.uniforms.uC.value.set(state.cx, -state.cy);
      if (state.rx != null) mat.uniforms.uRad.value.set(state.rx, state.ry);
      if (state.hx != null) {
        mat.uniforms.uH.value.set(state.hx, -state.hy);
        waves.forEach(({ w }) => w.position.set(state.hx, -state.hy, 1));
      }
      mat.uniforms.uT.value = state.t;
      mat.uniforms.uAppear.value = state.appear;
      mat.uniforms.uHover.value = state.hover;
      mat.uniforms.uClick.value = state.click;
      waves.forEach(({ w, m, k }) => {
        const c = clamp01((state.click - k * 0.12) / 0.7);
        const s = 20 + ease.out(c) * (k ? 520 : 760);
        w.scale.set(s, s * 0.42, 1);
        m.opacity = c > 0 ? (1 - c) * (k ? 0.5 : 0.8) : 0;
      });
      renderer.render(scene, camera);
    }
    render();
    return { state, render, ready: Promise.resolve() };
  }

  // ---------------------------------------------------------------- 粒子聚字
  // lines: [{ text, font, x, y, align, color }]  像素坐标，baseline=middle
  function particleText(canvas, opts) {
    const o = Object.assign({ step: 3, seed: 31, lines: [] }, opts);
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = pixelCamera();
    let mat = null;
    const state = { p: 0, fade: 0 };
    const fontLoads = o.lines.map((l) => document.fonts.load(l.font, l.text).catch(() => {}));
    const ready = Promise.all(fontLoads).then(() => document.fonts.ready).then(() => {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      o.lines.forEach((l) => {
        ctx.font = l.font;
        ctx.textAlign = l.align || "left";
        if (l.spacing) ctx.letterSpacing = l.spacing;
        ctx.fillText(l.text, l.x, l.y);
      });
      const data = ctx.getImageData(0, 0, W, H).data;
      const R = rng(o.seed);
      const pts = [];
      for (let y = 0; y < H; y += o.step) for (let x = 0; x < W; x += o.step) {
        if (data[(y * W + x) * 4 + 3] > 120) pts.push(x, y);
      }
      const n = pts.length / 2;
      const pos = new Float32Array(n * 3), from = new Float32Array(n * 3), rnd = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = pts[i * 2]; pos[i * 3 + 1] = -pts[i * 2 + 1];
        const a = R() * 6.2831, rr = 300 + R() * 1100;
        from[i * 3] = pts[i * 2] + Math.cos(a) * rr; from[i * 3 + 1] = -pts[i * 2 + 1] + Math.sin(a) * rr * 0.6; from[i * 3 + 2] = 0;
        rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = R();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
      g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
      mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uP: { value: 0 }, uFade: { value: 0 } },
        vertexShader: `
          attribute vec3 aFrom; attribute vec4 aRand; uniform float uP, uFade; varying float vA;
          void main(){
            float d = aRand.x * 0.35 + (position.x / 1920.0) * 0.2;
            float t = clamp((uP - d) / 0.45, 0.0, 1.0);
            float e = 1.0 - pow(1.0 - t, 3.0);
            vec3 p = mix(aFrom, position, e);
            p.xy += vec2(sin(aRand.y * 40.0 + uP * 6.0), cos(aRand.z * 40.0 + uP * 5.0)) * 18.0 * (1.0 - e);
            vA = (0.55 + 0.45 * t) * (1.0 - uFade) * smoothstep(0.0, 0.04, uP);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = mix(2.2 + aRand.w * 3.0, 3.2, e);
          }`,
        fragmentShader: `
          varying float vA;
          void main(){ float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.9, 0.93, 0.96, (1.0 - smoothstep(0.15, 0.5, r)) * vA); }`,
      });
      scene.add(new THREE.Points(g, mat));
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p;
      mat.uniforms.uFade.value = state.fade;
      renderer.render(scene, camera);
    }
    return { state, render, ready };
  }

  window.MalfoyFX = { shatter, dust, choiceFx, particleText, ease };
})();

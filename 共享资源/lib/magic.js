// 马尔福小姐 · 魔法特效库（Three.js）
// 五个效果：飞路粉翡翠火焰（floo）、冥想盆银色记忆漩涡（pensieve）、荧光闪烁（lumos）、银墨书写（ink）、斯莱特林法阵（sigil）
// 每个效果都走同一条管线：主画面 → 自发光层 → 两次高斯模糊（辉光）→ 合成。
// 所有画面都是 state 的纯函数，由 GSAP 时间轴 onUpdate 驱动（视频渲染）或由 rAF 驱动（桌面程序实时交互）。
(function () {
  const W = 1920, H = 1080;

  // ------------------------------------------------------------ GLSL 公共函数
  const NOISE = `
    float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
    float fbm(vec2 p){ float v=0.0, a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*vnoise(p); p=m*p; a*=0.5; } return v; }
    float wfbm(vec2 p){ vec2 q=vec2(fbm(p), fbm(p+vec2(5.2,1.3))); return fbm(p+1.8*q); }
    vec3 fireRamp(float t){ // 翡翠飞路火：暗绿烟 → 翡翠 → 青柠 → 暖白芯
      t = clamp(t, 0.0, 1.0);
      vec3 c = mix(vec3(0.01,0.04,0.03), vec3(0.04,0.36,0.17), smoothstep(0.0,0.35,t));
      c = mix(c, vec3(0.26,0.64,0.36), smoothstep(0.32,0.72,t));
      c = mix(c, vec3(0.98,0.95,0.78), smoothstep(0.8,1.0,t));
      return c; }
  `;
  const QUAD_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  function texFrom(img) {
    const t = new THREE.Texture(img); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ------------------------------------------------------------ 辉光管线
  function pipeline(canvas, opts) {
    const o = Object.assign({ bloom: 1.0, glowScale: 0.25 }, opts);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    const gw = Math.round(W * o.glowScale), gh = Math.round(H * o.glowScale);
    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    const rtMain = new THREE.WebGLRenderTarget(W, H, rtOpts);
    const rtGlow = new THREE.WebGLRenderTarget(gw, gh, rtOpts);
    const rtA = new THREE.WebGLRenderTarget(gw, gh, rtOpts);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const scene = new THREE.Scene(); scene.add(quad);
    // 像素坐标相机（粒子用）：x 0..W 向右，y 0..H 向下
    const pcam = new THREE.OrthographicCamera(0, W, 0, -H, -10, 10);
    const blurMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec4 s = vec4(0.0); float w[7]; w[0]=0.196; w[1]=0.175; w[2]=0.122; w[3]=0.067; w[4]=0.028; w[5]=0.009; w[6]=0.002;
          s += texture2D(uTex, vUv) * w[0];
          for(int i=1;i<7;i++){ s += texture2D(uTex, vUv + uDir*float(i)) * w[i]; s += texture2D(uTex, vUv - uDir*float(i)) * w[i]; }
          gl_FragColor = s; }`,
      depthTest: false, depthWrite: false,
    });
    const compMat = new THREE.ShaderMaterial({
      uniforms: { uMain: { value: rtMain.texture }, uGlow: { value: rtGlow.texture }, uBloom: { value: o.bloom } },
      vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D uMain, uGlow; uniform float uBloom; varying vec2 vUv;
        void main(){ vec4 m = texture2D(uMain, vUv); vec3 g = texture2D(uGlow, vUv).rgb * uBloom;
          vec3 c = m.rgb + g; float a = clamp(m.a + max(max(g.r, g.g), g.b), 0.0, 1.0);
          // 输出非预乘颜色，盖在下面的视频上
          gl_FragColor = vec4(a > 0.001 ? c / a : vec3(0.0), a); }`,
      depthTest: false, depthWrite: false, transparent: true,
    });
    function blurPass(src, dst, dx, dy) {
      blurMat.uniforms.uTex.value = src.texture; blurMat.uniforms.uDir.value.set(dx / gw, dy / gh);
      quad.material = blurMat; renderer.setRenderTarget(dst); renderer.clear(); renderer.render(scene, cam);
    }
    // draw(mode)：mode 0 画主画面到当前目标，mode 1 画自发光层
    function frame(draw) {
      renderer.setRenderTarget(rtMain); renderer.clear(); draw(0, quad, scene, cam, pcam, renderer);
      renderer.setRenderTarget(rtGlow); renderer.clear(); draw(1, quad, scene, cam, pcam, renderer);
      blurPass(rtGlow, rtA, 1.6, 0); blurPass(rtA, rtGlow, 0, 1.6);
      blurPass(rtGlow, rtA, 3.2, 0); blurPass(rtA, rtGlow, 0, 3.2);
      quad.material = compMat; renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, cam);
    }
    return { renderer, frame, quad, scene, cam, pcam, compMat, W, H };
  }

  // 火星 / 银尘粒子：每颗粒子的位置是 (state, 种子) 的函数
  function sparkPoints(count, seed, vs, fs, uniforms) {
    const R = rng(seed);
    const rnd = new Float32Array(count * 4), pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = R(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: NOISE + vs, fragmentShader: fs, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(pts);
    return { scene: sc, mat };
  }

  // ============================================================ 1. 飞路粉翡翠火焰
  // opts: { image, ox, oy（起燃点，0..1，y 向下）, seed }  state: { p 0..1, t 秒 }
  function floo(canvas, opts) {
    const o = Object.assign({ ox: 0.5, oy: 0.95, seed: 3, bloom: 0.42 }, opts);
    const P = pipeline(canvas, { bloom: o.bloom });
    const state = { p: 0, t: 0 };
    let mat = null, sparks = null;
    const ready = loadImage(o.image).then((img) => {
      mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: texFrom(img) }, uP: { value: 0 }, uT: { value: 0 }, uO: { value: new THREE.Vector2(o.ox, 1 - o.oy) }, uMode: { value: 0 }, uAsp: { value: W / H } },
        vertexShader: QUAD_VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
        fragmentShader: NOISE + `
          uniform sampler2D uTex; uniform float uP, uT, uMode, uAsp; uniform vec2 uO; varying vec2 vUv;
          float field(vec2 uv){ vec2 d = (uv - uO) * vec2(uAsp, 1.0); return length(d) * 0.62 + (wfbm(uv * 3.2 + 7.0) - 0.5) * 0.5; }
          void main(){
            float R = mix(-0.25, 1.55, uP);
            float f = field(vUv);
            float e = f - R;                              // >0 未烧到，<0 已烧穿
            // 法线（由噪声场求梯度）：焦边的纸面起伏
            vec2 px = vec2(1.5/1920.0, 1.5/1080.0);
            float fx = field(vUv + vec2(px.x, 0.0)) - f, fy = field(vUv + vec2(0.0, px.y)) - f;
            vec3 N = normalize(vec3(-fx * 260.0, -fy * 260.0, 1.0));
            // 热浪扭曲
            float heat = exp(-max(e, 0.0) * 14.0) * step(0.0, e);
            vec2 huv = vUv + (vec2(vnoise(vUv * 38.0 + vec2(0.0, uT * 6.0)), vnoise(vUv * 38.0 + 9.0 - vec2(0.0, uT * 6.0))) - 0.5) * 0.012 * heat;
            vec3 A = texture2D(uTex, huv).rgb;
            // 火墙：在每个像素下方取样——下方已经烧穿，这里就有火；火舌高度随噪声起伏，越高越淡
            float tongue = fbm(vec2(vUv.x * 8.0, vUv.y * 2.4 - uT * 2.2) + 3.0);
            float lick = fbm(vec2(vUv.x * 19.0 + 2.0, vUv.y * 6.0 - uT * 4.2));
            float hgt = 0.05 + 0.16 * tongue * tongue + 0.05 * lick;
            float eUp = field(vUv - vec2(0.0, hgt)) - R;               // 下方 hgt 处的燃烧状态
            float fireZone = smoothstep(0.02, -0.03, eUp) * smoothstep(-0.2, -0.05, e); // 前沿附近，烧穿太久的地方火灭
            float h01 = clamp((-e) / 0.2, 0.0, 1.0);
            float heightFade = 1.0 - smoothstep(0.0, 1.0, max(e, 0.0) / hgt);
            float body = fireZone * heightFade * (0.5 + 0.7 * lick);
            float ember = exp(-abs(e) * 120.0) * (0.6 + 0.6 * vnoise(vUv * 90.0 + uT * 3.0));
            float live = smoothstep(-0.02, 0.06, uP) * (1.0 - smoothstep(0.86, 1.0, uP));
            body *= live; ember *= live;
            float temp = clamp(body * (1.1 - 0.5 * heightFade * 0.0) , 0.0, 1.0);
            vec3 fire = fireRamp(temp * 0.85 + ember * 0.35) * (body * 0.95 + ember * 0.7);
            // 焦化：未烧区靠近前沿逐渐变暗、去色，余烬裂纹发光
            float charW = smoothstep(0.1, 0.0, e) * step(0.0, e);
            float luma = dot(A, vec3(0.3, 0.59, 0.11));
            vec3 charred = mix(A, vec3(luma) * vec3(0.3, 0.28, 0.24), charW * 0.9) * (1.0 - charW * 0.82);
            float crack = pow(vnoise(vUv * 170.0), 8.0) * charW * smoothstep(0.05, 0.0, e) * 2.2 * live;
            // 火光照明：翡翠光照亮周围画面，焦面上有高光
            vec3 L = normalize(vec3(uO - vUv, 0.35));
            float diff = max(dot(N, L), 0.0);
            float spec = pow(max(dot(reflect(-L, N), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
            vec3 spill = vec3(0.1, 0.6, 0.32) * exp(-max(e, 0.0) * 9.0) * live;
            vec3 lit = charred * (1.0 + spill * (0.35 + 0.6 * diff)) + spill * spec * charW * 0.5;
            // 烟：前沿上方飘起的墨绿烟
            float smoke = fbm(vec2(vUv.x * 4.0, vUv.y * 3.0 - uT * 0.7) + 11.0);
            float smokeA = smoothstep(0.45, 0.85, smoke) * exp(-abs(e + 0.1) * 8.0) * step(e, 0.02) * 0.5 * (1.0 - smoothstep(0.7, 1.0, uP));
            vec3 smokeC = vec3(0.03, 0.05, 0.045);
            float aImg = step(0.0, e);
            vec3 col = lit * aImg + fire + vec3(crack) * vec3(0.4, 1.0, 0.6);
            float a = clamp(aImg + max(max(fire.r, fire.g), fire.b), 0.0, 1.0);
            col = mix(col, smokeC, smokeA * (1.0 - aImg * 0.5)); a = max(a, smokeA);
            if (uMode > 0.5) { // 自发光层：只有火、余烬
              gl_FragColor = vec4(fire * 0.8 + vec3(crack) * vec3(0.3, 1.0, 0.5) * 0.6, 1.0);
            } else {
              gl_FragColor = vec4(col, a);
            }
          }`,
      });
      // 火星：沿燃烧前沿出生，向上飘，翡翠和白金两种
      sparks = sparkPoints(900, o.seed, `
        attribute vec4 aRand; uniform float uP, uT, uGlowS; uniform vec2 uO; varying float vA; varying vec3 vC;
        void main(){
          float birth = aRand.x * 0.85 + 0.05;
          float age = (uP - birth) * 3.2;
          float life = 0.35 + aRand.y * 0.5;
          float k = clamp(age / life, 0.0, 1.0);
          float ang = aRand.z * 6.2831;
          float R = mix(-0.25, 1.55, birth) / 0.62;
          vec2 o = vec2(uO.x * 1920.0, (1.0 - uO.y) * 1080.0);
          vec2 p = o + vec2(cos(ang) * 1080.0 * R * 1.05, -abs(sin(ang)) * 1080.0 * R * 0.95);
          p.y -= k * (160.0 + aRand.w * 340.0);
          p.x += sin(k * 6.0 + aRand.y * 20.0) * 40.0 * k;
          vA = (age > 0.0 && age < life) ? (1.0 - k) * (0.6 + 0.4 * sin(uT * 30.0 + aRand.w * 50.0)) : 0.0;
          vC = aRand.w > 0.75 ? vec3(1.0, 0.82, 0.5) : vec3(0.4, 0.95, 0.6);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, -p.y, 0.0, 1.0);
          gl_PointSize = (1.4 + aRand.y * 2.6) * uGlowS;
        }`, `varying float vA; varying vec3 vC;
        void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.0, 0.5, r)); gl_FragColor = vec4(vC * a * vA * 1.6, a * vA); }`,
        { uP: { value: 0 }, uT: { value: 0 }, uO: mat.uniforms.uO, uGlowS: { value: 1 } });
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p; mat.uniforms.uT.value = state.t;
      sparks.mat.uniforms.uP.value = state.p; sparks.mat.uniforms.uT.value = state.t;
      P.frame((mode, quad, scene, cam, pcam, r) => {
        mat.uniforms.uMode.value = mode; quad.material = mat; r.render(scene, cam);
        sparks.mat.uniforms.uGlowS.value = mode ? 0.25 : 1.0; r.render(sparks.scene, pcam);
      });
    }
    return { state, render, ready };
  }

  // ============================================================ 2. 冥想盆银色记忆漩涡
  // opts: { image, cx, cy（漩涡中心 0..1，y 向下） }  state: { p, t }
  // 0→0.5：画面被卷进银色液体；0.5→1：液面从中心荡开，露出下一幕
  function pensieve(canvas, opts) {
    const o = Object.assign({ cx: 0.5, cy: 0.5, bloom: 0.6 }, opts);
    const P = pipeline(canvas, { bloom: o.bloom });
    const state = { p: 0, t: 0 };
    let mat = null, motes = null;
    const ready = loadImage(o.image).then((img) => {
      mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: texFrom(img) }, uP: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Vector2(o.cx, 1 - o.cy) }, uMode: { value: 0 }, uAsp: { value: W / H } },
        vertexShader: QUAD_VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
        fragmentShader: NOISE + `
          uniform sampler2D uTex; uniform float uP, uT, uMode, uAsp; uniform vec2 uC; varying vec2 vUv;
          float height(vec2 q, float r, float a){ return fbm(vec2(a * 1.6 + r * 3.0 - uT * 0.35, r * 7.0 - uT * 0.9)) * 0.7 + fbm(q * 9.0 + uT * 0.2) * 0.3; }
          void main(){
            vec2 d = (vUv - uC) * vec2(uAsp, 1.0);
            float r = length(d), a = atan(d.y, d.x);
            float pin = smoothstep(0.0, 0.5, uP), pout = smoothstep(0.5, 1.0, uP);
            // 漩涡：越靠中心转得越多，同时向中心吸
            float tw = pin * (5.5 * exp(-r * 1.6)) + pout * 1.5 * exp(-r * 2.0);
            float rr = r * (1.0 + 0.6 * pin * (1.0 - smoothstep(0.0, 1.2, r)));
            float aa = a + tw;
            vec2 suv = uC + vec2(cos(aa), sin(aa)) * rr / vec2(uAsp, 1.0);
            vec3 A = texture2D(uTex, suv).rgb;
            // 液面法线 + 菲涅尔 + 移动的高光
            float h = height(vec2(aa, rr), rr, aa);
            float e = 0.004;
            float hx = height(vec2(aa, rr + e), rr + e, aa) - h, hy = height(vec2(aa + e * 3.0, rr), rr, aa + e * 3.0) - h;
            vec3 N = normalize(vec3(-hx * 55.0, -hy * 18.0, 1.0));
            vec3 V = vec3(0.0, 0.0, 1.0);
            vec3 L1 = normalize(vec3(cos(uT * 0.7) * 0.6, 0.55, 0.6)), L2 = normalize(vec3(-0.7, -0.3, 0.6));
            float spec = pow(max(dot(reflect(-L1, N), V), 0.0), 90.0) * 1.1 + pow(max(dot(reflect(-L2, N), V), 0.0), 40.0) * 0.3;
            float fres = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 2.5);
            vec3 silver = mix(vec3(0.12, 0.15, 0.18), vec3(0.55, 0.61, 0.67), h * h) + fres * vec3(0.3, 0.38, 0.46);
            // 记忆丝线：对数螺旋上的细亮线
            float strand = pow(0.5 + 0.5 * sin(aa * 6.0 + log(rr + 0.03) * 9.0 - uT * 2.5), 60.0) * smoothstep(0.02, 0.15, rr) * (0.5 + 0.5 * vnoise(vec2(aa * 4.0, rr * 20.0 - uT)));
            // 覆盖：先铺满液体，后半段从中心向外清开
            float cover = smoothstep(0.1, 0.45, uP);
            float clearR = pout * 1.35;
            float cleared = 1.0 - smoothstep(clearR - 0.12, clearR, r);
            float ring = exp(-abs(r - clearR) * 34.0) * step(0.001, pout) * (1.0 - pout * 0.6);
            float liquid = cover * (1.0 - cleared);
            vec3 col = mix(A * (1.0 - 0.3 * pin), silver, liquid * 0.78);
            vec3 glow = (vec3(spec) * vec3(0.85, 0.92, 1.0) + strand * vec3(0.5, 0.7, 0.95) * 0.45) * liquid + ring * vec3(0.7, 0.85, 1.0) * 0.7;
            col += glow;
            float alpha = clamp(1.0 - cleared + ring, 0.0, 1.0);
            vec3 pm = col * (1.0 - cleared) + glow * cleared;
            if (uMode > 0.5) gl_FragColor = vec4(glow * 1.2, 1.0);
            else gl_FragColor = vec4(pm, alpha);
          }`,
      });
      // 漂浮的银色记忆微光
      motes = sparkPoints(500, 41, `
        attribute vec4 aRand; uniform float uP, uT, uGlowS; uniform vec2 uC; varying float vA;
        void main(){
          vec2 c = vec2(uC.x * 1920.0, (1.0 - uC.y) * 1080.0);
          float r0 = 80.0 + aRand.x * 900.0;
          float ang = aRand.y * 6.2831 + uT * (0.4 + 1.2 / (1.0 + r0 * 0.01)) + uP * 5.0 * exp(-r0 * 0.002);
          float r = r0 * (1.0 - 0.5 * smoothstep(0.0, 0.5, uP)) + smoothstep(0.5, 1.0, uP) * 600.0 * aRand.z;
          vec2 p = c + vec2(cos(ang), sin(ang) * 0.62) * r;
          vA = sin(3.1416 * clamp(uP * 1.15, 0.0, 1.0)) * (0.4 + 0.6 * sin(uT * 3.0 + aRand.w * 30.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, -p.y, 0.0, 1.0);
          gl_PointSize = (1.5 + aRand.z * 3.0) * uGlowS;
        }`, `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.0, 0.5, r); gl_FragColor = vec4(vec3(0.8, 0.9, 1.0) * a * vA, a * vA); }`,
        { uP: { value: 0 }, uT: { value: 0 }, uC: mat.uniforms.uC, uGlowS: { value: 1 } });
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p; mat.uniforms.uT.value = state.t;
      motes.mat.uniforms.uP.value = state.p; motes.mat.uniforms.uT.value = state.t;
      P.frame((mode, quad, scene, cam, pcam, r) => {
        mat.uniforms.uMode.value = mode; quad.material = mat; r.render(scene, cam);
        motes.mat.uniforms.uGlowS.value = mode ? 0.25 : 1.0; r.render(motes.scene, pcam);
      });
    }
    return { state, render, ready };
  }

  // ============================================================ 3. 荧光闪烁（魔杖尖爆光）
  // opts: { image, x, y（杖尖，0..1，y 向下） }  state: { p, t }
  function lumos(canvas, opts) {
    const o = Object.assign({ x: 0.6, y: 0.42, bloom: 1.0 }, opts);
    const P = pipeline(canvas, { bloom: o.bloom });
    const state = { p: 0, t: 0 };
    let mat = null;
    const ready = loadImage(o.image).then((img) => {
      mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: texFrom(img) }, uP: { value: 0 }, uT: { value: 0 }, uPos: { value: new THREE.Vector2(o.x, 1 - o.y) }, uMode: { value: 0 }, uAsp: { value: W / H } },
        vertexShader: QUAD_VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
        fragmentShader: NOISE + `
          uniform sampler2D uTex; uniform float uP, uT, uMode, uAsp; uniform vec2 uPos; varying vec2 vUv;
          void main(){
            float I = smoothstep(0.0, 0.26, uP) * (1.0 - smoothstep(0.36, 0.95, uP));
            I = pow(I, 1.6) * 0.8;
            vec2 d = (vUv - uPos) * vec2(uAsp, 1.0);
            float r = length(d), ang = atan(d.y, d.x);
            vec3 A = texture2D(uTex, vUv).rgb;
            // 过曝：画面被光吃掉，越靠近杖尖越亮
            float expo = I * (0.5 + 2.2 * exp(-r * 2.6));
            vec3 lit = 1.0 - exp(-A * (1.0 + expo * 3.0)) ;
            lit = mix(A, lit, smoothstep(0.0, 0.2, I));
            vec3 tint = vec3(0.82, 0.9, 1.0);
            // 光芯、体积光束、横向光斑、镜头鬼影
            float core = exp(-r * (26.0 - 18.0 * I)) * (0.4 + 2.6 * I);
            float rays = pow(fbm(vec2(ang * 9.0, uT * 0.3)), 3.0) * exp(-r * (3.2 - 1.6 * I)) * I * 2.2;
            float streak = exp(-abs(d.y) * (90.0 - 50.0 * I)) * exp(-abs(d.x) * (1.4 - 0.6 * I)) * I * 1.3;
            vec2 gpos = vec2(0.5) - (uPos - vec2(0.5)) * 0.7;
            float ghost = exp(-length((vUv - gpos) * vec2(uAsp, 1.0)) * 18.0) * I * 0.35;
            float ring = exp(-abs(length((vUv - gpos * 0.9 - 0.05) * vec2(uAsp, 1.0)) - 0.12) * 120.0) * I * 0.25;
            vec3 glow = tint * (core + rays) + vec3(0.6, 0.78, 1.0) * streak + vec3(0.5, 0.95, 0.7) * ghost + vec3(0.8, 0.9, 1.0) * ring;
            float aImg = 1.0 - smoothstep(0.3, 0.55, uP);
            vec3 col = lit * aImg + glow + tint * I * I * 0.35;
            float a = clamp(aImg + max(max(glow.r, glow.g), glow.b) + I * I * 0.35, 0.0, 1.0);
            if (uMode > 0.5) gl_FragColor = vec4(glow * 1.2 + tint * I * I * 0.6 * exp(-r * 1.5), 1.0);
            else gl_FragColor = vec4(col, a);
          }`,
      });
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p; mat.uniforms.uT.value = state.t;
      P.frame((mode, quad, scene, cam, pcam, r) => { mat.uniforms.uMode.value = mode; quad.material = mat; r.render(scene, cam); });
    }
    return { state, render, ready };
  }

  // ============================================================ 4. 银墨书写（活点地图式）
  // opts: { lines: [{ text, font, x, y, spacing }] }  state: { p 0..1 书写进度, fade 0..1 }
  function ink(canvas, opts) {
    const o = Object.assign({ lines: [], bloom: 1.0, seed: 17 }, opts);
    const P = pipeline(canvas, { bloom: o.bloom });
    const state = { p: 0, t: 0, fade: 0 };
    let mat = null;
    const fonts = o.lines.map((l) => document.fonts.load(l.font, l.text).catch(() => {}));
    const ready = Promise.all(fonts).then(() => document.fonts.ready).then(() => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.textBaseline = "middle";
      let x0 = W, x1 = 0;
      o.lines.forEach((l) => {
        ctx.font = l.font; if (l.spacing) ctx.letterSpacing = l.spacing;
        ctx.fillText(l.text, l.x, l.y);
        x0 = Math.min(x0, l.x); x1 = Math.max(x1, l.x + ctx.measureText(l.text).width);
      });
      const tex = texFrom(c); tex.flipY = true;
      mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: tex }, uP: { value: 0 }, uT: { value: 0 }, uFade: { value: 0 }, uMode: { value: 0 }, uX: { value: new THREE.Vector2(x0 / W, x1 / W) } },
        vertexShader: QUAD_VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
        fragmentShader: NOISE + `
          uniform sampler2D uTex; uniform float uP, uT, uFade, uMode; uniform vec2 uX; varying vec2 vUv;
          void main(){
            float s = texture2D(uTex, vUv).a;
            // 墨的洇开：略微外扩的边缘 + 纸纹噪声
            float b = 0.0; vec2 px = vec2(1.0/1920.0, 1.0/1080.0);
            b += texture2D(uTex, vUv + px * vec2(2.0, 0.0)).a; b += texture2D(uTex, vUv - px * vec2(2.0, 0.0)).a;
            b += texture2D(uTex, vUv + px * vec2(0.0, 2.0)).a; b += texture2D(uTex, vUv - px * vec2(0.0, 2.0)).a;
            b *= 0.25;
            float k = (vUv.x - uX.x) / max(uX.y - uX.x, 0.001);
            float edge = uP * 1.18 - 0.08;
            float wob = (fbm(vUv * vec2(40.0, 26.0)) - 0.5) * 0.06;
            float rev = smoothstep(edge + 0.015, edge - 0.015, k + wob);
            float bleed = smoothstep(0.0, 0.6, b) * smoothstep(edge + 0.05, edge - 0.08, k + wob);
            float inkA = max(s * rev, bleed * 0.35 * (1.0 - rev));
            // 笔尖：前沿上的高光
            float tip = exp(-abs(k + wob - edge) * 45.0) * smoothstep(0.0, 0.5, b) * step(0.01, uP) * (1.0 - smoothstep(0.95, 1.05, uP));
            vec3 silverInk = mix(vec3(0.72, 0.78, 0.82), vec3(0.95, 0.97, 1.0), fbm(vUv * 300.0)) ;
            vec3 col = silverInk + tip * vec3(0.75, 0.95, 0.85) * 1.2;
            float a = clamp(inkA + tip, 0.0, 1.0) * (1.0 - uFade);
            if (uMode > 0.5) gl_FragColor = vec4((tip * vec3(0.5, 1.0, 0.7) * 1.6 + vec3(0.25) * s * rev * 0.35) * (1.0 - uFade), 1.0);
            else gl_FragColor = vec4(col * a, a);
          }`,
      });
      render();
    });
    function render() {
      if (!mat) return;
      mat.uniforms.uP.value = state.p; mat.uniforms.uT.value = state.t; mat.uniforms.uFade.value = state.fade;
      P.frame((mode, quad, scene, cam, pcam, r) => { mat.uniforms.uMode.value = mode; quad.material = mat; r.render(scene, cam); });
    }
    return { state, render, ready };
  }

  // ============================================================ 5. 斯莱特林法阵（选项界面）
  // 衔尾蛇法阵：双环、刻度、符文、蛇身；金属扫光；悬停增亮；点击时被选项上燃起翡翠火
  // opts: { cx, cy, size（像素）}  state: { t, appear, hover, click, hx, hy, hw, hh（被选项矩形，像素）}
  function drawSigil(size, seed) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"); const R = rng(seed); const m = size / 2;
    g.translate(m, m); g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round";
    const ring = (r, w, a = 1) => { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
    ring(m * 0.96, size * 0.004, 0.9); ring(m * 0.9, size * 0.0025, 0.7); ring(m * 0.62, size * 0.003, 0.8); ring(m * 0.57, size * 0.0018, 0.6);
    // 饰点：36 个小菱形
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; g.save(); g.rotate(a); g.translate(0, -m * 0.93);
      g.globalAlpha = i % 3 === 0 ? 0.95 : 0.55; const k = size * (i % 3 === 0 ? 0.009 : 0.005);
      g.beginPath(); g.moveTo(0, -k); g.lineTo(k * 0.6, 0); g.lineTo(0, k); g.lineTo(-k * 0.6, 0); g.closePath(); g.fill(); g.restore(); }
    // 符文：古弗萨克字母，沿两环之间排一圈
    const runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
    g.font = `${Math.round(size * 0.05)}px "Apple Symbols", "Segoe UI Historic", "Noto Sans Runic", serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.save(); g.rotate(a); g.translate(0, -m * 0.76); g.globalAlpha = 0.85;
      g.fillText(runes[i % runes.length], 0, 0); g.restore(); }
    // 衔尾蛇：一条首尾相接的蛇，身体粗细从头到尾渐细，带鳞纹
    const sr = m * 0.48;
    for (let i = 0; i < 360; i++) {
      const t = i / 360, a = -Math.PI / 2 + t * Math.PI * 2 * 0.97;
      const w = size * (0.008 + 0.032 * Math.pow(1 - t, 0.75));
      g.globalAlpha = 0.95; g.beginPath(); g.arc(Math.cos(a) * sr, Math.sin(a) * sr, w, 0, Math.PI * 2); g.fill();
    }
    // 鳞纹（挖空）
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 90; i++) { const t = i / 90, a = -Math.PI / 2 + t * Math.PI * 2 * 0.97, w = size * (0.004 + 0.012 * (1 - t));
      g.beginPath(); g.arc(Math.cos(a) * sr, Math.sin(a) * sr, w * 0.55, 0, Math.PI * 2); g.globalAlpha = 0.55; g.fill(); }
    // 蛇眼
    g.globalAlpha = 1; const ea = -Math.PI / 2 + 0.01; g.beginPath(); g.arc(Math.cos(ea) * sr + size * 0.012, Math.sin(ea) * sr - size * 0.008, size * 0.006, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = "source-over";
    // 中心：S 形蛇纹章的抽象几何
    g.globalAlpha = 0.7; g.lineWidth = size * 0.004; g.beginPath();
    for (let i = 0; i <= 60; i++) { const t = i / 60; const y = (t - 0.5) * m * 0.62; const x = Math.sin(t * Math.PI * 2) * m * 0.12; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    return c;
  }

  function sigil(canvas, opts) {
    const o = Object.assign({ cx: 470, cy: 760, size: 760, bloom: 0.7, seed: 5, strength: 0.85, fire: 1.0 }, opts);
    const P = pipeline(canvas, { bloom: o.bloom });
    const tex = texFrom(drawSigil(1024, o.seed));
    const state = { t: 0, appear: 0, hover: 0, click: 0, hx: o.cx, hy: o.cy, hw: 640, hh: 92 };
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uT: { value: 0 }, uAppear: { value: 0 }, uHover: { value: 0 }, uClick: { value: 0 }, uMode: { value: 0 },
        uC: { value: new THREE.Vector2(o.cx, o.cy) }, uS: { value: o.size }, uRect: { value: new THREE.Vector4(0, 0, 0, 0) }, uStrength: { value: o.strength }, uFire: { value: o.fire } },
      vertexShader: QUAD_VS, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
      fragmentShader: NOISE + `
        uniform sampler2D uTex; uniform float uT, uAppear, uHover, uClick, uMode, uS, uStrength, uFire; uniform vec2 uC; uniform vec4 uRect; varying vec2 vUv;
        vec4 sig(vec2 px, float rot, float scl){
          vec2 q = (px - uC) / (uS * scl);
          float c = cos(rot), s = sin(rot); q = mat2(c, -s, s, c) * q;
          vec2 uv = q + 0.5; if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
          return texture2D(uTex, vec2(uv.x, 1.0 - uv.y));
        }
        void main(){
          vec2 px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
          vec2 d = px - uC; float ang = atan(d.y, d.x), r = length(d) / uS;
          // 出现：从中心向外"刻"出来
          float reveal = smoothstep(uAppear * 0.62 - 0.03, uAppear * 0.62, r) ;
          float rot1 = uT * 0.06, rot2 = -uT * 0.11 + 0.4;
          float m = sig(px, rot1, 1.0).a * (1.0 - reveal);
          float m2 = sig(px, rot2, 0.72).a * (1.0 - reveal) * 0.6;
          float mask = max(m, m2);
          // 刻痕法线：对法阵图形求梯度，当作浮雕银器打光
          float ex = sig(px + vec2(2.0, 0.0), rot1, 1.0).a - sig(px - vec2(2.0, 0.0), rot1, 1.0).a;
          float ey = sig(px + vec2(0.0, 2.0), rot1, 1.0).a - sig(px - vec2(0.0, 2.0), rot1, 1.0).a;
          vec3 N = normalize(vec3(-ex * 1.6, -ey * 1.6, 1.0));
          vec3 Ld = normalize(vec3(cos(uT * 0.8), sin(uT * 0.8), 0.9));
          float diff = 0.45 + 0.55 * max(dot(N, Ld), 0.0);
          float spec = pow(max(dot(reflect(-Ld, N), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
          float sweep = pow(0.5 + 0.5 * cos(ang - uT * 1.2), 24.0);
          vec3 silver = vec3(0.5, 0.55, 0.57) * diff + vec3(0.95, 0.97, 1.0) * (spec * 0.9 + sweep * 0.5);
          vec3 emerald = vec3(0.16, 0.7, 0.42);
          float energy = 0.55 + 0.45 * uHover + uClick * (1.0 - uClick) * 1.6;
          vec3 col = (silver + emerald * (0.04 + 0.14 * uHover)) * mask * energy * uStrength;
          // 被选项：边框上一道流动的银绿光
          vec2 rc = uRect.xy, rs = uRect.zw * 0.5;
          vec2 rd = abs(px - rc) - rs; float box = length(max(rd, 0.0)) + min(max(rd.x, rd.y), 0.0);
          float border = exp(-abs(box) * 0.6) * uHover;
          float flow = pow(0.5 + 0.5 * sin((px.x - rc.x) * 0.018 - uT * 5.0), 10.0);
          vec3 bcol = mix(vec3(0.8, 0.86, 0.88), emerald, 0.35) * border * (0.18 + 0.7 * flow);
          // 点击后：被选项上方燃起的翡翠火舌
          float above = (rc.y - rs.y) - px.y;                       // 选项上沿往上的距离（像素）
          float inX = smoothstep(rs.x + 10.0, rs.x - 80.0, abs(px.x - rc.x));
          float tongue = fbm(vec2((px.x - rc.x) * 0.022, px.y * 0.02 + uT * 3.2));
          float hgt = 30.0 + 150.0 * tongue * tongue;
          float fire = inX * smoothstep(hgt, 0.0, above) * smoothstep(-14.0, 4.0, above) * sin(3.1416 * clamp(uClick * 1.1, 0.0, 1.0));
          fire *= smoothstep(0.3, 0.75, tongue + 0.2 * fbm(vec2(px.x * 0.05, px.y * 0.04 + uT * 5.0)));
          vec3 fcol = fireRamp(fire * 0.9) * fire * 1.2 * uFire;
          vec3 outc = col + bcol + fcol;
          float a = clamp(max(max(outc.r, outc.g), outc.b), 0.0, 1.0) * uAppear;
          if (uMode > 0.5) gl_FragColor = vec4((col * spec * 0.5 + bcol * 0.8 + fcol) * uAppear, 1.0);
          else gl_FragColor = vec4(outc * uAppear, a);
        }`,
    });
    // 被选项上飘起的翡翠火星
    const sp = sparkPoints(260, 77, `
      attribute vec4 aRand; uniform float uClick, uT, uGlowS; uniform vec4 uRect; varying float vA;
      void main(){
        float birth = aRand.x * 0.6; float age = (uClick - birth) * 2.2; float k = clamp(age, 0.0, 1.0);
        vec2 p = vec2(uRect.x + (aRand.y - 0.5) * uRect.z, uRect.y - uRect.w * 0.3);
        p.y -= k * (90.0 + aRand.z * 260.0); p.x += sin(k * 5.0 + aRand.w * 30.0) * 26.0;
        vA = (age > 0.0 && age < 1.0) ? (1.0 - k) : 0.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, -p.y, 0.0, 1.0);
        gl_PointSize = (2.0 + aRand.w * 3.0) * uGlowS;
      }`, `varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.0, 0.5, r); gl_FragColor = vec4(vec3(0.5, 1.0, 0.7) * a * vA * 1.5, a * vA); }`,
      { uClick: mat.uniforms.uClick, uT: mat.uniforms.uT, uRect: mat.uniforms.uRect, uGlowS: { value: 1 } });
    function render() {
      mat.uniforms.uT.value = state.t; mat.uniforms.uAppear.value = state.appear; mat.uniforms.uHover.value = state.hover; mat.uniforms.uClick.value = state.click;
      if (state.cx != null) mat.uniforms.uC.value.set(state.cx, state.cy);
      if (state.size != null) mat.uniforms.uS.value = state.size;
      mat.uniforms.uRect.value.set(state.hx, state.hy, state.hw, state.hh);
      P.frame((mode, quad, scene, cam, pcam, r) => {
        mat.uniforms.uMode.value = mode; quad.material = mat; r.render(scene, cam);
        sp.mat.uniforms.uGlowS.value = mode ? 0.25 : 1.0; r.render(sp.scene, pcam);
      });
    }
    render();
    return { state, render, ready: Promise.resolve() };
  }

  window.MalfoyMagic = { floo, pensieve, lumos, ink, sigil };
})();

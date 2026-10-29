// 马尔福桌面 · DeepSeek Harness 插件：浏览器半边
// 整个 dsh 窗口就是斯莱特林休息室：
//   - 休息室画面（桌面程序/app/ 的 dsh 模式，iframe）铺在所有界面后面，界面换成半透明的墨绿和银
//   - 每次打开：黑幕 → 标题 → 壁炉里燃起绿火 → 空房间亮起，她走进来，侧栏和输入框依次浮现
//   - 新会话的空白页：画面清晰，输入框沉到底部，她说一句话
//   - 开始对话：镜头焦点从她身上移开（虚化、压暗）；agent 做完或等你批准时，焦点短暂回到她身上
//   - 侧栏「休息室」：走进房间，打开剧情、相册、衣橱
window.__ModuleLoader__.load({
  id: "dsh-malfoy-desktop",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;

    const APP = "/malfoy/app/";
    const THEME_ID = "malfoy-slytherin";
    const root = document.documentElement;

    // ---------- 配色：墨绿玻璃 + 银，所有底色半透明，让休息室透出来 ----------
    const TOKENS = {
      "--dsw-alias-bg-base": "rgba(5, 10, 8, 0.16)",
      "--dsw-alias-bg-layer-1": "rgba(8, 16, 12, 0.55)",
      "--dsw-alias-bg-layer-2": "rgba(10, 20, 15, 0.74)",
      "--dsw-alias-bg-layer-3": "rgba(13, 25, 19, 0.84)",
      "--dsw-alias-bg-overlay": "rgba(9, 18, 14, 0.95)",
      "--dsw-alias-bg-module-platform": "rgba(7, 14, 11, 0.86)",
      "--dsw-alias-bg-multi-select": "rgba(12, 24, 18, 0.9)",
      "--dsw-alias-bg-skeleton": "rgba(160, 190, 175, 0.06)",
      "--dsw-alias-bg-mask-1": "rgba(2, 5, 4, 0.72)",
      "--dsw-alias-bg-mask-2": "rgba(2, 5, 4, 0.42)",
      "--dsw-alias-bg-mask-drop": "rgba(2, 5, 4, 0.72)",
      "--dsw-alias-label-primary": "#e9eeec",
      "--dsw-alias-label-secondary": "#a9b7b1",
      "--dsw-alias-label-tertiary": "#76847e",
      "--dsw-alias-label-caption": "#93a39c",
      "--dsw-alias-label-dimmed": "#59665f",
      "--dsw-alias-label-primary-foreground": "#06140d",
      "--dsw-alias-label-primary-inverted": "#06140d",
      "--dsw-alias-brand-primary": "#6fd39a",
      "--dsw-alias-brand-text": "#8fdcaf",
      "--dsw-alias-brand-primary-invert": "#04140b",
      "--dsw-alias-button-primary-fill": "#d3dbd9",
      "--dsw-alias-button-primary-hover": "#eef2f1",
      "--dsw-alias-button-primary-dimmed": "rgba(201, 211, 214, 0.14)",
      "--dsw-alias-button-contrast-fill": "#eef2f1",
      "--dsw-alias-button-elevated-fill": "rgba(13, 25, 19, 0.8)",
      "--dsw-alias-button-floating-fill": "rgba(11, 22, 17, 0.85)",
      "--dsw-alias-button-floating-hover": "rgba(18, 34, 26, 0.9)",
      "--dsw-alias-button-ghost-active-fill": "rgba(201, 211, 214, 0.1)",
      "--dsw-alias-button-ghost-active-hover": "rgba(201, 211, 214, 0.15)",
      "--dsw-alias-button-info-fill": "#3e8e63",
      "--dsw-alias-button-info-hover": "#4fa576",
      "--dsw-alias-button-tool-bar-fill": "rgba(201, 211, 214, 0.08)",
      "--dsw-alias-button-tool-bar-hover": "rgba(201, 211, 214, 0.14)",
      "--dsw-alias-button-ghost-active-border": "#6fd39a",
      "--dsw-alias-interactive-bg-hover": "rgba(201, 211, 214, 0.07)",
      "--dsw-alias-interactive-bg-active": "rgba(201, 211, 214, 0.12)",
      "--dsw-alias-interactive-bg-hover-accent": "rgba(111, 211, 154, 0.12)",
      "--dsw-alias-interactive-bg-hover-danger": "rgba(229, 115, 115, 0.14)",
      "--dsw-alias-border-l1": "rgba(201, 211, 214, 0.1)",
      "--dsw-alias-border-l2": "rgba(201, 211, 214, 0.16)",
      "--dsw-alias-border-l2-darkmode-thin": "rgba(201, 211, 214, 0.08)",
      "--dsw-alias-border-l3": "rgba(201, 211, 214, 0.22)",
      "--dsw-alias-border-l4": "rgba(201, 211, 214, 0.34)",
      "--dsw-alias-state-success-primary": "#6fd39a",
      "--dsw-alias-state-success-secondary": "rgba(111, 211, 154, 0.16)",
      "--dsw-alias-state-success-tertiary": "rgba(111, 211, 154, 0.08)",
      "--dsw-alias-state-error-primary": "#e57373",
      "--dsw-alias-state-error-secondary": "rgba(229, 115, 115, 0.16)",
      "--dsw-alias-state-warn-primary": "#d9b45a",
      "--dsw-alias-state-warn-secondary": "rgba(217, 180, 90, 0.16)",
      "--dsw-alias-state-business-primary": "#5fbf8f",
      "--dsw-alias-state-business-tertiary": "rgba(95, 191, 143, 0.1)",
      "--dsw-alias-toast-bg": "rgba(7, 14, 11, 0.94)",
      "--dsw-alias-tooltip-bg": "rgba(7, 14, 11, 0.96)",
      "--dsw-alias-markdown-inline-code": "rgba(111, 211, 154, 0.1)",
      "--dsw-alias-markdown-code-block": "rgba(3, 8, 6, 0.72)",
      "--dsw-alias-markdown-code-block-banner": "rgba(201, 211, 214, 0.05)",
      "--dsw-alias-scrollbar-bg-l1": "rgba(201, 211, 214, 0.14)",
      "--dsw-alias-scrollbar-bg-l2": "rgba(201, 211, 214, 0.2)",
      "--dsw-alias-scrollbar-hover-l1": "rgba(201, 211, 214, 0.28)",
      "--dsw-alias-scrollbar-hover-l2": "rgba(201, 211, 214, 0.36)",
      "--dsw-specific-sidebar-fill": "rgba(5, 11, 8, 0.58)",
      "--dsw-specific-sidebar-nav-item-active": "rgba(201, 211, 214, 0.1)",
      "--dsw-specific-sidebar-nav-item-active-accent": "#6fd39a",
      "--dsw-specific-sidebar-nav-item-hover": "rgba(201, 211, 214, 0.06)",
      "--dsw-specific-bubble": "rgba(10, 20, 15, 0.72)",
      "--dsw-specific-bubble-highlight": "rgba(111, 211, 154, 0.08)",
      "--dsw-specific-input-major": "rgba(6, 12, 9, 0.7)",
      "--dsw-specific-menu": "rgba(7, 14, 11, 0.96)",
      "--dsw-specific-selector": "rgba(9, 18, 13, 0.92)",
      "--dsw-specific-tip": "rgba(111, 211, 154, 0.1)",
      // 直角：不要圆角
      "--dsw-radius-xs": "2px",
      "--dsw-radius-sm": "2px",
      "--dsw-radius-md": "2px",
      "--dsw-radius-lg": "2px",
      "--dsw-radius-xl": "2px",
      "--dsw-radius-panel": "2px",
    };

    // 休息室画面里的几个位置（16:9 画面的比例坐标）
    const SPOT = {
      line: [0.31, 0.24], // 她说话时字幕的位置：头的右上方
      fire: [0.945, 0.56], // 壁炉
      hit: { x: 0.04, y: 0.28, w: 0.44, h: 0.48 }, // 点她（和 app/data.js 的 sofa.hit 一致）
    };

    const CSS = `
@font-face { font-family: "MF Cormorant"; src: url("${APP}fonts/cormorant-500-normal.woff2") format("woff2"); font-weight: 500; }
@font-face { font-family: "MF Cormorant"; src: url("${APP}fonts/cormorant-500-italic.woff2") format("woff2"); font-weight: 500; font-style: italic; }
@font-face { font-family: "MF Cormorant"; src: url("${APP}fonts/cormorant-600-normal.woff2") format("woff2"); font-weight: 600; }
html { background: #040605 !important; color-scheme: dark !important; }
body {
  background: transparent !important;
${Object.entries(TOKENS).map(([k, v]) => `  ${k}: ${v} !important;`).join("\n")}
}

/* ---- 休息室：铺在所有界面后面 ---- */
.mf-stage { position: fixed; inset: 0; z-index: -1; overflow: hidden; background: #040605; pointer-events: none; }
.mf-room { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; background: #040605;
  transition: filter 1.6s cubic-bezier(.3,.6,.2,1), transform 1.6s cubic-bezier(.3,.6,.2,1); }
.mf-shade { position: absolute; inset: 0; pointer-events: none; transition: opacity 1.6s ease;
  background:
    linear-gradient(90deg, rgba(3,7,5,0.5) 0, rgba(3,7,5,0.12) var(--mf-side, 280px), transparent 42%),
    linear-gradient(0deg, rgba(3,7,5,0.62) 0, rgba(3,7,5,0.18) 24%, transparent 42%); }
/* 对话中：焦点从她身上移开 */
html[data-mf-phase="chat"] .mf-room { filter: blur(16px) brightness(0.42) saturate(0.8); transform: scale(1.05); }
html[data-mf-phase="other"] .mf-room { filter: blur(22px) brightness(0.32) saturate(0.7); transform: scale(1.06); }
/* agent 做完、等你批准：焦点短暂拉回她 */
html[data-mf-phase="chat"].mf-glance .mf-room { filter: blur(4px) brightness(0.66) saturate(0.92); transform: scale(1.015); transition-duration: 1.1s; }
html[data-mf-phase="chat"] .mf-shade, html[data-mf-phase="other"] .mf-shade { opacity: 0.5; }
/* 走进休息室（侧栏入口）：画面盖住中间一栏，可以点 */
html[data-mf-room] .mf-stage { z-index: 30; clip-path: inset(0 0 0 var(--mf-side, 280px)); pointer-events: auto; }
html[data-mf-room] .mf-room { filter: none; transform: none; }
html[data-mf-room] .mf-shade { opacity: 0; }
/* 剧情：整个窗口 */
html[data-mf-story] .mf-stage { z-index: 2147482000; left: 0; pointer-events: auto; }
html[data-mf-story] .mf-room { filter: none; transform: none; }
html[data-mf-story] .mf-shade { opacity: 0; }

/* ---- 界面：玻璃质感 ---- */
[data-rightbar-collapsed] > :first-child { backdrop-filter: blur(18px) saturate(1.1); -webkit-backdrop-filter: blur(18px) saturate(1.1);
  box-shadow: inset -1px 0 0 rgba(201, 211, 214, 0.1); }
[data-composer-card] { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 2px !important;
  box-shadow: 0 0 0 1px rgba(201, 211, 214, 0.16), 0 18px 48px rgba(0, 0, 0, 0.45) !important; }
/* 新会话的空白页：输入框沉到底部，上面留给她；原来的标语换成她的台词 */
[data-content-phase="hero"] [data-conversation-scroll] { justify-content: flex-end !important; padding-bottom: 4.5vh !important; }
[data-content-phase="hero"] [class*="composerStack"] > :first-child:not(:has([data-composer-card])) { visibility: hidden; }

/* ---- 她的台词：电影字幕 ---- */
.mf-line { position: fixed; z-index: 2147481000; pointer-events: none; opacity: 0; transform: translateY(6px);
  transition: opacity 0.7s ease, transform 0.7s ease; max-width: min(560px, 46vw); }
.mf-line.show { opacity: 1; transform: none; }
.mf-line .zh { font-size: 19px; line-height: 1.5; letter-spacing: 0.06em; color: #eef2f1; text-shadow: 0 2px 14px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.6); }
.mf-line .en { margin-top: 2px; font: italic 500 19px/1.35 "MF Cormorant", Georgia, serif; color: #c3ccd0; text-shadow: 0 2px 12px rgba(0,0,0,0.95); }
.mf-line.chat { text-align: center; transform: translate(-50%, 6px); }
.mf-line.chat.show { transform: translate(-50%, 0); }
.mf-line.chat::before { content: ""; position: absolute; inset: -18px -60px; z-index: -1;
  background: radial-gradient(closest-side, rgba(3,7,5,0.72), rgba(3,7,5,0)); }

/* ---- 点她 ---- */
.mf-hit { position: fixed; z-index: 21; display: none; cursor: pointer; }
html[data-mf-phase="hero"]:not([data-mf-room]):not([data-mf-story]) .mf-hit { display: block; }

/* ---- 开场 ---- */
html.mf-pre #root { opacity: 0; }
html.mf-ui-in #root { transition: opacity 0.8s ease; }
/* 飞路火烧过去：火线以内的界面露出来，火线本身画在 .mf-burn 上 */
html.mf-burning #root {
  -webkit-mask-image: radial-gradient(circle at var(--mf-bx) var(--mf-by), #000 calc(var(--mf-br) - 170px), transparent calc(var(--mf-br) - 70px));
  mask-image: radial-gradient(circle at var(--mf-bx) var(--mf-by), #000 calc(var(--mf-br) - 170px), transparent calc(var(--mf-br) - 70px)); }
.mf-burn { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 2147482500; pointer-events: none; mix-blend-mode: screen; }
#mf-boot { cursor: pointer; overflow: hidden; }
#mf-boot .mf-title { position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%); text-align: center; color: #e9eeec; white-space: nowrap; }
#mf-boot .mf-rule { display: block; height: 1px; width: 240px; margin: 0 auto 22px; background: linear-gradient(90deg, transparent, #c9d3d6, transparent);
  transform: scaleX(0); animation: mf-rule 1.1s cubic-bezier(.3,.7,.2,1) 0.2s forwards; }
#mf-boot .mf-en { font: 500 40px/1 "MF Cormorant", Georgia, serif; letter-spacing: 0.32em; text-indent: 0.32em; text-transform: uppercase;
  opacity: 0; animation: mf-in 1.2s ease 0.6s forwards; }
#mf-boot .mf-zh { margin-top: 16px; font-size: 13px; letter-spacing: 0.5em; text-indent: 0.5em; color: #8f9a9d;
  opacity: 0; animation: mf-in 1.2s ease 1s forwards; }
#mf-boot .mf-floo { position: absolute; width: 46vmin; height: 46vmin; margin: -23vmin 0 0 -23vmin; border-radius: 50%; opacity: 0;
  background: radial-gradient(closest-side, rgba(120, 255, 170, 0.55), rgba(40, 190, 110, 0.22) 45%, rgba(10, 80, 45, 0) 100%);
  filter: blur(6px); mix-blend-mode: screen; }
#mf-boot.lit .mf-floo { animation: mf-floo 2.2s ease-out forwards; }
#mf-boot.lit .mf-title { transition: opacity 1s ease; opacity: 0; }
@keyframes mf-rule { to { transform: scaleX(1); } }
@keyframes mf-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes mf-floo { 0% { opacity: 0; transform: scale(0.3); } 25% { opacity: 1; transform: scale(1.05); } 55% { opacity: 0.85; transform: scale(0.92); } 100% { opacity: 0.5; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { #mf-boot .mf-title, #mf-boot .mf-floo { display: none; } }
`;

    // ---------- 工具 ----------
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const today = () => new Date().toISOString().slice(0, 10);
    const ls = {
      get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    };
    // 休息室画面是 object-fit: cover 铺满窗口的，把画面里的比例坐标换算成屏幕坐标
    function frameToScreen(fx, fy) {
      const W = innerWidth, H = innerHeight, s = Math.max(W / 16, H / 9);
      const w = 16 * s, hh = 9 * s;
      return [(W - w) / 2 + fx * w, (H - hh) / 2 + fy * hh];
    }
    const sideRight = () => {
      const el = document.querySelector("[data-rightbar-collapsed] > :first-child");
      return el ? el.getBoundingClientRect().right : 0;
    };
    function phase() {
      const el = document.querySelector("[data-content-phase]");
      if (!el) return "other";
      return el.getAttribute("data-content-phase") === "hero" ? "hero" : "chat";
    }

    function setup() {
      const style = document.createElement("style");
      style.dataset.malfoy = "";
      style.textContent = CSS;
      document.head.appendChild(style);

      // 锁深色：这套主题只有深色
      document.body.toggleAttribute("data-ds-dark-theme", true);
      const darkObs = new MutationObserver(() => {
        if (!document.body.hasAttribute("data-ds-dark-theme")) document.body.toggleAttribute("data-ds-dark-theme", true);
      });
      darkObs.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });

      // 开场先把界面藏起来
      const boot = document.getElementById("mf-boot");
      if (boot) boot.dataset.claimed = "1";
      root.classList.add("mf-pre");

      // 休息室
      const stage = document.createElement("div");
      stage.className = "mf-stage";
      const room = document.createElement("iframe");
      room.className = "mf-room";
      room.src = APP + "index.html?mode=dsh";
      room.allow = "autoplay";
      const shade = document.createElement("div");
      shade.className = "mf-shade";
      stage.append(room, shade);
      document.body.prepend(stage);
      const post = (m) => room.contentWindow && room.contentWindow.postMessage(Object.assign({ mf: 1 }, m), location.origin);

      const line = document.createElement("div");
      line.className = "mf-line";
      line.innerHTML = '<div class="zh"></div><div class="en"></div>';
      const hit = document.createElement("div");
      hit.className = "mf-hit";
      hit.title = "她在看书";
      hit.addEventListener("click", () => post({ type: "touch" }));
      document.body.append(line, hit);

      // ---------- 布局跟着窗口和界面走 ----------
      function layout() {
        const side = sideRight();
        root.style.setProperty("--mf-side", side + "px");
        const [x0, y0] = frameToScreen(SPOT.hit.x, SPOT.hit.y);
        const [x1, y1] = frameToScreen(SPOT.hit.x + SPOT.hit.w, SPOT.hit.y + SPOT.hit.h);
        const seat = document.querySelector("[data-composer-seat]");
        const bottom = Math.min(y1, seat ? seat.getBoundingClientRect().top - 8 : y1);
        const left = Math.max(x0, side + 8);
        Object.assign(hit.style, { left: left + "px", top: y0 + "px", width: Math.max(0, x1 - left) + "px", height: Math.max(0, bottom - y0) + "px" });
        if (boot) {
          const [fx, fy] = frameToScreen(SPOT.fire[0], SPOT.fire[1]);
          const f = boot.querySelector(".mf-floo");
          if (f) Object.assign(f.style, { left: fx + "px", top: fy + "px" });
        }
      }

      // ---------- 会话阶段：空白页 / 对话中 / 其他页面 ----------
      let cur = "";
      let greetAt = 0;
      let booted = false;
      function syncPhase() {
        const p = phase();
        if (p === cur) return;
        const prev = cur;
        cur = p;
        root.dataset.mfPhase = p;
        layout();
        // 回到新会话的空白页时，她招呼一句（一分钟内只说一次）
        if (booted && p === "hero" && prev && Date.now() - greetAt > 60000) {
          greetAt = Date.now();
          setTimeout(() => phase() === "hero" && post({ type: "greet" }), 1400);
        }
      }
      let raf = 0;
      const domObs = new MutationObserver(() => {
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncPhase(); });
      });
      domObs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-content-phase"] });
      addEventListener("resize", layout);
      syncPhase();

      // ---------- 她的台词 ----------
      let lineTimer = 0;
      function showLine(zh, en, ms) {
        line.querySelector(".zh").textContent = zh;
        line.querySelector(".en").textContent = en;
        const chat = cur !== "hero" || root.hasAttribute("data-mf-room");
        line.classList.toggle("chat", chat);
        if (chat) {
          const seat = document.querySelector("[data-composer-seat]");
          const r = seat ? seat.getBoundingClientRect() : { left: sideRight(), width: innerWidth - sideRight(), top: innerHeight - 160 };
          Object.assign(line.style, { left: r.left + r.width / 2 + "px", top: "", bottom: innerHeight - r.top + 18 + "px" });
        } else {
          const [x, y] = frameToScreen(SPOT.line[0], SPOT.line[1]);
          Object.assign(line.style, { left: Math.max(x, sideRight() + 32) + "px", top: y + "px", bottom: "" });
        }
        line.classList.add("show");
        clearTimeout(lineTimer);
        lineTimer = setTimeout(() => line.classList.remove("show"), ms || 3000);
      }

      let glanceTimer = 0;
      function glance() {
        root.classList.add("mf-glance");
        clearTimeout(glanceTimer);
        glanceTimer = setTimeout(() => root.classList.remove("mf-glance"), 4600);
      }

      // ---------- iframe 里的休息室发来的消息 ----------
      let onReady = null, readyInfo = null;
      let uiShown = false;
      function revealUI() {
        if (uiShown) return;
        uiShown = true;
        root.classList.add("mf-ui-in");
        requestAnimationFrame(() => root.classList.remove("mf-pre"));
        setTimeout(() => root.classList.remove("mf-ui-in"), 1000);
      }

      // ---------- 飞路火：从壁炉烧过整个屏幕，火线扫过的地方界面出来 ----------
      // 火线用一个全屏着色器画：到壁炉的距离加上往上飘的噪声，得到一条翻卷的火线；界面用同心的径向遮罩跟在火线后面露出来
      const FLAME_VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
      const FLAME_FS = `precision highp float;
uniform vec2 res,o;uniform float R,t,fade;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+17.;a*=.5;}return v;}
void main(){
  vec2 p=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);
  float d=length(p-o);
  float n1=fbm(vec2(p.x/150.,p.y/90.+t*1.6));
  float n2=fbm(vec2(p.x/26.,p.y/70.+t*4.2));
  float n3=fbm(vec2(p.x/11.,p.y/24.+t*7.));
  float e=d-R+(n1-.5)*220.;
  float u=(e+190.)/230.;
  float fl=smoothstep(0.,.35,u)*(1.-smoothstep(.55,1.,u+(n2-.5)*1.1+(n3-.5)*.35));
  vec3 col=mix(vec3(.01,.2,.1),vec3(.12,.82,.42),smoothstep(.05,.55,fl));
  col=mix(col,vec3(.72,1.,.82),smoothstep(.72,1.,fl));
  col*=smoothstep(0.,.18,fl)*1.15;
  float halo=exp(-abs(e)/240.);
  vec2 sp=p/15.+vec2(0.,t*8.);vec2 c=floor(sp);vec2 f=fract(sp)-.5-(vec2(h(c+1.3),h(c+7.1))-.5)*.6;
  float spark=step(.975,h(c))*smoothstep(.15,.0,length(f))*exp(-abs(e+20.)/90.);
  col+=vec3(.06,.5,.26)*halo*.2+vec3(.8,1.,.88)*spark;
  gl_FragColor=vec4(col*fade,1.);
}`;
      let burnCanvas = null;
      function burnUI(ms) {
        if (uiShown) return Promise.resolve();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve(revealUI());
        const W = innerWidth, H = innerHeight;
        const cv = document.createElement("canvas");
        cv.className = "mf-burn";
        cv.width = W;
        cv.height = H;
        const gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
        const prog = gl && gl.createProgram();
        if (gl) {
          for (const [type, src] of [[gl.VERTEX_SHADER, FLAME_VS], [gl.FRAGMENT_SHADER, FLAME_FS]]) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            gl.attachShader(prog, sh);
          }
          gl.linkProgram(prog);
        }
        // 没有 WebGL 就退回普通淡入
        if (!gl || !gl.getProgramParameter(prog, gl.LINK_STATUS)) return Promise.resolve(revealUI());
        uiShown = true;
        burnCanvas = cv;
        document.body.append(cv);
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = (k) => gl.getUniformLocation(prog, k);
        const [ox, oy] = frameToScreen(SPOT.fire[0], SPOT.fire[1]);
        gl.uniform2f(U("res"), W, H);
        gl.uniform2f(U("o"), ox, oy);

        const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
        const R1 = far + 320;
        root.style.setProperty("--mf-bx", ox + "px");
        root.style.setProperty("--mf-by", oy + "px");
        root.style.setProperty("--mf-br", "0px");
        root.classList.add("mf-burning");
        root.classList.remove("mf-pre");

        const ease = (k) => k * k * (3 - 2 * k);
        const t0 = performance.now();
        return new Promise((done) => {
          function frame(now) {
            const k = Math.min(1, (now - t0) / ms);
            const R = ease(k) * R1;
            root.style.setProperty("--mf-br", R + "px");
            gl.uniform1f(U("R"), R);
            gl.uniform1f(U("t"), (now - t0) / 1000);
            // 刚点着时亮起来，烧出屏幕前慢慢暗下去
            gl.uniform1f(U("fade"), Math.min(1, k / 0.08) * Math.min(1, (1 - k) / 0.25));
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            if (k < 1) return requestAnimationFrame(frame);
            root.classList.remove("mf-burning");
            cv.remove();
            burnCanvas = null;
            done();
          }
          requestAnimationFrame(frame);
        });
      }

      function onMessage(e) {
        const m = e.data;
        if (e.source !== room.contentWindow || !m || !m.mf) return;
        if (m.type === "ready") { readyInfo = m; if (onReady) onReady(m); }
        if (m.type === "line") showLine(m.zh, m.en, m.ms);
        if (m.type === "story") {
          root.toggleAttribute("data-mf-story", !!m.open);
          // 剧情播放器本身就是黑底，黑幕直接撤掉，不做交叉淡化
          if (m.open && boot) boot.remove();
          if (!m.open) { revealUI(); booted = true; }
        }
      }
      addEventListener("message", onMessage);

      // ---------- agent 状态（Host 半边的 SSE） ----------
      const es = new EventSource("/malfoy/events");
      es.onmessage = (e) => {
        let m;
        try { m = JSON.parse(e.data); } catch (err) { return; }
        post({ type: "agent", state: m.type });
        if ((m.type === "done" || m.type === "approval") && cur === "chat" && !root.hasAttribute("data-mf-room")) setTimeout(glance, 300);
      };

      // ---------- 开场 ----------
      async function intro() {
        if (!readyInfo) await Promise.race([new Promise((r) => (onReady = r)), wait(6000)]);
        layout();
        const long = ls.get("mf-boot-day") !== today();
        ls.set("mf-boot-day", today());
        let skipped = false;
        if (boot) boot.addEventListener("click", () => (skipped = true), { once: true });
        const sleep = async (ms) => { const t = Date.now(); while (!skipped && Date.now() - t < ms) await wait(50); };

        if (boot && long) {
          boot.innerHTML = '<div class="mf-floo"></div><div class="mf-title"><i class="mf-rule"></i><div class="mf-en">Miss Malfoy</div><div class="mf-zh">斯莱特林公共休息室</div></div>';
          layout();
          await sleep(2300);
          boot.classList.add("lit");
          await sleep(800);
        }
        // 黑幕退开，休息室先全屏放一会儿（她正走进来），然后飞路火从壁炉烧过去，界面跟着出来
        post({ type: "start" });
        if (boot) boot.classList.add("gone");
        await sleep(long ? 2000 : 700);
        await burnUI(skipped ? 1000 : long ? 2000 : 1300);
        booted = true;
        // 她走进来、躺下以后，招呼一句
        setTimeout(() => {
          if (cur === "hero" && !root.hasAttribute("data-mf-room")) { greetAt = Date.now(); post({ type: "greet" }); }
        }, 8600);
      }
      intro();

      // ---------- 侧栏「休息室」 ----------
      function enterRoom(on) {
        root.toggleAttribute("data-mf-room", on);
        layout();
        post({ type: "room", on, inset: sideRight() });
      }

      return {
        enterRoom,
        dispose() {
          es.close();
          removeEventListener("message", onMessage);
          removeEventListener("resize", layout);
          domObs.disconnect();
          darkObs.disconnect();
          stage.remove(); line.remove(); hit.remove(); style.remove();
          if (boot) boot.remove();
          if (burnCanvas) burnCanvas.remove();
          root.classList.remove("mf-pre", "mf-ui-in", "mf-burning", "mf-glance");
          root.removeAttribute("data-mf-phase"); root.removeAttribute("data-mf-room"); root.removeAttribute("data-mf-story");
        },
      };
    }

    // 侧栏图标：休息室的哥特式拱窗
    function RoomIcon(props) {
      const s = (props && props.size) || 18;
      return h("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "square" },
        h("path", { d: "M6 21V10.5C6 7 8.7 4 12 3c3.3 1 6 4 6 7.5V21" }),
        h("path", { d: "M12 3.5V21M6 13h12" }),
        h("path", { d: "M4 21h16" }));
    }

    function apply(ctx) {
      let api = null;
      ctx.effect(() => {
        try {
          ctx.theme.register({ id: THEME_ID, colorScheme: "dark", tokens: TOKENS });
          ctx.theme.setTheme(THEME_ID);
        } catch (e) {
          console.error("[malfoy] theme register failed", e);
        }
        api = setup();
        return () => { api.dispose(); api = null; };
      }, "malfoy-desktop: stage");

      // 走进休息室：一个整页入口，页面本身是透明的，打开时把休息室画面提到前面
      function RoomPanel() {
        React.useEffect(() => {
          if (api) api.enterRoom(true);
          return () => { if (api) api.enterRoom(false); };
        }, []);
        return h("div", { style: { width: "100%", height: "100%" } });
      }
      ctx.slots.inject("sidebar.panellist", () =>
        ctx.slots.register({ name: "sidebar.panellist", id: "malfoy-room", order: 5, label: () => "休息室" }, RoomIcon));
      ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "malfoy-room" }, RoomPanel));
    }

    exports.isPlugin = true;
    exports.inject = ["slots", "theme"];
    exports.apply = apply;
    return module.exports;
  },
});

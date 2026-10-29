// 马尔福桌面 · DeepSeek Harness 插件：Host 半边
// 1. /malfoy/app/  提供 桌面程序/app/ 这套网页和视频（官方的插件资源路由只放行图片，视频要自己带 Range）
// 2. /malfoy/events  把 agent 的状态用 SSE 推给浏览器：busy / idle / done / approval / error
// 3. index.html 首屏注入一层黑幕，浏览器半边接管它做开场动画，避免先闪一下默认界面
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

export const name = "malfoy-desktop";
export const inject = ["webServer"];

// 首屏：一层纯黑，浏览器半边加载后接管。万一插件的浏览器半边没加载起来，8 秒后自己撤掉，不把人关在黑屏里
const BOOT_STYLE = `html{background:#040605}#mf-boot{position:fixed;inset:0;z-index:2147483000;background:#040605;transition:opacity 1.4s ease}#mf-boot.gone{opacity:0;pointer-events:none}`;
const BOOT_HTML = `<div id="mf-boot"></div>`;
const BOOT_SCRIPT = `setTimeout(function(){var b=document.getElementById("mf-boot");if(b&&!b.dataset.claimed)b.remove()},8000)`;

function serveFile(req, res, file) {
  const size = statSync(file).size;
  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range) {
    let start = range[1] === "" ? size - Number(range[2]) : Number(range[1]);
    let end = range[1] === "" || range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
    if (!(start >= 0 && start <= end)) {
      res.writeHead(416, { "content-range": `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, {
      "content-type": type,
      "content-length": end - start + 1,
      "content-range": `bytes ${start}-${end}/${size}`,
      "accept-ranges": "bytes",
      "cache-control": "no-cache",
    });
    if (req.method === "HEAD") return res.end();
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes", "cache-control": "no-cache" });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

export function apply(ctx, config = {}) {
  // 网页目录：默认是包里的 web/（开发时是指向 桌面程序/app 的软链接），也可以在配置里指定
  // 从 Git 源码装的包没有视频：不报错，只提示去 Release 装预构建包
  const webDir = config.appDir || join(ROOT, "web");
  if (!existsSync(join(webDir, "index.html"))) {
    console.warn(`[malfoy-desktop] 找不到休息室的网页和视频（${webDir}），请从 https://github.com/op7418/malfoy-desktop/releases 安装预构建包`);
    return;
  }
  const appDir = realpathSync(webDir);

  // ---------- agent 状态 ----------
  const clients = new Set();
  const running = new Set();
  const send = (type) => {
    const msg = `data: ${JSON.stringify({ type, t: Date.now() })}\n\n`;
    for (const res of clients) res.write(msg);
  };
  const sid = (p) => (p && (p.sessionId || p.id || (p.agent && sid(p.agent)) || (p.session && sid(p.session)))) || "?";

  ctx.on("agent/status", (p) => {
    const was = running.size > 0;
    if (p && p.status === "running") running.add(sid(p.agent || p));
    else running.delete(sid(p && (p.agent || p)));
    if (was !== running.size > 0) send(running.size ? "busy" : "idle");
  });
  ctx.on("agent/turn-stopping", () => send("done"));
  ctx.on("agent/error", () => send("error"));
  // waterfall：只旁听，必须把请求交还给下一个监听者
  ctx.on("approval/request", (req, next) => {
    send("approval");
    return next();
  });

  ctx.on("webserver/index-inject", (table) => {
    table.push({ kind: "style", text: BOOT_STYLE });
    table.push({ kind: "html", placement: "body", html: BOOT_HTML });
    table.push({ kind: "script", placement: "body", text: BOOT_SCRIPT });
  });

  ctx.effect(() =>
    ctx.webServer.register({
      kind: "exact",
      path: "/malfoy/events",
      handler(req, res) {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(`retry: 3000\ndata: ${JSON.stringify({ type: running.size ? "busy" : "idle" })}\n\n`);
        clients.add(res);
        const ping = setInterval(() => res.write(": ping\n\n"), 25000);
        req.on("close", () => {
          clearInterval(ping);
          clients.delete(res);
        });
      },
    }),
  );

  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/malfoy/app",
      handler(req, res) {
        const url = new URL(req.url || "/", "http://x");
        let rel = decodeURIComponent(url.pathname.slice("/malfoy/app".length));
        if (rel === "" || rel === "/") rel = "/index.html";
        const file = normalize(join(appDir, rel));
        if (!file.startsWith(appDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          return res.end("not found");
        }
        serveFile(req, res, file);
      },
    }),
  );

  ctx.effect(() => () => {
    for (const res of clients) res.end();
    clients.clear();
  });
}

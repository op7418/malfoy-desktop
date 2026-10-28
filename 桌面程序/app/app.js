(() => {
  const D = window.MALFOY;
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const MODE = params.get("mode") || "interactive"; // wallpaper | interactive
  document.body.dataset.mode = MODE;

  // ---------- 素材格式 ----------
  // Wallpaper Engine 的内置 Chromium（CEF）不带 H.264 / AAC / MP3 解码器，它的包里换成了 WebM / Ogg（tools/make-webm.sh）。
  // ?webm=1 可以在普通浏览器里强制走这条路测试。
  const NO_H264 = params.has("webm") || !document.createElement("video").canPlayType('video/mp4; codecs="avc1.4d4028, mp4a.40.2"');
  const media = (src) => (NO_H264 && src ? src.replace(/\.mp4$/, ".webm").replace(/\.mp3$/, ".ogg") : src);

  // ---------- 存档 ----------
  const KEY = "malfoy-desktop-v1";
  const fresh = () => ({ aff: 0, seen: {}, chapterDone: {}, picks: {}, notified: {}, lastVisit: "", scene: "sofa", lastTouch: 0, sound: false });
  let S = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) S = Object.assign(fresh(), JSON.parse(raw));
    } catch (e) {}
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }
  load();

  // ---------- 好感度与解锁 ----------
  function addAff(n, why) {
    const before = S.aff;
    S.aff = Math.max(0, Math.min(D.affection.max, S.aff + n));
    save();
    renderHud();
    if (S.aff !== before) checkUnlocks(why);
  }
  function checkUnlocks() {
    const items = [];
    for (const [id, sc] of Object.entries(D.scenes)) {
      if (sc.unlockAt > 0 && S.aff >= sc.unlockAt && !S.notified["scene:" + id]) {
        S.notified["scene:" + id] = 1;
        items.push(["好感度达到 " + sc.unlockAt + " · 已解锁", sc.outfit + "装扮 · " + sc.name.split(" · ")[1]]);
      }
    }
    for (const p of D.album || []) {
      if (S.aff >= p.unlockAt && !S.notified["photo:" + p.id]) {
        S.notified["photo:" + p.id] = 1;
        items.push(["好感度达到 " + p.unlockAt + " · 新照片", "相册 · " + p.where]);
      }
    }
    for (const ch of D.chapters) {
      if (ch.unlockAt > 0 && S.aff >= ch.unlockAt && !S.notified["ch:" + ch.id]) {
        S.notified["ch:" + ch.id] = 1;
        items.push(["好感度达到 " + ch.unlockAt + " · 已解锁", ch.title]);
      }
    }
    save();
    items.forEach((it, i) => setTimeout(() => toast(it[0], it[1]), i * 3200));
  }
  function renderHud() {
    $("#aff-fill").style.transform = "scaleX(" + S.aff / D.affection.max + ")";
    $("#aff-num").textContent = S.aff;
    let call = D.callNames[0][1];
    for (const [t, name] of D.callNames) if (S.aff >= t) call = name;
    $("#hud-call").textContent = call;
    $("#sound-k").textContent = S.sound ? "声音 开" : "声音 关";
  }
  let toastTimer = 0;
  function toast(a, b) {
    const t = $("#toast");
    t.querySelector(".a").textContent = a;
    t.querySelector(".b").textContent = b;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2900);
  }

  // 每天第一次见面
  const today = new Date().toISOString().slice(0, 10);
  if (S.lastVisit !== today) {
    const first = !S.lastVisit;
    S.lastVisit = today;
    save();
    if (!first) setTimeout(() => addAff(D.affection.dailyVisit), 4000);
  }

  // ---------- 桌面：双 video 无缝衔接 ----------
  const va = $("#va"), vb = $("#vb"), still = $("#still");
  let front = va, back = vb;
  let playerOpen = false;
  let weMuted = false, weVolume = 1;
  let busy = false, sleeping = false, idleTimer = 0, sceneId = D.scenes[S.scene] && S.aff >= D.scenes[S.scene].unlockAt ? S.scene : "sofa";
  const scene = () => D.scenes[sceneId];

  const bgm = $("#bgm");
  bgm.src = media("media/bgm.mp3");
  function applyVolume() {
    const muted = !S.sound || weMuted;
    va.muted = vb.muted = muted;
    va.volume = vb.volume = weVolume;
    // 背景钢琴压在环境声下面
    bgm.volume = 0.35 * weVolume;
    if (muted || playerOpen) bgm.pause();
    else bgm.play().catch(() => {});
  }

  // 生成视频的最后几帧画质会明显下降，所以动作片段不播到最后一帧：
  // 提前 FADE 秒淡出，露出底下的"静止循环"（高清首帧 + 只有炉火在动），首尾帧是同一张锚点图，看不出接缝。
  const FADE = 0.45;
  // 两个静止循环交替：一段播到结尾前 XF 秒，就随机挑下一段在另一个元素上开始，交叉淡化
  const XF = 0.6;
  const ambs = [$("#amb"), $("#amb2")];
  let ambCur = 0, ambList = null, ambRaf = 0;
  const amb = { pause() { ambs.forEach((v) => v.pause()); }, play() { return ambList ? ambs[ambCur].play() : Promise.resolve(); }, classList: { contains: () => !!ambList } };
  let watchRaf = 0;

  function ambStart(el, src) {
    el.onended = null;
    if (el.dataset.src !== src) { el.dataset.src = src; el.src = media(src); }
    el.currentTime = 0;
    el.loop = ambList.length === 1;
    el.play().catch(() => {});
  }
  function ambTick() {
    const v = ambs[ambCur];
    if (ambList && ambList.length > 1 && v.duration && v.currentTime >= v.duration - XF) {
      const next = ambs[1 - ambCur];
      ambStart(next, ambList[Math.floor(Math.random() * ambList.length)]);
      next.classList.add("on");
      v.classList.remove("on");
      setTimeout(() => v.pause(), XF * 1000 + 50);
      ambCur = 1 - ambCur;
    }
    ambRaf = requestAnimationFrame(ambTick);
  }
  function setAmbient(src) {
    cancelAnimationFrame(ambRaf);
    if (!src) { ambList = null; ambs.forEach((v) => { v.classList.remove("on"); v.pause(); }); return; }
    const list = Array.isArray(src) ? src : [src];
    const same = ambList && ambList.join() === list.join() && ambs[ambCur].classList.contains("on");
    ambList = list;
    if (!same) {
      ambs[1 - ambCur].classList.remove("on"); ambs[1 - ambCur].pause();
      ambStart(ambs[ambCur], list[Math.floor(Math.random() * list.length)]);
      ambs[ambCur].classList.add("on");
    } else ambs[ambCur].play().catch(() => {});
    ambRaf = requestAnimationFrame(ambTick);
  }

  function playDesk(src, onEnd, opts) {
    opts = opts || {};
    busy = true;
    clearTimeout(idleTimer);
    cancelAnimationFrame(watchRaf);
    const v = back;
    v.onended = null;
    v.style.transition = "none";
    v.src = media(src);
    applyVolume();
    v.currentTime = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(watchRaf);
      if (opts.ambient !== undefined) setAmbient(opts.ambient);
      v.style.transition = "opacity " + FADE + "s ease";
      v.classList.remove("on");
      busy = false;
      setTimeout(() => { if (!v.classList.contains("on")) v.pause(); }, FADE * 1000 + 50);
      if (onEnd) onEnd();
    };
    const watch = () => {
      const endAt = opts.endAt != null ? opts.endAt : v.duration - FADE - 0.05;
      if (v.duration && v.currentTime >= endAt) return finish();
      watchRaf = requestAnimationFrame(watch);
    };
    v.oncanplay = () => {
      v.oncanplay = null;
      v.play().catch(() => {
        // 自动播放被拦截时，静音重试
        v.muted = true;
        v.play().catch(() => {});
      });
    };
    v.onplaying = () => {
      v.onplaying = null;
      // 进场用很短的淡入，盖住炉火从循环切到片段时的跳变
      v.style.transition = "opacity 0.25s ease";
      v.classList.add("on");
      front.classList.remove("on");
      [front, back] = [v, front];
      watchRaf = requestAnimationFrame(watch);
    };
    v.onended = finish;
    // 解码失败时直接收尾，回到静止循环，不卡住后面的待机调度
    v.onerror = () => { v.onerror = null; finish(); };
    v.load();
  }

  function setStill(src) {
    if (src) still.src = src;
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (sleeping) return;
    const hold = D.idleHoldMin + Math.random() * (D.idleHoldMax - D.idleHoldMin);
    idleTimer = setTimeout(() => {
      if (busy || playerOpen) return scheduleIdle();
      const h = new Date().getHours();
      const sc = scene();
      if (sc.sleep && (h >= D.nightHour || h < 5)) {
        playDesk(sc.sleep, () => {
          sleeping = true;
          setStill(sc.sleepStill);
        }, { ambient: sc.ambientSleep, endAt: sc.sleepEndAt });
        return;
      }
      const list = sc.idle;
      playDesk(list[Math.floor(Math.random() * list.length)], scheduleIdle, { ambient: sc.ambient });
    }, hold * 1000);
  }

  function enterScene(id, withEntrance) {
    sceneId = id;
    S.scene = id;
    save();
    sleeping = false;
    const sc = scene();
    setStill(sc.anchor);
    placeHit();
    if (withEntrance && sc.enter) {
      fadeBlack(() => {
        if (sc.empty) setStill(sc.empty);
        setAmbient(null);
        playDesk(sc.enter, () => { setStill(sc.anchor); scheduleIdle(); }, { ambient: sc.ambient });
      });
    } else {
      front.classList.remove("on");
      back.classList.remove("on");
      setAmbient(sc.ambient);
      scheduleIdle();
    }
  }

  function fadeBlack(mid) {
    const st = $("#stage");
    st.classList.add("dark");
    setTimeout(() => {
      mid();
      setTimeout(() => st.classList.remove("dark"), 350);
    }, 600);
  }

  function placeHit() {
    const h = scene().hit, el = $("#hit");
    el.style.left = h.x + "%";
    el.style.top = h.y + "%";
    el.style.width = h.w + "%";
    el.style.height = h.h + "%";
  }

  // 点她
  let bubbleTimer = 0;
  function bubble(zh, en, ms) {
    const b = $("#bubble");
    b.querySelector(".zh").textContent = zh;
    b.querySelector(".en").textContent = en;
    b.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => b.classList.remove("show"), ms || 2600);
  }
  let lineIdx = 0;
  $("#hit").addEventListener("click", () => {
    if (playerOpen) return;
    if (sleeping) {
      // 叫醒：静帧切回锚点
      sleeping = false;
      fadeBlack(() => { setStill(scene().anchor); front.classList.remove("on"); back.classList.remove("on"); setAmbient(scene().ambient); });
      bubble("……我没睡。", "...I wasn't asleep.");
      scheduleIdle();
      return;
    }
    if (busy) return;
    const now = Date.now() / 1000;
    const cool = now - S.lastTouch < D.affection.touchCooldownSec;
    const lines = sceneId === "sofa" ? D.touchLines : D.touchLinesHome;
    if (sceneId === "sofa" && !cool) {
      playDesk(scene().touch, scheduleIdle);
      const c = D.clips.D4.caps[0];
      setTimeout(() => bubble(c[2], c[3], (c[1] - c[0]) * 1000), c[0] * 1000);
    } else {
      const l = lines[lineIdx++ % lines.length];
      if (!cool && scene().touch) playDesk(scene().touch, scheduleIdle);
      bubble(l[0], l[1]);
    }
    if (!cool) {
      S.lastTouch = now;
      addAff(D.affection.touch);
    }
  });

  // ---------- 剧情播放器 ----------
  const pv = $("#pv");
  let capList = [], capRaf = 0, onClipEnd = null;

  function openPlayer() {
    playerOpen = true;
    clearTimeout(idleTimer);
    front.pause();
    back.pause();
    amb.pause();
    $("#player").classList.remove("hidden");
    applyVolume();
  }
  function closePlayer() {
    playerOpen = false;
    pv.onerror = null;
    pv.pause();
    pv.removeAttribute("src");
    pv.load();
    cancelAnimationFrame(capRaf);
    $("#player").classList.add("hidden");
    $("#choice").classList.add("hidden");
    $("#card").classList.add("hidden");
    if (amb.classList.contains("on")) amb.play().catch(() => {});
    scheduleIdle();
    applyVolume();
  }
  function playStory(id, onEnd) {
    const c = D.clips[id];
    S.seen[id] = 1;
    save();
    capList = c.caps || [];
    onClipEnd = onEnd;
    pv.src = media(c.src);
    pv.muted = weMuted;
    pv.volume = weVolume;
    pv.onended = () => finishClip();
    // 放不出来就提示一下并跳到下一段，不停在黑屏上
    pv.onerror = () => {
      pv.onerror = null;
      toast("这段剧情无法播放", "已跳过 · " + id);
      setTimeout(finishClip, 1200);
    };
    pv.play().catch(() => {});
    tickCaps();
  }
  function finishClip() {
    pv.onended = null;
    pv.onerror = null;
    cancelAnimationFrame(capRaf);
    showCap(null);
    const f = onClipEnd;
    onClipEnd = null;
    if (f) f();
  }
  function showCap(c) {
    const el = $("#cap");
    if (!c) return el.classList.remove("show");
    el.querySelector(".zh").textContent = c[2];
    el.querySelector(".en").textContent = c[3];
    el.classList.add("show");
  }
  function tickCaps() {
    const t = pv.currentTime;
    showCap(capList.find((c) => t >= c[0] && t < c[1]) || null);
    capRaf = requestAnimationFrame(tickCaps);
  }
  $("#skip").addEventListener("click", () => {
    if (!$("#choice").classList.contains("hidden")) return;
    pv.pause();
    finishClip();
  });

  // 斯莱特林法阵（Three.js）：悬停时法阵增亮、选项边框有光流动，点击时被选项燃起翡翠火
  let cfx = null, cfxRaf = 0;
  function startChoiceFx(box) {
    if (!window.MalfoyMagic) return { pick() {}, stop() {} };
    if (!cfx) cfx = MalfoyMagic.sigil($("#choice-fx"), { strength: 0.55, fire: 0.6 });
    const sx = 1920 / innerWidth, sy = 1080 / innerHeight;
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2) * sx, y: (r.top + r.height / 2) * sy, w: r.width * sx, h: r.height * sy }; };
    const panel = rect($("#choice-box"));
    const opts = [...box.querySelectorAll(".opt")];
    const st = cfx.state;
    Object.assign(st, { t: 0, appear: 0, hover: 0, click: 0, cx: panel.x, cy: panel.y, size: panel.w * 1.45 });
    let target = null, clickAt = 0, last = performance.now();
    const setTarget = (el) => { const r = rect(el); target = r; if (st.hover < 0.05) Object.assign(st, { hx: r.x, hy: r.y, hw: r.w, hh: r.h }); };
    opts.forEach((el) => { el.onmouseenter = () => setTarget(el); el.onmouseleave = () => (target = null); });
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.t += dt;
      st.appear = Math.min(1, st.appear + dt / 0.9);
      st.hover += ((target ? 1 : 0) - st.hover) * Math.min(1, dt * 7);
      if (target) { const k = Math.min(1, dt * 10); st.hx += (target.x - st.hx) * k; st.hy += (target.y - st.hy) * k; st.hw = target.w; st.hh = target.h; }
      if (clickAt) st.click = Math.min(1, (now - clickAt) / 1200);
      cfx.render();
      cfxRaf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(cfxRaf);
    cfxRaf = requestAnimationFrame(loop);
    return {
      pick(el) { setTarget(el); const r = rect(el); Object.assign(st, { hx: r.x, hy: r.y }); st.hover = 1; clickAt = performance.now(); },
      stop() { cancelAnimationFrame(cfxRaf); },
    };
  }

  function askChoice(done) {
    const box = $("#choice");
    box.classList.remove("hidden");
    const fxc = startChoiceFx(box);
    box.classList.remove("picked");
    box.querySelectorAll(".opt").forEach((b) => b.classList.remove("sel"));
    const fill = $("#choice-timer-fill");
    fill.style.transition = "none";
    fill.style.transform = "scaleX(1)";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = "transform 12s linear";
      fill.style.transform = "scaleX(0)";
    }));
    let decided = false;
    const pick = (k) => {
      if (decided) return;
      decided = true;
      clearTimeout(timer);
      box.classList.add("picked");
      const sel = box.querySelector('[data-pick="' + k + '"]');
      sel.classList.add("sel");
      fxc.pick(sel);
      setTimeout(() => { fxc.stop(); box.classList.add("hidden"); done(k); }, 1300);
    };
    box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => pick(b.dataset.pick)));
    const timer = setTimeout(() => pick("A"), 12000); // 沉默也是一种回答
  }

  function showCard(zh, en, ms, done) {
    const c = $("#card");
    c.querySelector(".zh").textContent = zh;
    c.querySelector(".en").textContent = en;
    c.classList.remove("hidden");
    setTimeout(() => { c.classList.add("hidden"); done && done(); }, ms);
  }

  function runChapter(ch, onDone) {
    openPlayer();
    let i = 0, pickKey = null;
    const step = () => {
      const s = ch.flow[i++];
      if (!s) {
        return showCard("第一章　完", "To be continued.", 3500, () => {
          const first = !S.chapterDone[ch.id];
          S.chapterDone[ch.id] = 1;
          save();
          closePlayer();
          if (first) addAff(ch.reward);
          if (onDone) onDone();
        });
      }
      if (s.branch) return playStory(s.branch[pickKey], step);
      playStory(s.clip, () => {
        if (s.then === "choice") {
          askChoice((k) => {
            pickKey = k;
            const firstPick = !S.picks[ch.id];
            S.picks[ch.id] = S.picks[ch.id] || {};
            S.picks[ch.id][k] = 1;
            save();
            if (firstPick) addAff(D.affection.choiceBonus[k]);
            step();
          });
        } else step();
      });
    };
    showCard(ch.title, ch.titleEn, 2600, step);
  }

  // ---------- 面板 ----------
  function openPanel(title, html, bind) {
    $("#panel-title").textContent = title;
    $("#panel-body").innerHTML = html;
    $("#panel").classList.remove("hidden");
    if (bind) bind($("#panel-body"));
  }
  const closePanel = () => $("#panel").classList.add("hidden");
  $("#panel-close").onclick = closePanel;

  function storyPanel() {
    const rows = D.chapters.map((ch) => {
      const open = S.aff >= ch.unlockAt && ch.flow;
      const tag = !ch.flow && S.aff >= ch.unlockAt ? "敬请期待" : open ? (S.chapterDone[ch.id] ? "已看完 · 可重温" : "可观看") : "好感度 " + ch.unlockAt + " 解锁";
      return '<button class="row' + (open ? "" : " locked") + '" data-ch="' + ch.id + '"><span class="t">' + ch.title + '</span><span class="s">' + ch.titleEn + '</span><span class="tag">' + tag + "</span></button>";
    });
    openPanel("剧情", rows.join(""), (b) =>
      b.querySelectorAll(".row:not(.locked)").forEach((r) => (r.onclick = () => {
        closePanel();
        runChapter(D.chapters.find((c) => c.id === r.dataset.ch));
      })));
  }
  function pensievePanel() {
    const rows = D.memories.map((m) => {
      const ok = S.seen[m.clip];
      return '<button class="row' + (ok ? "" : " locked") + '" data-clip="' + m.clip + '"><span class="t">' + (ok ? m.name : "？？？") + '</span><span class="s">' + (ok ? m.en : "尚未经历的回忆") + "</span></button>";
    });
    openPanel("冥想盆 · 回忆", rows.join(""), (b) =>
      b.querySelectorAll(".row:not(.locked)").forEach((r) => (r.onclick = () => {
        closePanel();
        openPlayer();
        playStory(r.dataset.clip, closePlayer);
      })));
  }
  function wardrobePanel() {
    const rows = Object.entries(D.scenes).map(([id, sc]) => {
      const ok = S.aff >= sc.unlockAt;
      const cur = id === sceneId;
      return '<button class="row' + (ok ? "" : " locked") + (cur ? " cur" : "") + '" data-scene="' + id + '"><span class="t">' + sc.outfit + "装扮</span><span class=\"s\">" + sc.name + '</span><span class="tag">' + (cur ? "当前" : ok ? "换上" : "好感度 " + sc.unlockAt + " 解锁") + "</span></button>";
    });
    rows.push('<button class="row locked"><span class="t">睡衣装扮</span><span class="s">宿舍 · 床边</span><span class="tag">好感度 60 解锁</span></button>');
    openPanel("衣橱", rows.join(""), (b) =>
      b.querySelectorAll(".row:not(.locked):not(.cur)").forEach((r) => (r.onclick = () => {
        closePanel();
        enterScene(r.dataset.scene, true);
      })));
  }

  function albumPanel() {
    const cells = D.album.map((p) => {
      const ok = S.aff >= p.unlockAt;
      return '<div class="album-cell' + (ok ? "" : " locked") + '" data-id="' + p.id + '"><img src="' + p.src + '" alt="" />' +
        (ok ? (p.overlay === false ? "" : '<span class="date">' + p.date + "</span>") : '<span class="lock">好感度 ' + p.unlockAt + " 解锁</span>") + "</div>";
    });
    const got = D.album.filter((p) => S.aff >= p.unlockAt).length;
    openPanel("相册 · " + got + " / " + D.album.length, '<div class="album-grid">' + cells.join("") + "</div>", (b) =>
      b.querySelectorAll(".album-cell:not(.locked)").forEach((c) => (c.onclick = () => showPhoto(D.album.find((p) => p.id === c.dataset.id)))));
  }
  function showPhoto(p) {
    $("#photo-img").src = p.src;
    $("#photo-date").textContent = p.overlay === false ? "" : p.date;
    $("#photo .zh").textContent = p.zh;
    $("#photo .en").textContent = p.en;
    $("#photo .where").textContent = p.where;
    $("#photo").classList.remove("hidden");
  }
  $("#photo").addEventListener("click", () => $("#photo").classList.add("hidden"));

  $("#dock").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "story") storyPanel();
    if (act === "pensieve") pensievePanel();
    if (act === "wardrobe") wardrobePanel();
    if (act === "album") albumPanel();
    if (act === "sound") { S.sound = !S.sound; save(); applyVolume(); renderHud(); }
  });

  // ---------- 录屏用：隐藏的快进好感度 ----------
  // 连点名字 5 次，或 Shift+Alt+M：好感度 +10
  let taps = [];
  $("#hud-name").addEventListener("click", () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 2000).concat(now);
    if (taps.length >= 5) { taps = []; addAff(10); }
  });
  window.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.altKey && e.code === "KeyM") addAff(10);
    if (e.shiftKey && e.altKey && e.code === "KeyR") { S = fresh(); save(); location.reload(); }
    if (e.key === "Escape") {
      if (!$("#photo").classList.contains("hidden")) return $("#photo").classList.add("hidden");
      if (!$("#panel").classList.contains("hidden")) return closePanel();
      if (window.malfoyHost) window.malfoyHost.exitInteractive();
    }
  });

  // 另一个窗口（壁纸/互动）改了存档时同步
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) { load(); renderHud(); applyVolume(); }
  });

  // ---------- Wallpaper Engine 属性 ----------
  window.wallpaperPropertyListener = {
    applyUserProperties(p) {
      if (p.showui) document.body.classList.toggle("no-ui", !p.showui.value);
      if (p.sound) { S.sound = !!p.sound.value; save(); }
      if (p.volume) weVolume = Math.max(0, Math.min(1, p.volume.value / 100));
      applyVolume();
      renderHud();
    },
  };

  // ---------- 启动 ----------
  renderHud();
  applyVolume();
  const startWithEntrance = !params.has("noenter");
  // 第一次打开（Wallpaper Engine 里没有菜单栏入口）：先看第一章，看完她再走进休息室。
  // macOS 的两个窗口都带 mode/noenter 参数，不走这里。
  const firstCh = D.chapters.find((c) => c.flow);
  if (MODE === "interactive" && startWithEntrance && firstCh && !S.introPlayed && !S.chapterDone[firstCh.id]) {
    S.introPlayed = 1;
    save();
    setStill(scene().empty || scene().anchor);
    runChapter(firstCh, () => enterScene(sceneId, true));
  } else enterScene(sceneId, startWithEntrance);
})();

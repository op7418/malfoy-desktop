// 素材与剧情数据。换素材只改这里。
window.MALFOY = {
  // 桌面场景。每个场景：入场片段、待机片段（首尾帧都是锚点）、点击她时的片段、锚点静帧
  scenes: {
    sofa: {
      name: "公共休息室 · 沙发",
      outfit: "校袍",
      unlockAt: 0,
      empty: "media/empty-sofa.jpg",
      anchor: "media/anchor-sofa.jpg",
      // 静止循环（4K，无缝）：D8 她轻轻呼吸看书、D9 她完全不动，环境一直在动；每轮随机挑一段
      ambient: ["media/ambient-sofa-a.mp4", "media/ambient-sofa-a.mp4", "media/ambient-sofa-b.mp4"], // D8 偶尔翻书，出现概率 2/3
      ambientSleep: "media/ambient-sleep.mp4",
      sleepEndAt: 5.0,
      enter: "media/D1.mp4",
      idle: ["media/D2.mp4", "media/D3.mp4"],
      touch: "media/D4.mp4",
      sleep: "media/D5.mp4",
      sleepStill: "media/sleep-sofa.jpg",
      // 她在画面里的位置（相对 16:9 画面的百分比），用于点击
      hit: { x: 4, y: 28, w: 44, h: 48 },
    },
    armchair: {
      name: "公共休息室 · 扶手椅",
      outfit: "居家",
      unlockAt: 20,
      empty: null,
      anchor: "media/anchor-armchair.jpg",
      ambient: "media/ambient-armchair.mp4",
      enter: "media/D6.mp4",
      idle: ["media/D7.mp4"],
      touch: "media/D7.mp4",
      sleep: null,
      sleepStill: null,
      hit: { x: 54, y: 40, w: 20, h: 50 },
    },
  },

  // 点她时的台词（D4 本身有配音，其他场景只出字幕气泡）
  touchLines: [
    ["别盯着我看。", "Stop staring."],
    ["你没有别的事可做吗？", "Haven't you anything better to do?"],
    ["……再看就收费了，转学生。", "...Keep looking and I'll start charging, transfer student."],
    ["领带。又歪了。", "Your tie. Again."],
  ],
  touchLinesHome: [
    ["茶是我的。别想了。", "The tea is mine. Don't even think about it."],
    ["……今晚就别走了，炉火还旺。", "...Stay a while. The fire's still going."],
  ],

  // 第一章：分段播放，1-2 之后出互动选项
  chapters: [
    {
      id: "ch1",
      title: "第一章 · 午夜禁书区",
      titleEn: "The Restricted Section",
      unlockAt: 0,
      reward: 10,
      flow: [
        { clip: "1-1" },
        { clip: "1-2", then: "choice" },
        { branch: { A: "1-2A", B: "1-2B" } },
        { clip: "1-3" },
        { clip: "1-4" },
      ],
    },
    {
      id: "ch2",
      title: "第二章 · 雪夜天文塔",
      titleEn: "The Astronomy Tower",
      unlockAt: 40,
      reward: 10,
      flow: null, // 敬请期待
    },
  ],

  clips: {
    "1-1": { src: "media/1-1.mp4", caps: [[8.2, 11.95, "入学第三天，就敢闯禁书区。", "Third day here, and already sneaking into the Restricted Section."], [12.45, 14.8, "胆子不小啊……对一个转学生来说。", "Bold... for a transfer student."]] },
    "1-2": { src: "media/1-2.mp4", caps: [[4.0, 8.15, "这里不是你该来的地方。", "You shouldn't be here."], [11.65, 14.95, "你看到了什么？", "What did you see?"]] },
    "1-2A": { src: "media/1-2A.mp4", caps: [[2.6, 4.9, "聪明。保持下去。", "Clever. Keep it that way."]] },
    "1-2B": { src: "media/1-2B.mp4", caps: [[2.0, 4.5, "……那你最好在天亮之前忘掉。", "...Then you'd best forget it before dawn."]] },
    "1-3": { src: "media/1-3.mp4", caps: [[4.7, 6.35, "诺克斯。", "Nox."], [6.95, 9.25, "别动。", "Don't. Move."]] },
    "1-4": { src: "media/1-4.mp4", caps: [[4.3, 5.95, "今晚，你什么都没看到。", "You saw nothing tonight."], [6.5, 9.0, "……还有，把领带系好。别丢斯莱特林的脸。", "...And fix your tie. You're embarrassing Slytherin."]] },
    "D4": { caps: [[1.5, 3.7, "别盯着我看。", "Stop staring."]] },
  },

  // 相册：CCD 直闪"偷拍"，随好感度解锁。照片由图像模型直接生成（4:3、白边相纸、自带日期戳），
  // 所以 overlay: false；如果换成不带日期戳的图，删掉这一项，程序会自己叠加日期
  album: [
    { id: "p1", src: "media/album/p1.jpg", unlockAt: 10, overlay: false, date: "26.10.31", where: "禁书区", zh: "……拍好了。不许删。", en: "…There. Don't you dare delete it." },
    { id: "p2", src: "media/album/p2.jpg", unlockAt: 20, overlay: false, date: "26.11.02", where: "书架之间", zh: "……这张，不许给任何人看。", en: "…No one sees this one." },
    { id: "p3", src: "media/album/p3.jpg", unlockAt: 35, overlay: false, date: "26.11.14", where: "村里的小酒馆", zh: "别习惯了。", en: "Don't get used to it." },
    { id: "p4", src: "media/album/p4.jpg", unlockAt: 50, overlay: false, date: "26.11.30", where: "公共休息室", zh: "你又在拍。", en: "You're doing it again." },
    { id: "p5", src: "media/album/p5.jpg", unlockAt: 65, overlay: false, date: "26.12.21", where: "壁炉边", zh: "茶是我的。人……也可以算你的。", en: "The tea is mine. I… could be yours." },
    { id: "p6", src: "media/album/p6.jpg", unlockAt: 80, overlay: false, date: "26.12.31", where: "天文塔", zh: "领带。又歪了。过来。", en: "Your tie. Again. Come here." },
  ],

  // 冥想盆里的回忆条目
  memories: [
    { id: "1-1", name: "初遇", en: "The First Night", clip: "1-1" },
    { id: "1-2", name: "杖尖", en: "Wand to the Throat", clip: "1-2" },
    { id: "1-2A", name: "聪明的回答", en: "A Clever Answer", clip: "1-2A" },
    { id: "1-2B", name: "蛇的秘密", en: "The Serpent's Secret", clip: "1-2B" },
    { id: "1-3", name: "书架之间", en: "Between the Shelves", clip: "1-3" },
    { id: "1-4", name: "领带", en: "Fix Your Tie", clip: "1-4" },
  ],

  affection: {
    max: 100,
    dailyVisit: 3,
    touch: 1,
    touchCooldownSec: 45,
    choiceBonus: { A: 1, B: 3 },
  },

  // 称呼随好感度变化
  callNames: [
    [0, "她叫你：转学生"],
    [20, "她叫你：你"],
    [40, "她叫你：笨蛋"], // 入学登记做好以后换成你的名字（见 TODO）
  ],

  // 待机节奏（秒）
  idleHoldMin: 10,
  idleHoldMax: 24,
  nightHour: 23, // 23 点后她会睡着
};

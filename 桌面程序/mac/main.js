// 马尔福小姐 · macOS 动态桌面
// 壁纸窗口：type "desktop"，位于桌面图标之下，只负责播放；
// 互动窗口：从菜单栏打开，铺满屏幕，可以点她、看剧情、换装；Esc 退回壁纸。
const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain } = require("electron");
const path = require("path");

const PAGE = path.join(__dirname, "web", "index.html");
const PRELOAD = path.join(__dirname, "preload.js");
let wall = null, inter = null, tray = null;

function bounds() {
  return screen.getPrimaryDisplay().bounds;
}

function createWall(enter) {
  const b = bounds();
  wall = new BrowserWindow({
    ...b,
    type: "desktop",
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    enableLargerThanScreen: true,
    backgroundColor: "#000000",
    webPreferences: { preload: PRELOAD, backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" },
  });
  wall.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  const query = { mode: "wallpaper" };
  if (!enter) query.noenter = "1";
  wall.loadFile(PAGE, { query });
  wall.on("closed", () => (wall = null));
}

function openInteractive() {
  if (inter) return inter.focus();
  if (wall) wall.close();
  const b = screen.getPrimaryDisplay().workArea;
  inter = new BrowserWindow({
    ...b,
    frame: false,
    resizable: false,
    backgroundColor: "#000000",
    webPreferences: { preload: PRELOAD, autoplayPolicy: "no-user-gesture-required" },
  });
  inter.loadFile(PAGE, { query: { mode: "interactive", noenter: "1" } });
  inter.on("closed", () => {
    inter = null;
    if (!wall) createWall(false);
    buildMenu();
  });
  app.focus({ steal: true });
  buildMenu();
}

function exitInteractive() {
  if (inter) inter.close();
}

function buildMenu() {
  const login = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Miss Malfoy · 马尔福小姐", enabled: false },
      { type: "separator" },
      inter
        ? { label: "回到壁纸模式（Esc）", click: exitInteractive }
        : { label: "和她互动…", click: openInteractive },
      { label: "重新入场", click: () => { if (wall) { wall.close(); createWall(true); } } },
      { type: "separator" },
      { label: "开机时自动启动", type: "checkbox", checked: login, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
      { label: "退出", role: "quit" },
    ])
  );
}

app.whenReady().then(() => {
  if (app.dock) app.dock.hide();
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle("🐍");
  tray.setToolTip("Miss Malfoy");
  buildMenu();
  createWall(true);
  ipcMain.on("exit-interactive", exitInteractive);
  screen.on("display-metrics-changed", () => {
    if (wall) wall.setBounds(bounds());
  });
});

app.on("window-all-closed", () => {}); // 常驻菜单栏，不随窗口关闭退出

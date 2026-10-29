# 马尔福桌面 · DeepSeek Harness 主题

[马尔福桌面](https://github.com/op7418/malfoy-desktop) 的 DeepSeek Harness（dsh）插件：整个 dsh 窗口换成斯莱特林公共休息室的动态视频，马尔福小姐躺在沙发上看书，陪你干活。

<img src="https://raw.githubusercontent.com/op7418/malfoy-desktop/main/plugins/dsh-malfoy-desktop/screenshots/1-hero.jpg" alt="新会话" width="720" />

| 开场的飞路火 | 对话中 | 侧栏「休息室」 |
|---|---|---|
| <img src="https://raw.githubusercontent.com/op7418/malfoy-desktop/main/plugins/dsh-malfoy-desktop/screenshots/2-floo.jpg" alt="开场" /> | <img src="https://raw.githubusercontent.com/op7418/malfoy-desktop/main/plugins/dsh-malfoy-desktop/screenshots/3-chat.jpg" alt="对话中" /> | <img src="https://raw.githubusercontent.com/op7418/malfoy-desktop/main/plugins/dsh-malfoy-desktop/screenshots/4-room.jpg" alt="休息室" /> |

- **开场**：每天第一次打开，黑幕上浮出标题，绿色的飞路火从壁炉烧过整个屏幕，烧过的地方界面出来；之后再打开只有一次短的火焰转场。点黑幕可以跳过。
- **新会话**：休息室清晰地铺在背后，输入框是一块深色玻璃，空白页的标语换成她的一句话。点她会回你一句。
- **对话中**：背景虚焦压暗，不挡字。agent 做完一轮或者等你批准时，焦点拉回来一下，她抬头，输入框上方出一句台词；出错时只说一句。
- **侧栏「休息室」**：走进房间，剧情（第一章《午夜禁书区》）、冥想盆回忆、相册、换装都在这里。
- **配色**：斯莱特林的墨绿和银，直角，只有暗色模式。

## 安装

视频不在 Git 仓库里，请从 [Releases](https://github.com/op7418/malfoy-desktop/releases) 装预构建包（约 400 MB）：

```sh
dsh plugin --profile web add https://github.com/op7418/malfoy-desktop/releases/latest/download/dsh-malfoy-desktop.tgz
dsh web
```

也可以在 dsh 的「插件」页里用这个链接安装。卸载：`dsh plugin --profile web remove dsh-malfoy-desktop`。

目前只在 dsh 0.2.1-rc.2 的网页版上测过。

## English

A DeepSeek Harness theme from [Malfoy Desktop](https://github.com/op7418/malfoy-desktop). The whole window becomes a live video of the Slytherin common room. A green Floo fire burns the interface in on launch, the room blurs while you chat, and Miss Malfoy looks up with a line when the agent finishes, asks for approval, or fails. The sidebar gains a 「休息室」 (common room) entry with the story chapter, memories, album and outfits.

The videos are not in Git. Install the prebuilt package from Releases (about 400 MB):

```sh
dsh plugin --profile web add https://github.com/op7418/malfoy-desktop/releases/latest/download/dsh-malfoy-desktop.tgz
```

Tested only on dsh 0.2.1-rc.2 (web).

## 开发

- `lib/index.js`：Host 半边
  - `/malfoy/app/` 提供 `web/`（即 `桌面程序/app/`）的网页和视频，支持 Range
  - `/malfoy/events` 用 SSE 推 agent 状态：busy / idle / done / approval / error
  - 首屏注入黑幕，留给开场动画
- `lib/client.js`：浏览器半边：主题配色、休息室背景（iframe 加载 `app/index.html?mode=dsh`）、飞路火开场、对话时虚化、侧栏「休息室」
- `web`：开发时是指向 `../../桌面程序/app` 的软链接，打包时换成带视频的真实目录

本地开发：`dsh plugin --profile web add <绝对路径>/plugins/dsh-malfoy-desktop`（需要 pnpm，素材按 [MEDIA.md](../../MEDIA.md) 放好）。打包：在仓库根目录执行 `工具/pack-dsh.sh`，输出 `release/dsh-malfoy-desktop.tgz`。

除了官方 slot 和 token，还依赖了 dsh 界面的几个 DOM 标记。dsh 升级后先检查这几处：
- `data-content-phase`：判断是空白页还是对话中
- `data-conversation-scroll`、`data-composer-seat`、`data-composer-card`：对话区和输入框
- `[class*="composerStack"]`：空白页的标语
- `[data-rightbar-collapsed] > :first-child`：侧栏

## 许可

[PolyForm Noncommercial 1.0.0](../../LICENSE)。视频、图片、音乐和台词是我们自己的作品，只随安装包分发，不得单独拆出使用。

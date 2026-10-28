# 素材说明

这个仓库只包含代码。视频、图片、音乐、剧本和文章都是我们自己的作品，**不公开**。

想直接体验，用下面的安装包，里面已经带好了运行需要的素材：

| 文件 | 内容 |
| --- | --- |
| [Releases](https://github.com/op7418/malfoy-desktop/releases) 里的 `Miss-Malfoy-mac-arm64.dmg` | macOS 桌面程序（Apple Silicon，未签名） |
| Wallpaper Engine 创意工坊（即将上线） | Windows 版 |

## 从源码运行需要哪些素材

代码按下面的路径读取素材。想用自己的素材跑起来，按同样的文件名放进去即可：

| 路径 | 内容 | 谁在用 |
| --- | --- | --- |
| `桌面程序/app/media/` | `D1.mp4`…`D7.mp4`（4K 桌面动作）、`ambient-*.mp4`（静止循环）、`1-1.mp4`…`1-4.mp4` 和 `1-2A.mp4`、`1-2B.mp4`（剧情）、`anchor-*.jpg`、`empty-sofa.jpg`、`sleep-sofa.jpg`、`choice-bg.jpg`、`bgm.mp3`、`album/p1.jpg`…`p6.jpg` | 桌面程序 |
| `剪辑/assets/video/`、`剪辑/assets/music/`、`剪辑/assets/img/`、`剪辑/assets/fx/` | 1080P 剧情片段、配乐、尾帧和转场贴图 | 剧情正片 |
| `宣传片/assets/video/`、`宣传片/assets/music/`、`宣传片/assets/img/`、`宣传片/assets/fx/` | 同上 | 宣传片 |

每个文件具体怎么生成、参数是什么，见 [技术文档.md](技术文档.md)。

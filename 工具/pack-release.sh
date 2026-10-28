#!/bin/bash
# 打包要上传到 GitHub Release 的安装包，输出到 release/
#   Miss-Malfoy-mac-arm64.dmg         macOS 桌面程序
#   Miss-Malfoy-WallpaperEngine.zip   Windows 版（Wallpaper Engine 网页壁纸工程，含运行所需素材）
# 素材包和成片不公开，不在这里打包。
# 用法：在仓库根目录执行  工具/pack-release.sh [dmg 所在目录，默认取最新的 桌面程序/mac/dist-v*]
set -e
cd "$(dirname "$0")/.."
OUT=release; mkdir -p "$OUT"
DIST=${1:-$(ls -d 桌面程序/mac/dist-v* | sort -V | tail -1)}
cp "$DIST"/*.dmg "$OUT/Miss-Malfoy-mac-arm64.dmg"
rm -rf "$OUT/wallpaper-engine" && mkdir -p "$OUT/wallpaper-engine"
cp -R 桌面程序/app/. "$OUT/wallpaper-engine/"
cp 桌面程序/wallpaper-engine/project.json 桌面程序/wallpaper-engine/preview.jpg "$OUT/wallpaper-engine/"
(cd "$OUT" && rm -f Miss-Malfoy-WallpaperEngine.zip && zip -r -q Miss-Malfoy-WallpaperEngine.zip wallpaper-engine -x "*.DS_Store" && rm -rf wallpaper-engine)
ls -lh "$OUT"

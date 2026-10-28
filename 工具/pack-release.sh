#!/bin/bash
# 打包安装包，输出到 release/
#   Miss-Malfoy-mac-arm64.dmg         macOS 桌面程序 → 上传到 GitHub Release
#   Miss-Malfoy-WallpaperEngine.zip   Windows 版工程 → 只用于拷到 Windows 电脑上，在编辑器里发布到创意工坊，不上传 Release
# 素材包和成片不公开，不在这里打包。
# 用法：在仓库根目录执行  工具/pack-release.sh [dmg 所在目录，默认取最新的 桌面程序/mac/dist-v*]
set -e
cd "$(dirname "$0")/.."
OUT=release; mkdir -p "$OUT"
DIST=${1:-$(ls -d 桌面程序/mac/dist-v* | sort -V | tail -1)}
cp "$DIST"/*.dmg "$OUT/Miss-Malfoy-mac-arm64.dmg"
rm -rf "$OUT/wallpaper-engine" && mkdir -p "$OUT/wallpaper-engine"
# Wallpaper Engine 放不了 H.264 / AAC / MP3：先用 桌面程序/tools/make-webm.sh 转好，这里只拷 WebM / Ogg
桌面程序/tools/make-webm.sh
rsync -a --exclude "media/*.mp4" --exclude "media/*.mp3" --exclude ".DS_Store" 桌面程序/app/ "$OUT/wallpaper-engine/"
cp 桌面程序/wallpaper-engine/media/*.webm 桌面程序/wallpaper-engine/media/*.ogg "$OUT/wallpaper-engine/media/"
cp 桌面程序/wallpaper-engine/project.json 桌面程序/wallpaper-engine/preview.gif 桌面程序/wallpaper-engine/preview.jpg "$OUT/wallpaper-engine/"
(cd "$OUT" && rm -f Miss-Malfoy-WallpaperEngine.zip && zip -r -q Miss-Malfoy-WallpaperEngine.zip wallpaper-engine -x "*.DS_Store" && rm -rf wallpaper-engine)
ls -lh "$OUT"

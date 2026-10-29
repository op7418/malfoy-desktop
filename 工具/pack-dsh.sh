#!/bin/bash
# 打包 DeepSeek Harness 插件，输出 release/dsh-malfoy-desktop.tgz（文件名不带版本号，Release 的 latest/download 链接才不会失效）
# 插件目录里的 web/ 是指向 桌面程序/app 的软链接，这里换成带视频的真实目录再 npm pack。
# 用法：在仓库根目录执行  工具/pack-dsh.sh
set -e
cd "$(dirname "$0")/.."
SRC=plugins/dsh-malfoy-desktop
OUT=release; mkdir -p "$OUT"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
rsync -a --exclude web --exclude ".DS_Store" "$SRC/" "$STAGE/"
rsync -a --exclude ".DS_Store" 桌面程序/app/ "$STAGE/web/"
cp LICENSE "$STAGE/"
test -f "$STAGE/web/media/D1.mp4" || { echo "缺少素材：桌面程序/app/media/（见 MEDIA.md）"; exit 1; }
TGZ=$(cd "$STAGE" && npm pack --silent --pack-destination "$OLDPWD/$OUT")
mv "$OUT/$TGZ" "$OUT/dsh-malfoy-desktop.tgz"
ls -lh "$OUT/dsh-malfoy-desktop.tgz"

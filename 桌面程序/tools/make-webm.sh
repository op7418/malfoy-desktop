#!/bin/bash
# Wallpaper Engine 的内置 Chromium（CEF）不带 H.264 / AAC / MP3 解码器，
# 视频要转成 WebM（VP9 + Opus），BGM 转成 Ogg Opus。macOS 版仍用 app/media 里的 MP4。
# 用法：tools/make-webm.sh [输入目录，默认 app/media] [输出目录，默认 wallpaper-engine/media]
set -e
cd "$(dirname "$0")/.."
IN=${1:-app/media}; OUT=${2:-wallpaper-engine/media}
mkdir -p "$OUT"
enc() {
  local f=$1 out=$2/$(basename "${1%.mp4}").webm
  [ -f "$out" ] && [ "$out" -nt "$f" ] && return
  local w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")
  local crf=31; [ "$w" -ge 3000 ] && crf=30
  ffmpeg -loglevel error -y -i "$f" -map 0:v:0 -map 0:a:0? -c:v libvpx-vp9 -crf $crf -b:v 0 -pix_fmt yuv420p \
    -deadline good -cpu-used 4 -row-mt 1 -tile-columns 2 -threads 4 \
    -c:a libopus -b:a 160k "$out.tmp.webm" && mv "$out.tmp.webm" "$out"
  echo "done $out"
}
export -f enc
ls "$IN"/*.mp4 | xargs -P 4 -I{} bash -c 'enc "$@"' _ {} "$OUT"
ffmpeg -loglevel error -y -i "$IN/bgm.mp3" -vn -c:a libopus -b:a 128k "$OUT/bgm.ogg"
echo "done $OUT/bgm.ogg"

#!/bin/bash
# 用法：cine.sh 火光来源.mp4 底图来源.mp4 输出.mp4 x:y:w:h 循环秒数
set -e
S=$(dirname "$0"); src=$1; base=$2; out=$3; box=$4; L=$5; d=1
IFS=: read bx by bw bh <<< "$box"
E=$(python3 -c "print($L+$d)"); F=$(python3 -c "print($L-$d)")
ffmpeg -v error -y -ss ${6:-0} -i "$base" -frames:v 1 "$S/base.png"
ffmpeg -v error -y -f lavfi -i "color=black:s=3840x2160:d=1" -vf "drawbox=x=${bx}:y=${by}:w=${bw}:h=${bh}:color=white:t=fill,gblur=sigma=60" -frames:v 1 -pix_fmt gray "$S/mask.png"
ffmpeg -v error -y -loop 1 -t $L -i "$S/base.png" -i "$src" -loop 1 -t $L -i "$S/mask.png" -filter_complex "
  [1:v]trim=0:${E},setpts=PTS-STARTPTS,split[s1][s0];
  [s1]trim=${d}:${E},setpts=PTS-STARTPTS[late];
  [s0]trim=0:${d},setpts=PTS-STARTPTS+${F}/TB,format=yuva420p,fade=t=in:st=${F}:d=${d}:alpha=1[early];
  [late][early]overlay=eof_action=pass,format=yuv420p[fire];
  [fire]format=yuva420p[firea];[2:v]format=gray[m];[firea][m]alphamerge[firem];
  [0:v]format=yuv420p[b];[b][firem]overlay=shortest=1,format=yuv420p" -r 24 -t $L -c:v libx264 -preset slow -crf 14 -g 48 -movflags +faststart -an "$out"

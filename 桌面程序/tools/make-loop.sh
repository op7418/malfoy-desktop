#!/bin/bash
# 把一段"环境在动、人不动"的生成视频做成无缝循环（避开画质下降的尾帧）
# 用法：make-loop.sh 输入.mp4 输出.mp4 循环秒数 交叉淡化秒数
# 输出第 t 秒 = 输入第 t+d 秒；最后 d 秒与输入开头 d 秒交叉淡化，所以输出的结尾正好接回开头。
set -e
in=$1; out=$2; L=$3; d=$4
E=$(python3 -c "print($L+$d)"); F=$(python3 -c "print($L-$d)")
ffmpeg -v error -y -i "$in" -filter_complex "
  [0:v]trim=0:${E},setpts=PTS-STARTPTS,split[a][b];
  [a]trim=${d}:${E},setpts=PTS-STARTPTS[late];
  [b]trim=0:${d},setpts=PTS-STARTPTS+${F}/TB,format=yuva420p,fade=t=in:st=${F}:d=${d}:alpha=1[early];
  [late][early]overlay=eof_action=pass,format=yuv420p" -t $L -r 24 -c:v libx264 -preset slow -crf 14 -g 48 -movflags +faststart -an "$out"

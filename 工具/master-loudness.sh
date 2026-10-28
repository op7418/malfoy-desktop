#!/bin/bash
# 用法：master.sh 输入.mp4 输出.mp4   两遍 loudnorm，-15 LUFS / -1 dBTP，视频直接拷贝
in="$1"; out="$2"
j=$(ffmpeg -hide_banner -nostats -i "$in" -af loudnorm=I=-15:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$j" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i "$in" -c:v copy -af "loudnorm=I=-15:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" -ar 48000 -c:a aac -b:a 320k -movflags +faststart "$out"

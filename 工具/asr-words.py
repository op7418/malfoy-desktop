import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
out = {}
for p in sys.argv[1:]:
    segs, _ = m.transcribe(p, language="en", word_timestamps=True, vad_filter=False)
    name = p.split('/')[-1][:-4]
    out[name] = []
    for s in segs:
        out[name].append({"s": round(s.start,2), "e": round(s.end,2), "t": s.text.strip(),
                          "w": [(round(w.start,2), round(w.end,2), w.word) for w in s.words]})
        print(name, round(s.start,2), round(s.end,2), s.text.strip(), flush=True)
json.dump(out, open(sys.argv[0].replace('asr.py','asr.json'),'w'), ensure_ascii=False, indent=1)

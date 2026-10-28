import sys
from faster_whisper import WhisperModel
m = WhisperModel(sys.argv[2], device="cpu", compute_type="int8")
segs,_ = m.transcribe(sys.argv[1], language="en", vad_filter=False, word_timestamps=False)
for s in segs: print(round(s.start,1), round(s.end,1), s.text.strip(), flush=True)

import subprocess, numpy as np, sys
f, out = sys.argv[1], sys.argv[2]
w, h = 480, 270
raw = subprocess.run(["ffmpeg","-v","error","-i",f,"-vf",f"scale={w}:{h}","-f","rawvideo","-pix_fmt","gray","-"],capture_output=True).stdout
a = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
sd = a.std(0)
img = np.clip(sd * 8, 0, 255).astype(np.uint8)
subprocess.run(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","gray","-s",f"{w}x{h}","-i","-",out],input=img.tobytes())
print(f, a.shape)

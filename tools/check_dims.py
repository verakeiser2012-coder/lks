import subprocess, os
FFPROBE = r"C:\Users\User\Desktop\site\tools\ffmpeg-9.0-essentials_build\bin\ffprobe.exe"
files = ['VID_20260731_111149.mp4','VID_20260731_114125.mp4','VID_20260731_131015.mp4']
root = r'E:\КАРЬЕРА!!!!!\2026\подкаст Груша 31 июля 2026'
for f in files:
    p = os.path.join(root, f)
    r = subprocess.run([FFPROBE,'-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0', p], capture_output=True, text=True)
    print(f, '->', r.stdout.strip())

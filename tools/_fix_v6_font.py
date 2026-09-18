import io, re, os, shutil
APPS = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "Apps")
ver = sorted(x for x in os.listdir(APPS) if re.match(r"^\d+(\.\d+)+$", x))[-1]
v6 = os.path.join(os.environ["LOCALAPPDATA"], "CapCut", "User Data", "Projects", "com.lveditor.draft", "Груша_v6_кино", "draft_content.json")
shutil.copy(v6, v6 + ".pre_fontfix")
t = io.open(v6, encoding="utf-8").read(); t2 = re.sub(r"Apps/\d+(?:\.\d+)+/", "Apps/%s/" % ver, t)
io.open(v6, "w", encoding="utf-8").write(t2)
print("v6: old refs", t.count("9.2.0.3931"), "->", t2.count("9.2.0.3931"), "| now", ver)

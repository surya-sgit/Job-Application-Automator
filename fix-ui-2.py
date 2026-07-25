import os

files_to_fix = [
    "components/Tracker.tsx",
    "components/QualityReport.tsx",
    "components/ResumeEditor.tsx",
    "components/TailorApp.tsx"
]

replacements = {
    "bg-white/10/50": "bg-white/5",
    "border-white/10/60": "border-white/5",
    "border-white/10/80": "border-white/5",
    "border-white/20/60": "border-white/5",
    "bg-dark-800/50/50": "bg-dark-800/20",
    "shadow-xl/80": "shadow-xl"
}

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r") as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(file_path, "w") as f:
        f.write(content)

print("Double slash UI fixes applied!")

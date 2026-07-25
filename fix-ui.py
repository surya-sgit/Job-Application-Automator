import os

files_to_fix = [
    "components/Tracker.tsx",
    "components/QualityReport.tsx",
    "components/ResumeEditor.tsx",
    "components/TailorApp.tsx"
]

replacements = {
    "bg-white": "bg-dark-800/50",
    "text-slate-800": "text-slate-100",
    "text-slate-700": "text-slate-200",
    "text-slate-600": "text-slate-300",
    "text-slate-500": "text-slate-400",
    "border-slate-200": "border-white/10",
    "border-slate-200/60": "border-white/10",
    "border-slate-200/80": "border-white/10",
    "border-slate-300": "border-white/20",
    "border-slate-100": "border-white/5",
    "bg-slate-50": "bg-white/5",
    "bg-slate-100": "bg-white/10",
    "bg-slate-100/50": "bg-white/5",
    "hover:bg-slate-50": "hover:bg-white/10",
    "hover:bg-slate-100": "hover:bg-white/20",
    "hover:border-slate-300": "hover:border-white/20",
    "border-indigo-200": "border-brand-500/30",
    "ring-indigo-50/50": "ring-brand-500/20",
    "bg-indigo-50/50": "bg-brand-500/10",
    "bg-blue-50": "bg-brand-500/20",
    "text-blue-500": "text-brand-400",
    "bg-emerald-50": "bg-emerald-500/20",
    "text-emerald-500": "text-emerald-400",
    "bg-amber-50": "bg-amber-500/20",
    "text-amber-500": "text-amber-400",
    "bg-amber-600": "bg-amber-500",
    "text-amber-600": "text-amber-400",
    "text-amber-800": "text-amber-200",
    "border-amber-200": "border-amber-500/30",
    "bg-red-50": "bg-red-500/20",
    "text-red-500": "text-red-400",
    "hover:text-slate-700": "hover:text-slate-200",
    "bg-white/50": "bg-white/5",
    "bg-white/80": "bg-dark-900/80",
    "shadow-sm": "shadow-xl",
    "shadow-md": "shadow-2xl",
    "bg-slate-50/50": "bg-transparent",
    "text-slate-900": "text-white",
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

print("UI fixes applied!")

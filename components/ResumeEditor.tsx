"use client";

import { useState } from "react";
import type { TailoredResume, ParsedProfile } from "@/lib/resumeSchema";
import TextareaAutosize from "react-textarea-autosize";
import { Lock, Sparkles, Undo2, ChevronDown, ChevronUp, Eye, Edit2, X } from "lucide-react";
import DiffViewer from "./DiffViewer";
import QualityReport from "./QualityReport";
import type { JdAnalysis } from "@/lib/resumeSchema";
import LayoutManager from "./LayoutManager";

interface Props {
  draftResume: TailoredResume;
  jdAnalysis: JdAnalysis | null;
  originalResume: TailoredResume | ParsedProfile | null;
  defaultLayout: string[];
  defaultHiddenSections: string[];
  onSave: (edited: TailoredResume, layout: string[], hiddenSections: string[], syncSkills?: boolean) => void;
  onCancel: () => void;
}

type SkillGroup = { category: string, items: string[] };

function arrayToStr(arr: SkillGroup[] = []): string {
  return arr.map(g => `${g.category}:\n${g.items.join(", ")}`).join("\n\n");
}

function strToArray(str: string): SkillGroup[] {
  const arr: SkillGroup[] = [];
  const blocks = str.split(/\n\n+/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.trim().split("\n");
    if (lines.length === 1) {
      const existing = arr.find(a => a.category === "Other");
      const items = lines[0].split(",").map(s => s.trim()).filter(Boolean);
      if (existing) existing.items.push(...items);
      else arr.push({ category: "Other", items });
    } else {
      let cat = lines[0].replace(/:$/, "").trim();
      if (!cat) cat = "Other";
      const items = lines.slice(1).join(" ").split(",").map(s => s.trim()).filter(Boolean);
      const existing = arr.find(a => a.category === cat);
      if (existing) existing.items.push(...items);
      else arr.push({ category: cat, items });
    }
  }
  return arr;
}

export default function ResumeEditor({ draftResume, jdAnalysis, originalResume, defaultLayout, defaultHiddenSections, onSave, onCancel }: Props) {
  const [edited, setEdited] = useState<TailoredResume>(JSON.parse(JSON.stringify(draftResume)));
  const [viewMode, setViewMode] = useState<"diff" | "edit">("diff");
  const [syncSkills, setSyncSkills] = useState(true);
  
  // Layout state
  const [layout, setLayout] = useState<string[]>(defaultLayout);
  const [hiddenSections, setHiddenSections] = useState<string[]>(defaultHiddenSections);

  const applySuggestedLayout = () => {
    const newLayout = [...layout];
    const newHidden = new Set(hiddenSections);
    
    // Hide empty sections automatically
    if (!edited.projects || edited.projects.length === 0) newHidden.add("projects");
    if (!edited.certifications || edited.certifications.length === 0) newHidden.add("certifications");
    if (!edited.achievements || edited.achievements.length === 0) newHidden.add("achievements");

    // Reorder based on JD Analysis
    const isJunior = jdAnalysis?.seniority?.toLowerCase().includes("junior") || jdAnalysis?.seniority?.toLowerCase().includes("entry");
    if (isJunior) {
      // Junior roles: Education > Skills > Projects > Experience
      const idealOrder = ["summary", "education", "skills", "projects", "experience", "certifications", "achievements"];
      idealOrder.forEach((section, index) => {
        if (newLayout.includes(section)) {
          newLayout.splice(newLayout.indexOf(section), 1);
          newLayout.push(section);
        }
      });
      setLayout(idealOrder.filter(s => newLayout.includes(s)));
    } else {
      // Senior roles: Experience > Projects > Skills > Education
      const idealOrder = ["summary", "experience", "projects", "skills", "education", "certifications", "achievements"];
      setLayout(idealOrder.filter(s => newLayout.includes(s)));
    }
    setHiddenSections(Array.from(newHidden));
  };
  
  // Accordion state
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set(edited.experience.map((_, i) => i)));
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set(edited.projects.map((_, i) => i)));

  const getOriginalExpBullets = (company: string, originalObj: any) => {
    if (!originalObj || !originalObj.experience) return [];
    const exp = originalObj.experience.find((e: any) => e.company === company);
    return exp?.bullets || [];
  };

  const getOriginalProjBullets = (title: string, originalObj: any) => {
    if (!originalObj || !originalObj.projects) return [];
    const proj = originalObj.projects.find((p: any) => p.title === title);
    return proj?.bullets || [];
  };

  const toggleRole = (index: number) => {
    const next = new Set(expandedRoles);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedRoles(next);
  };

  const toggleProject = (index: number) => {
    const next = new Set(expandedProjects);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedProjects(next);
  };

  // Revert Helpers
  const revertSummary = () => {
    if (originalResume?.summary) {
      setEdited({ ...edited, summary: originalResume.summary });
    }
  };

  const revertSkills = () => {
    if (originalResume?.skills) {
      setEdited({ ...edited, skills: JSON.parse(JSON.stringify(originalResume.skills)) });
    }
  };

  const revertExpBullet = (expIndex: number, bIndex: number, originalBullet: string) => {
    const newExp = [...edited.experience];
    newExp[expIndex].bullets[bIndex] = originalBullet;
    setEdited({ ...edited, experience: newExp });
  };

  const handleAcceptSuggestion = (skill: string, category: string) => {
    const newSkills = [...(edited.skills || [])];
    const catObj = newSkills.find(s => s.category === category);
    if (catObj) {
      if (!catObj.items.includes(skill)) catObj.items.push(skill);
    } else {
      newSkills.push({ category, items: [skill] });
    }
    setEdited({
      ...edited,
      skills: newSkills,
      suggestedSkills: (edited.suggestedSkills || []).filter(s => s !== skill)
    });
  };

  const handleDismissSuggestion = (skill: string) => {
    setEdited({
      ...edited,
      suggestedSkills: (edited.suggestedSkills || []).filter(s => s !== skill)
    });
  };

  const revertProjBullet = (projIndex: number, bIndex: number, originalBullet: string) => {
    const newProj = [...edited.projects];
    newProj[projIndex].bullets[bIndex] = originalBullet;
    setEdited({ ...edited, projects: newProj });
  };

  return (
    <div className="space-y-8 pb-28 relative max-w-5xl mx-auto">
      <QualityReport resume={edited} analysis={jdAnalysis} />
      
      <div className="card space-y-8 border-white/5 shadow-xl shadow-slate-200/40">
        <div>
          <h2 className="font-bold text-2xl text-white mb-2">Review & Edit Draft</h2>
          <p className="text-base text-slate-400">
            Compare your original text on the left with the AI's proposed tweaks on the right. 
            If the AI hallucinated or made a mistake, click the <Undo2 className="inline w-4 h-4 text-slate-400 mx-1" /> icon to instantly revert it.
          </p>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 hidden md:grid items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider pl-1">
            <Lock className="w-4 h-4" /> Original Profile
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand uppercase tracking-wider pl-1">
              <Sparkles className="w-4 h-4" /> AI Draft
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-white/10 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode("diff")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "diff" 
                    ? "bg-dark-800/50 text-brand-600 shadow-xl" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Diff
              </button>
              <button
                onClick={() => setViewMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === "edit" 
                    ? "bg-dark-800/50 text-brand-600 shadow-xl" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-slate-100 border-b pb-2">Professional Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Original Left */}
            <div className="p-4 bg-white/5/50 border border-white/5 rounded-xl text-slate-400 text-sm leading-relaxed shadow-inner">
              <p>{originalResume?.summary || "No summary provided."}</p>
            </div>
            
            {/* Editable Right */}
            <div className="relative group">
              {originalResume?.summary && originalResume.summary !== edited.summary && viewMode === "edit" && (
                <div className="absolute -top-3 right-3 flex items-center gap-2 z-10">
                  <button 
                    onClick={revertSummary}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/50 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[11px] font-medium rounded-full border shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Revert to original"
                  >
                    <Undo2 className="w-3 h-3" /> Revert
                  </button>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100 shadow-xl">
                    <Sparkles className="w-3 h-3" /> AI Tweaked
                  </div>
                </div>
              )}
              {viewMode === "diff" ? (
                <div className="w-full text-sm leading-relaxed p-4 rounded-xl border border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20">
                  <DiffViewer original={originalResume?.summary || ""} modified={edited.summary} />
                </div>
              ) : (
                <TextareaAutosize
                  minRows={3}
                  className={`input w-full text-sm leading-relaxed p-4 rounded-xl resize-none transition-shadow ${
                    originalResume?.summary && originalResume.summary !== edited.summary
                      ? "border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20 focus:border-brand focus:ring-brand/20"
                      : "bg-dark-800/50"
                  }`}
                  value={edited.summary}
                  onChange={(e) => setEdited({ ...edited, summary: e.target.value })}
                />
              )}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-4 pt-4">
          <h3 className="font-semibold text-lg text-slate-100 border-b pb-2">Skills</h3>
          
          {/* Suggested Skills Banner */}
          {edited.suggestedSkills && edited.suggestedSkills.length > 0 && (
            <div className="bg-brand-500/10 border border-brand/30 rounded-xl p-4 space-y-3 mb-4">
              <h4 className="font-medium text-brand">Suggested Skills from Job Description</h4>
              <p className="text-sm text-slate-300">
                The following skills were found in the JD but didn't match your existing categories. Map them to a category to include them in your resume.
              </p>
              <div className="flex flex-wrap gap-2">
                {edited.suggestedSkills.map(skill => (
                  <div key={skill} className="flex items-center gap-2 bg-dark-800/80 px-3 py-1.5 rounded-lg border border-white/5">
                    <span className="text-sm font-medium">{skill}</span>
                    <select 
                      className="text-xs bg-dark text-slate-300 border border-white/10 rounded px-2 py-1 outline-none"
                      onChange={(e) => {
                        if (e.target.value) handleAcceptSuggestion(skill, e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Add to...</option>
                      {(edited.skills || []).map(c => (
                        <option key={c.category} value={c.category}>{c.category}</option>
                      ))}
                      <option value="Other">New "Other" Category</option>
                    </select>
                    <button onClick={() => handleDismissSuggestion(skill)} className="text-slate-500 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white/5/50 border border-white/5 rounded-xl text-slate-400 text-sm leading-relaxed shadow-inner">
              <p className="whitespace-pre-wrap">{originalResume?.skills ? arrayToStr(originalResume.skills as any) : "No skills provided."}</p>
            </div>
            
            <div className="relative group">
              {originalResume?.skills && arrayToStr(originalResume.skills as any) !== arrayToStr(edited.skills as any) && viewMode === "edit" && (
                <div className="absolute -top-3 right-3 flex items-center gap-2 z-10">
                  <button 
                    onClick={revertSkills}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/50 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[11px] font-medium rounded-full border shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Revert to original"
                  >
                    <Undo2 className="w-3 h-3" /> Revert
                  </button>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100 shadow-xl">
                    <Sparkles className="w-3 h-3" /> AI Tweaked
                  </div>
                </div>
              )}
              {viewMode === "diff" ? (
                <div className="w-full text-sm leading-relaxed p-4 rounded-xl border border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20">
                  <DiffViewer original={originalResume?.skills ? arrayToStr(originalResume.skills as any) : ""} modified={arrayToStr(edited.skills as any)} />
                </div>
              ) : (
                <TextareaAutosize
                  minRows={3}
                  className={`input w-full text-sm leading-relaxed p-4 rounded-xl resize-none transition-shadow ${
                    originalResume?.skills && arrayToStr(originalResume.skills as any) !== arrayToStr(edited.skills as any)
                      ? "border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20 focus:border-brand focus:ring-brand/20"
                      : "bg-dark-800/50"
                  }`}
                  value={arrayToStr(edited.skills as any)}
                  onChange={(e) => setEdited({ ...edited, skills: strToArray(e.target.value) as any })}
                  placeholder="Programming:\nPython, TypeScript"
                />
              )}
            </div>
          </div>
        </div>

        {/* Experience */}
        {edited.experience.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg text-slate-100 border-b pb-2">Experience</h3>
            {edited.experience.map((exp, expIndex) => {
              const origBullets = getOriginalExpBullets(exp.company, originalResume);
              const isExpanded = expandedRoles.has(expIndex);
              
              return (
                <div key={expIndex} className="border border-white/5 rounded-2xl overflow-hidden bg-dark-800/50 shadow-xl hover:shadow-2xl transition-shadow">
                  <button 
                    className="w-full flex items-center justify-between p-5 bg-white/5/80 hover:bg-white/10/80 transition-colors text-left"
                    onClick={() => toggleRole(expIndex)}
                  >
                    <div>
                      <h4 className="font-bold text-slate-100 text-lg">{exp.title}</h4>
                      <p className="text-sm font-medium text-brand/80">{exp.company}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-dark-800/50 flex items-center justify-center shadow-xl border border-white/10 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-5 space-y-6 border-t border-white/5 bg-dark-800/50">
                      {exp.bullets.map((bullet, bIndex) => {
                        const originalBullet = origBullets[bIndex];
                        const isModified = originalBullet && originalBullet !== bullet;
                        
                        return (
                          <div key={bIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start relative group">
                            {/* Left: Original */}
                            <div className={`p-4 rounded-xl border text-sm leading-relaxed transition-all ${
                              isModified 
                                ? 'bg-white/5/50 border-white/5 text-slate-400 shadow-inner' 
                                : 'bg-transparent border-transparent text-slate-400'
                            }`}>
                              {originalBullet || <span className="italic text-slate-300">No original bullet point</span>}
                            </div>
                            
                            {/* Right: Editable */}
                            <div className="relative">
                              {isModified && viewMode === "edit" && (
                                <div className="absolute -top-3 right-3 flex items-center gap-2 z-10">
                                  <button 
                                    onClick={() => revertExpBullet(expIndex, bIndex, originalBullet)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/50 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[11px] font-medium rounded-full border shadow-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Revert to original"
                                  >
                                    <Undo2 className="w-3 h-3" /> Revert
                                  </button>
                                  <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100 shadow-xl">
                                    <Sparkles className="w-3 h-3" /> AI Tweaked
                                  </div>
                                </div>
                              )}
                              {viewMode === "diff" ? (
                                <div className={`w-full text-sm leading-relaxed p-4 rounded-xl border ${isModified ? 'border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20' : 'border-transparent bg-dark-800/20'}`}>
                                  <DiffViewer original={originalBullet || ""} modified={bullet} />
                                </div>
                              ) : (
                                <TextareaAutosize
                                  minRows={2}
                                  className={`input w-full text-sm leading-relaxed p-4 rounded-xl resize-none transition-shadow ${
                                    isModified 
                                      ? 'border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20 focus:border-brand focus:ring-brand/20' 
                                      : 'bg-dark-800/50 hover:border-white/20'
                                  }`}
                                  value={bullet}
                                  onChange={(e) => {
                                    const newExp = [...edited.experience];
                                    newExp[expIndex].bullets[bIndex] = e.target.value;
                                    setEdited({ ...edited, experience: newExp });
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Projects */}
        {edited.projects.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg text-slate-100 border-b pb-2">Projects</h3>
            {edited.projects.map((proj, projIndex) => {
              const origBullets = getOriginalProjBullets(proj.title, originalResume);
              const isExpanded = expandedProjects.has(projIndex);
              
              return (
                <div key={projIndex} className="border border-white/5 rounded-2xl overflow-hidden bg-dark-800/50 shadow-xl hover:shadow-2xl transition-shadow">
                  <button 
                    className="w-full flex items-center justify-between p-5 bg-white/5/80 hover:bg-white/10/80 transition-colors text-left"
                    onClick={() => toggleProject(projIndex)}
                  >
                    <h4 className="font-bold text-slate-100 text-lg">{proj.title}</h4>
                    <div className="w-8 h-8 rounded-full bg-dark-800/50 flex items-center justify-center shadow-xl border border-white/10 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-5 space-y-6 border-t border-white/5 bg-dark-800/50">
                      {proj.bullets.map((bullet, bIndex) => {
                        const originalBullet = origBullets[bIndex];
                        const isModified = originalBullet && originalBullet !== bullet;
                        
                        return (
                          <div key={bIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start relative group">
                            {/* Left: Original */}
                            <div className={`p-4 rounded-xl border text-sm leading-relaxed transition-all ${
                              isModified 
                                ? 'bg-white/5/50 border-white/5 text-slate-400 shadow-inner' 
                                : 'bg-transparent border-transparent text-slate-400'
                            }`}>
                              {originalBullet || <span className="italic text-slate-300">No original bullet point</span>}
                            </div>
                            
                            {/* Right: Editable */}
                            <div className="relative">
                              {isModified && viewMode === "edit" && (
                                <div className="absolute -top-3 right-3 flex items-center gap-2 z-10">
                                  <button 
                                    onClick={() => revertProjBullet(projIndex, bIndex, originalBullet)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/50 hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[11px] font-medium rounded-full border shadow-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Revert to original"
                                  >
                                    <Undo2 className="w-3 h-3" /> Revert
                                  </button>
                                  <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100 shadow-xl">
                                    <Sparkles className="w-3 h-3" /> AI Tweaked
                                  </div>
                                </div>
                              )}
                              {viewMode === "diff" ? (
                                <div className={`w-full text-sm leading-relaxed p-4 rounded-xl border ${isModified ? 'border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20' : 'border-transparent bg-dark-800/20'}`}>
                                  <DiffViewer original={originalBullet || ""} modified={bullet} />
                                </div>
                              ) : (
                                <TextareaAutosize
                                  minRows={2}
                                  className={`input w-full text-sm leading-relaxed p-4 rounded-xl resize-none transition-shadow ${
                                    isModified 
                                      ? 'border-brand-500/30 bg-dark-800/50 ring-4 ring-brand-500/20 focus:border-brand focus:ring-brand/20' 
                                      : 'bg-dark-800/50 hover:border-white/20'
                                  }`}
                                  value={bullet}
                                  onChange={(e) => {
                                    const newProj = [...edited.projects];
                                    newProj[projIndex].bullets[bIndex] = e.target.value;
                                    setEdited({ ...edited, projects: newProj });
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Layout Manager */}
      <div className="card space-y-4 mb-32 mx-4 md:mx-auto max-w-5xl border-brand-500/20 bg-dark-800/80 backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg text-brand-300">Resume Layout</h3>
            <p className="text-sm text-slate-400 mt-1">Customize the section order and visibility specifically for this application.</p>
          </div>
          <button className="btn-ghost text-brand hover:bg-brand-500/10 text-sm" onClick={applySuggestedLayout}>
            <Sparkles className="w-4 h-4 mr-2" /> Apply AI Suggested Layout
          </button>
        </div>
        <LayoutManager layout={layout} hiddenSections={hiddenSections} onChange={(l, h) => { setLayout(l); setHiddenSections(h); }} />
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-800/50/80 backdrop-blur-md border-t border-white/10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="text-sm font-medium text-slate-400 hidden md:flex items-center gap-4">
            <span>Take a moment to review the changes. You can revert any hallucinated bullets!</span>
            <label className="flex items-center gap-2 cursor-pointer bg-dark-800/50 px-3 py-1.5 rounded border border-white/5">
              <input type="checkbox" checked={syncSkills} onChange={(e) => setSyncSkills(e.target.checked)} className="checkbox checkbox-sm checkbox-primary" />
              <span className="text-xs">Sync mapped skills to global profile</span>
            </label>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <button className="btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn-primary shadow-lg shadow-brand/30 px-8 py-2.5 font-semibold" onClick={() => onSave(edited, layout, hiddenSections, syncSkills)}>
              Approve & Finalize PDF →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

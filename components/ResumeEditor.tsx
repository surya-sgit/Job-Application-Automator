"use client";

import { useState } from "react";
import type { TailoredResume, ParsedProfile } from "@/lib/resumeSchema";

interface Props {
  draftResume: TailoredResume;
  originalResume: TailoredResume | ParsedProfile | null;
  onSave: (edited: TailoredResume) => void;
  onCancel: () => void;
}

export default function ResumeEditor({ draftResume, originalResume, onSave, onCancel }: Props) {
  const [edited, setEdited] = useState<TailoredResume>(JSON.parse(JSON.stringify(draftResume)));
  
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

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="card space-y-6">
        <div>
          <h2 className="font-bold text-xl text-brand mb-1">Review & Edit Draft</h2>
          <p className="text-sm text-slate-500">
            Compare the original text on the left with the AI's proposed tweaks on the right. Edit anything you'd like to change.
          </p>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Professional Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              <div className="font-semibold text-xs text-slate-400 mb-2 uppercase tracking-wider">Original</div>
              <p className="leading-relaxed">{originalResume?.summary || "No summary provided."}</p>
            </div>
            <div className="relative">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200 z-10">
                PROPOSED
              </div>
              <textarea
                className="input min-h-[120px] w-full text-sm leading-relaxed"
                value={edited.summary}
                onChange={(e) => setEdited({ ...edited, summary: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-3 pt-4">
          <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Skills</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              <div className="font-semibold text-xs text-slate-400 mb-2 uppercase tracking-wider">Original</div>
              <p className="leading-relaxed">{originalResume?.skills.join(", ") || "No skills provided."}</p>
            </div>
            <div className="relative">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200 z-10">
                PROPOSED
              </div>
              <textarea
                className="input min-h-[80px] w-full text-sm leading-relaxed"
                value={edited.skills.join(", ")}
                onChange={(e) => setEdited({ ...edited, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
        </div>

        {/* Experience */}
        {edited.experience.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Experience</h3>
            {edited.experience.map((exp, expIndex) => {
              const origBullets = getOriginalExpBullets(exp.company, originalResume);
              const isExpanded = expandedRoles.has(expIndex);
              
              return (
                <div key={expIndex} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    onClick={() => toggleRole(expIndex)}
                  >
                    <div>
                      <h4 className="font-semibold text-brand text-base">{exp.title}</h4>
                      <p className="text-sm text-slate-500">{exp.company}</p>
                    </div>
                    <span className="text-slate-400 p-2">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-slate-200">
                      {exp.bullets.map((bullet, bIndex) => {
                        const originalBullet = origBullets[bIndex];
                        const isModified = originalBullet && originalBullet !== bullet;
                        
                        return (
                          <div key={bIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className={`p-3 rounded-lg border text-sm text-slate-600 ${isModified ? 'bg-slate-50 border-slate-200' : 'bg-transparent border-transparent opacity-60'}`}>
                              {originalBullet || "—"}
                            </div>
                            <div className="relative">
                              {isModified && (
                                <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200 z-10">
                                  MODIFIED
                                </div>
                              )}
                              <textarea
                                className={`input min-h-[70px] w-full text-sm ${isModified ? 'ring-1 ring-blue-100 border-blue-200' : ''}`}
                                value={bullet}
                                onChange={(e) => {
                                  const newExp = [...edited.experience];
                                  newExp[expIndex].bullets[bIndex] = e.target.value;
                                  setEdited({ ...edited, experience: newExp });
                                }}
                              />
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
            <h3 className="font-semibold text-lg text-slate-800 border-b pb-2">Projects</h3>
            {edited.projects.map((proj, projIndex) => {
              const origBullets = getOriginalProjBullets(proj.title, originalResume);
              const isExpanded = expandedProjects.has(projIndex);
              
              return (
                <div key={projIndex} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    onClick={() => toggleProject(projIndex)}
                  >
                    <h4 className="font-semibold text-brand text-base">{proj.title}</h4>
                    <span className="text-slate-400 p-2">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-slate-200">
                      {proj.bullets.map((bullet, bIndex) => {
                        const originalBullet = origBullets[bIndex];
                        const isModified = originalBullet && originalBullet !== bullet;
                        
                        return (
                          <div key={bIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className={`p-3 rounded-lg border text-sm text-slate-600 ${isModified ? 'bg-slate-50 border-slate-200' : 'bg-transparent border-transparent opacity-60'}`}>
                              {originalBullet || "—"}
                            </div>
                            <div className="relative">
                              {isModified && (
                                <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200 z-10">
                                  MODIFIED
                                </div>
                              )}
                              <textarea
                                className={`input min-h-[70px] w-full text-sm ${isModified ? 'ring-1 ring-blue-100 border-blue-200' : ''}`}
                                value={bullet}
                                onChange={(e) => {
                                  const newProj = [...edited.projects];
                                  newProj[projIndex].bullets[bIndex] = e.target.value;
                                  setEdited({ ...edited, projects: newProj });
                                }}
                              />
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

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-end gap-4">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary shadow-lg shadow-brand/20 px-8" onClick={() => onSave(edited)}>
            Approve & Finalize PDF →
          </button>
        </div>
      </div>
    </div>
  );
}

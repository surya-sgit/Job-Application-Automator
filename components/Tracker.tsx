"use client";

import { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import type { Application, AppStatus } from "@/lib/store";
import { Clock, Briefcase, Mail, FileText, ChevronRight, AlertCircle, Building2, Trash2 } from "lucide-react";
import { fetchJson } from "@/lib/clientFetch";

const COLUMNS: AppStatus[] = ["Draft", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"];

function DroppableColumn({ id, title, apps, onEdit, onDelete }: { id: AppStatus, title: string, apps: Application[], onEdit: (a: Application) => void, onDelete: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col bg-white/5 rounded-xl border border-white/5 p-3 min-h-[500px] max-h-[calc(100vh-16rem)] w-72 shrink-0">
      <div className="flex justify-between items-center mb-4 px-2 shrink-0">
        <h3 className="font-semibold text-slate-200 text-sm">{title}</h3>
        <span className="bg-dark-800/50 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full shadow-xl">{apps.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} onEdit={() => onEdit(app)} onDelete={() => onDelete(app.id)} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ app, onEdit, onDelete }: { app: Application, onEdit: () => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: app,
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  // Calculate if stale (in Applied for > 7 days)
  const isStale = app.status === "Applied" && 
    (new Date().getTime() - new Date(app.dateApplied).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`bg-dark-800/50 p-3 rounded-lg border shadow-xl cursor-grab active:cursor-grabbing hover:border-brand/40 transition-colors group relative ${isDragging ? "opacity-50 ring-2 ring-brand" : "border-white/10"}`}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-bold text-slate-100 text-sm line-clamp-1">{app.companyName}</h4>
      </div>
      <p className="text-xs text-slate-400 line-clamp-1 mb-3">{app.jobTitle}</p>
      
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {new Date(app.dateApplied).toLocaleDateString()}
        </span>
        
        {isStale && (
          <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Stale
          </span>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
         <button className="p-1 bg-dark-800/50 hover:bg-white/10 text-slate-400 hover:text-brand rounded shadow-xl border border-white/10" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
           <FileText className="w-3 h-3" />
         </button>
         <button className="p-1 bg-dark-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded shadow-xl border border-white/10" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
           <Trash2 className="w-3 h-3" />
         </button>
      </div>
    </div>
  );
}

export default function Tracker() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeApp, setActiveApp] = useState<Application | null>(null);

  // Edit Modal State
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  async function load() {
    try {
      const data = await fetchJson<{ applications: Application[] }>("/api/applications");
      setApps(data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveApp(apps.find(a => a.id === active.id) || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveApp(null);
    if (!over) return;

    const appId = active.id as string;
    const newStatus = over.id as AppStatus;

    const app = apps.find(a => a.id === appId);
    if (!app || app.status === newStatus) return;

    // Optimistic update
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));

    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Failed to update status", err);
      load(); // Revert on failure
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this application?")) return;
    setApps(prev => prev.filter(a => a.id !== id));
    try {
      await fetch(`/api/applications/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  async function handleSaveEdit(updated: Application) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditingApp(null);
    try {
      await fetch(`/api/applications/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updated.notes, followUpDate: updated.followUpDate })
      });
    } catch(err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading tracker...</div>;

  const total = apps.length;
  const interviews = apps.filter(a => a.status === "Interview" || a.status === "Offer").length;
  const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0;
  const active = apps.filter(a => !["Rejected", "Offer"].includes(a.status)).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center justify-between !p-5">
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Applications</p>
            <p className="text-3xl font-bold text-slate-100">{total}</p>
          </div>
          <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-5">
          <div>
            <p className="text-sm text-slate-400 font-medium">Interview Rate</p>
            <p className="text-3xl font-bold text-emerald-600">{interviewRate}%</p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div className="card flex items-center justify-between !p-5">
          <div>
            <p className="text-sm text-slate-400 font-medium">Active Processes</p>
            <p className="text-3xl font-bold text-amber-400">{active}</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
          {COLUMNS.map(col => (
            <DroppableColumn 
              key={col} 
              id={col} 
              title={col} 
              apps={apps.filter(a => a.status === col)} 
              onEdit={setEditingApp}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? (
            <div className="bg-dark-800/50 p-3 rounded-lg border border-brand shadow-xl opacity-90 w-72 rotate-2">
              <h4 className="font-bold text-slate-100 text-sm">{activeApp.companyName}</h4>
              <p className="text-xs text-slate-400">{activeApp.jobTitle}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-800/50 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{editingApp.companyName}</h2>
                <p className="text-slate-400">{editingApp.jobTitle}</p>
              </div>
              <span className="px-2 py-1 bg-white/10 text-slate-300 rounded text-xs font-semibold">{editingApp.status}</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="label">Recruiter Contact</label>
                <div className="text-sm bg-white/5 p-2 rounded border text-slate-200 font-mono">
                  {editingApp.recruiterContact || "None"}
                </div>
              </div>
              
              <div>
                <label className="label">Follow-up Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={editingApp.followUpDate || ""} 
                  onChange={e => setEditingApp({...editingApp, followUpDate: e.target.value})}
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea 
                  className="input min-h-[100px]" 
                  placeholder="Interview prep, salary expectations..."
                  value={editingApp.notes || ""} 
                  onChange={e => setEditingApp({...editingApp, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button className="btn-ghost" onClick={() => setEditingApp(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleSaveEdit(editingApp)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Activity icon (missing from lucide imports in this file initially)
function Activity(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
}

import { useState } from "react";
import { analyzeResume, QualityReport as ReportType } from "@/lib/qualityChecker";
import type { TailoredResume, JdAnalysis } from "@/lib/resumeSchema";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Activity } from "lucide-react";

interface Props {
  resume: TailoredResume;
  analysis: JdAnalysis | null;
}

export default function QualityReport({ resume, analysis }: Props) {
  const [expanded, setExpanded] = useState(true);
  
  // Recalculates on every render (super fast because it's client-side string ops)
  const report: ReportType = analyzeResume(resume, analysis);

  return (
    <div className="card border-slate-200/60 shadow-xl shadow-slate-200/40 mb-8 bg-slate-50/50 backdrop-blur-sm relative overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-1 focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand" />
          <h2 className="font-bold text-lg text-slate-800">Resume Quality Report</h2>
          <span className="text-xs font-medium px-2 py-0.5 bg-brand/10 text-brand-dark rounded-full border border-brand/20 ml-2">
            Real-time
          </span>
        </div>
        <div className="p-1 hover:bg-slate-200 rounded-md transition-colors">
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Missing Keywords */}
          {analysis && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Keywords Matched ({report.matchedKeywords.length}/{report.matchedKeywords.length + report.missingKeywords.length})
              </h3>
              
              {report.missingKeywords.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Missing from JD:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.missingKeywords.map(kw => (
                      <span key={kw} className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">All target keywords are present! 🎉</p>
              )}
            </div>
          )}

          {/* Bullet Metrics */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" /> Bullet Impact
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Metrics Present</span>
                <span className={`font-semibold ${report.bulletsWithMetrics > report.totalBullets * 0.3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {report.bulletsWithMetrics} / {report.totalBullets}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${report.bulletsWithMetrics > report.totalBullets * 0.3 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${Math.min(100, (report.bulletsWithMetrics / Math.max(1, report.totalBullets)) * 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                <span className="text-slate-600">Weak Bullets</span>
                <span className={`font-semibold ${report.weakBullets === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {report.weakBullets}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings Log */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3 lg:col-span-1 md:col-span-2">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Improvement Warnings
            </h3>
            
            {report.warnings.length > 0 ? (
              <ul className="space-y-2">
                {report.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-xs text-amber-700 bg-amber-50/50 p-2 rounded-md border border-amber-100">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 p-2 bg-emerald-50 rounded-md border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" /> No warnings! Your resume looks highly professional.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

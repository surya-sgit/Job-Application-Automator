"use client";

import Tracker from "@/components/Tracker";

export default function TrackerPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Application Tracker</h1>
          <p className="mt-2 text-slate-600">Track the lifecycle of your applications. Drag and drop cards to update their status.</p>
        </div>
        <Tracker />
      </div>
    </div>
  );
}

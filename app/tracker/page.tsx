"use client";

import Tracker from "@/components/Tracker";

export default function TrackerPage() {
  return (
    <div className="py-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Application Tracker</h1>
          <p className="mt-2 text-slate-400">Track the lifecycle of your applications. Drag and drop cards to update their status.</p>
        </div>
        <Tracker />
      </div>
    </div>
  );
}

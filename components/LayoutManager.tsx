"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";

interface LayoutManagerProps {
  layout: string[];
  hiddenSections: string[];
  onChange: (layout: string[], hiddenSections: string[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements"
};

interface SortableItemProps {
  id: string;
  isHidden: boolean;
  onToggleHide: (id: string) => void;
}

function SortableItem({ id, isHidden, onToggleHide }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 mb-2 rounded-lg border \${
        isHidden 
          ? "bg-dark-800/30 border-white/5 opacity-60" 
          : "bg-dark-800 border-white/10"
      } \${isDragging ? "shadow-2xl ring-2 ring-brand-500 bg-dark-700 opacity-100" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded text-slate-400 touch-none"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <span className={`font-medium \${isHidden ? "line-through text-slate-500" : "text-slate-200"}`}>
          {SECTION_LABELS[id] || id}
        </span>
      </div>
      <button
        onClick={() => onToggleHide(id)}
        className={`p-2 rounded-md hover:bg-white/5 transition-colors \${isHidden ? "text-slate-500" : "text-brand-300"}`}
        title={isHidden ? "Show section" : "Hide section"}
      >
        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function LayoutManager({ layout, hiddenSections, onChange }: LayoutManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout.indexOf(active.id as string);
      const newIndex = layout.indexOf(over.id as string);
      onChange(arrayMove(layout, oldIndex, newIndex), hiddenSections);
    }
  };

  const toggleHide = (id: string) => {
    const hiddenSet = new Set(hiddenSections);
    if (hiddenSet.has(id)) {
      hiddenSet.delete(id);
    } else {
      hiddenSet.add(id);
    }
    onChange(layout, Array.from(hiddenSet));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        <SortableContext
          items={layout}
          strategy={verticalListSortingStrategy}
        >
          {layout.map((id) => (
            <SortableItem
              key={id}
              id={id}
              isHidden={hiddenSections.includes(id)}
              onToggleHide={toggleHide}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}

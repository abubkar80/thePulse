import React, { useState } from 'react';
import { X, Plus, Trash2, BookOpen, Palette } from 'lucide-react';
import { Course } from '../types/deadline';

interface CoursesModalProps {
  isOpen: boolean;
  courses: Course[];
  onSaveCourses: (courses: Course[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

export const CoursesModal: React.FC<CoursesModalProps> = ({
  isOpen,
  courses,
  onSaveCourses,
  onClose,
}) => {
  const [list, setList] = useState<Course[]>(courses);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newCourse: Course = {
      id: `c_${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      color: newColor,
    };

    const updated = [...list, newCourse];
    setList(updated);
    onSaveCourses(updated);
    setNewCode('');
    setNewName('');
  };

  const handleRemove = (id: string) => {
    if (list.length <= 1) return; // Keep at least one
    const updated = list.filter((c) => c.id !== id);
    setList(updated);
    onSaveCourses(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Manage Courses</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto hide-scrollbar">
          {/* Add course form */}
          <form onSubmit={handleAdd} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Add New Subject / Course
            </span>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Code (CS 101)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-none uppercase font-bold"
              />
              <input
                type="text"
                placeholder="Course Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-none"
              />
            </div>

            {/* Color picker */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-1.5 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="submit"
                className="py-1 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          {/* Existing courses list */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Current Enrolled Courses ({list.length})
            </span>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {list.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: c.color }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.code}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={list.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

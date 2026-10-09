import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  Mic,
  MicOff,
  Loader2,
} from 'lucide-react';
import { Deadline, Course, Priority, AssignmentType, Subtask } from '../types/deadline';

interface DeadlineModalProps {
  isOpen: boolean;
  editingDeadline?: Deadline | null;
  courses: Course[];
  isCalendarConnected: boolean;
  onSave: (deadlineData: Partial<Deadline>, autoSyncToCalendar: boolean) => void;
  onClose: () => void;
}

export const DeadlineModal: React.FC<DeadlineModalProps> = ({
  isOpen,
  editingDeadline,
  courses,
  isCalendarConnected,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [type, setType] = useState<AssignmentType>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [weightPercentage, setWeightPercentage] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [autoSyncCalendar, setAutoSyncCalendar] = useState(true);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (editingDeadline) {
      setTitle(editingDeadline.title);
      setCourseId(editingDeadline.courseId);
      setType(editingDeadline.type);
      setDueDate(editingDeadline.dueDate);
      setPriority(editingDeadline.priority);
      setWeightPercentage(editingDeadline.weightPercentage ? String(editingDeadline.weightPercentage) : '');
      setEstimatedHours(editingDeadline.estimatedHours ? String(editingDeadline.estimatedHours) : '');
      setNotes(editingDeadline.notes || '');
      setSubtasks(editingDeadline.subtasks || []);
      setAutoSyncCalendar(Boolean(editingDeadline.googleCalendarEventId));
    } else {
      // Default new deadline
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setHours(23, 59, 0, 0);
      
      setTitle('');
      setCourseId(courses[0]?.id || '');
      setType('assignment');
      setDueDate(tomorrow.toISOString().slice(0, 16));
      setPriority('medium');
      setWeightPercentage('15');
      setEstimatedHours('4');
      setNotes('');
      setSubtasks([
        { id: 'st_1', title: 'Read guidelines & gather reference materials', completed: false },
        { id: 'st_2', title: 'Complete first draft / core implementation', completed: false },
        { id: 'st_3', title: 'Review, test, and submit', completed: false },
      ]);
      setAutoSyncCalendar(isCalendarConnected);
    }
  }, [editingDeadline, courses, isCalendarConnected, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `st_${Date.now()}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleDictateTitle = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size < 1000) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: mediaRecorder.mimeType || 'audio/webm',
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.transcription) {
                setTitle((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
              }
            }
            setIsTranscribing(false);
          };
        } catch {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.warn('Microphone permission denied', e);
    }
  };

  const generateSmartBreakdown = async () => {
    setIsGeneratingMilestones(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `${type} for ${course?.code || 'Course'}`,
          course: course ? `${course.code} - ${course.name}` : 'General',
          type,
          dueDate,
          notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.milestones) && data.milestones.length > 0) {
          setSubtasks(
            data.milestones.map((m: any, idx: number) => ({
              id: `gen_${Date.now()}_${idx}`,
              title: m.title || `Milestone ${idx + 1}`,
              completed: false,
            }))
          );
          setIsGeneratingMilestones(false);
          return;
        }
      }
    } catch {
      // Fallback to static template
    }

    let generated: string[] = [];
    if (type === 'exam') {
      generated = [
        'Review lecture notes & textbook chapters',
        'Compile 1-page formula & theorem cheat sheet',
        'Solve past semester practice exams under timed conditions',
        'Attend professor or TA office hours for weak spots',
      ];
    } else if (type === 'essay') {
      generated = [
        'Source 6-8 academic papers and extract citations',
        'Draft structured argumentative outline with thesis statement',
        'Write introduction and literature synthesis',
        'Complete body paragraphs with critical analysis',
        'Proofread, check APA/MLA citations, and check formatting',
      ];
    } else if (type === 'project') {
      generated = [
        'Define system architecture and deliverables',
        'Set up repository and foundational boilerplate',
        'Implement core functional modules',
        'Write automated tests and debug edge cases',
        'Record demo walkthrough and polish documentation',
      ];
    } else if (type === 'lab') {
      generated = [
        'Gather experiment data tables & oscilloscope readings',
        'Create calculation spreadsheets & graphs with error bars',
        'Write experimental methodology & results interpretation',
        'Formulate conclusion and submit report',
      ];
    } else {
      generated = [
        'Understand problem statement and constraints',
        'Solve questions and draft solutions',
        'Verify edge cases and write clean explanation',
        'Format cleanly and submit before cutoff',
      ];
    }

    setSubtasks(
      generated.map((title, idx) => ({
        id: `gen_${Date.now()}_${idx}`,
        title,
        completed: false,
      }))
    );
    setIsGeneratingMilestones(false);
  };

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(23, 59, 0, 0);
    setDueDate(d.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(
      {
        title: title.trim(),
        courseId,
        type,
        dueDate,
        priority,
        weightPercentage: weightPercentage ? Number(weightPercentage) : undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        notes: notes.trim(),
        subtasks,
      },
      autoSyncCalendar
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingDeadline ? 'Edit Deadline' : 'New Assignment Deadline'}
            </h3>
            <p className="text-xs text-slate-500">
              Set schedules, subtasks, and calendar sync
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto hide-scrollbar">
          {/* Assignment Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Title / Assignment Name *
              </label>
              <button
                type="button"
                onClick={handleDictateTitle}
                className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-rose-100 text-rose-700 animate-pulse'
                    : isTranscribing
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:text-indigo-600'
                }`}
                title="Dictate assignment name with your microphone"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Transcribing...
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="w-3 h-3" /> Stop Dictating
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3 text-indigo-500" /> Dictate Title
                  </>
                )}
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Problem Set 5, Final Term Paper, Midterm Exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Course & Assignment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Course / Subject
              </label>
              <div className="relative">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssignmentType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all bg-white"
              >
                <option value="assignment">Assignment / Problem Set</option>
                <option value="exam">Exam / Midterm / Final</option>
                <option value="project">Project / Capstone</option>
                <option value="essay">Essay / Research Paper</option>
                <option value="quiz">Quiz / Assessment</option>
                <option value="lab">Lab Report</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Due Date & Time *
              </label>
              <div className="flex gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(3)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  +1 Week
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all"
            />
          </div>

          {/* Priority & Weight & Est Hours */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold outline-none transition-all bg-white"
              >
                <option value="high">🔥 High</option>
                <option value="medium">⚡ Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Weight (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="20"
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Est. Hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="4"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Subtasks / Milestones breakdown */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Subtasks & Study Milestones ({subtasks.length})
              </label>
              <button
                type="button"
                onClick={generateSmartBreakdown}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                title="Generate milestone checklist based on assignment type"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Smart Milestones
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() =>
                      setSubtasks(
                        subtasks.map((s) =>
                          s.id === st.id ? { ...s, completed: !s.completed } : s
                        )
                      )
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span
                    className={`flex-1 ${
                      st.completed ? 'line-through text-slate-400' : 'text-slate-700'
                    }`}
                  >
                    {st.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new subtask input */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Add subtask (e.g. Read chapter 4)..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Notes & Submission Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Portal links, submission formats, group members..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs outline-none transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Google Calendar Sync Option */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Sync to Google Calendar
                </p>
                <p className="text-[11px] text-slate-500">
                  {isCalendarConnected
                    ? 'Adds reminder alerts and scheduling block to your Google Calendar'
                    : 'Connect Google Calendar in the Sync tab to enable auto-sync'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoSyncCalendar}
              onChange={(e) => setAutoSyncCalendar(e.target.checked)}
              disabled={!isCalendarConnected}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition-all"
            >
              {editingDeadline ? 'Save Changes' : 'Create Deadline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

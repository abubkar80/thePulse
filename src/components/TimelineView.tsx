import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Deadline, Course } from '../types/deadline';
import { DeadlineCard } from './DeadlineCard';

interface TimelineViewProps {
  deadlines: Deadline[];
  courses: Course[];
  onToggleStatus: (id: string) => void;
  onToggleSubtask: (deadlineId: string, subtaskId: string) => void;
  onEdit: (deadline: Deadline) => void;
  onDelete: (deadline: Deadline) => void;
  onSyncCalendar: (deadline: Deadline) => void;
  onStartFocus: (deadline: Deadline) => void;
  isCalendarConnected: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  deadlines,
  courses,
  onToggleStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onSyncCalendar,
  onStartFocus,
  isCalendarConnected,
}) => {
  const now = new Date();
  const sorted = [...deadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Categorize
  const buckets: { label: string; deadlines: Deadline[]; color: string }[] = [
    { label: 'Overdue & Urgent', deadlines: [], color: 'text-rose-600 bg-rose-50' },
    { label: 'Due Today', deadlines: [], color: 'text-amber-700 bg-amber-50' },
    { label: 'Tomorrow', deadlines: [], color: 'text-indigo-700 bg-indigo-50' },
    { label: 'This Week', deadlines: [], color: 'text-blue-700 bg-blue-50' },
    { label: 'Upcoming Later', deadlines: [], color: 'text-slate-700 bg-slate-100' },
    { label: 'Completed', deadlines: [], color: 'text-emerald-700 bg-emerald-50' },
  ];

  const todayDate = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toDateString();

  const oneWeekAhead = new Date(now);
  oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);

  sorted.forEach((dl) => {
    if (dl.status === 'completed') {
      buckets[5].deadlines.push(dl);
      return;
    }

    const due = new Date(dl.dueDate);
    if (due.getTime() < now.getTime()) {
      buckets[0].deadlines.push(dl);
    } else if (due.toDateString() === todayDate) {
      buckets[1].deadlines.push(dl);
    } else if (due.toDateString() === tomorrowDate) {
      buckets[2].deadlines.push(dl);
    } else if (due.getTime() <= oneWeekAhead.getTime()) {
      buckets[3].deadlines.push(dl);
    } else {
      buckets[4].deadlines.push(dl);
    }
  });

  const activeBuckets = buckets.filter((b) => b.deadlines.length > 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {activeBuckets.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          No deadlines scheduled yet. Tap + to add an assignment.
        </div>
      ) : (
        activeBuckets.map((bucket, index) => (
          <div key={bucket.label} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider ${bucket.color}`}
              >
                {bucket.label} ({bucket.deadlines.length})
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-3">
              {bucket.deadlines.map((dl) => {
                const course = courses.find((c) => c.id === dl.courseId);
                return (
                  <DeadlineCard
                    key={dl.id}
                    deadline={dl}
                    course={course}
                    onToggleStatus={onToggleStatus}
                    onToggleSubtask={onToggleSubtask}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSyncCalendar={onSyncCalendar}
                    onStartFocus={onStartFocus}
                    isCalendarConnected={isCalendarConnected}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

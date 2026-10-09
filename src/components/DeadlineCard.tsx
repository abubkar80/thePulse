import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  ExternalLink,
  Flame,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Edit2,
  CalendarCheck,
  CalendarPlus,
} from 'lucide-react';
import { Deadline, Course } from '../types/deadline';
import confetti from 'canvas-confetti';

interface DeadlineCardProps {
  deadline: Deadline;
  course?: Course;
  onToggleStatus: (id: string) => void;
  onToggleSubtask: (deadlineId: string, subtaskId: string) => void;
  onEdit: (deadline: Deadline) => void;
  onDelete: (deadline: Deadline) => void;
  onSyncCalendar: (deadline: Deadline) => void;
  onStartFocus: (deadline: Deadline) => void;
  isCalendarConnected: boolean;
  isSyncing?: boolean;
}

export const DeadlineCard: React.FC<DeadlineCardProps> = ({
  deadline,
  course,
  onToggleStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onSyncCalendar,
  onStartFocus,
  isCalendarConnected,
  isSyncing = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Calculate remaining time
  const now = new Date();
  const due = new Date(deadline.dueDate);
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0 && deadline.status !== 'completed';
  const isCompleted = deadline.status === 'completed';

  const formatCountdown = () => {
    if (isCompleted) return 'Completed';
    const absDiff = Math.abs(diffMs);
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (isOverdue) {
      if (days > 0) return `Overdue by ${days}d ${remHours}h`;
      return `Overdue by ${hours}h`;
    }
    if (days === 0) {
      if (hours === 0) {
        const mins = Math.max(1, Math.floor(absDiff / (1000 * 60)));
        return `Due in ${mins}m!`;
      }
      return `Due in ${hours}h`;
    }
    if (days === 1) return `Due tomorrow (${remHours}h left)`;
    return `${days} days left`;
  };

  const completedSubtasks = deadline.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = deadline.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      // Trigger festive study celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (err) {
        // Safe fallback
      }
    }
    onToggleStatus(deadline.id);
  };

  const getUrgencyBadgeColor = () => {
    if (isCompleted) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (isOverdue) return 'bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse';
    const hours = diffMs / (1000 * 60 * 60);
    if (hours <= 24) return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    if (hours <= 72) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const formatDueDateFormatted = () => {
    const d = new Date(deadline.dueDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isCompleted
          ? 'bg-slate-50/70 border-slate-200 opacity-80'
          : isOverdue
          ? 'bg-white border-rose-200 shadow-sm shadow-rose-50'
          : 'bg-white border-slate-200/90 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Top course color stripe */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: course?.color || '#6366F1' }}
      />

      <div className="p-4">
        {/* Header row: Course tag, priority, status badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-2xs"
              style={{ backgroundColor: course?.color || '#6366F1' }}
            >
              {course?.code || 'GENERAL'}
            </span>

            {deadline.priority === 'high' && !isCompleted && (
              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                <Flame className="w-3 h-3 fill-rose-500" />
                Urgent
              </span>
            )}

            {deadline.weightPercentage && (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                {deadline.weightPercentage}% weight
              </span>
            )}
          </div>

          {/* More options button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-7 z-30 w-44 rounded-xl bg-white shadow-xl border border-slate-100 py-1 text-xs text-slate-700 animate-in fade-in">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(deadline);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    Edit details
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSyncCalendar(deadline);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-indigo-500" />
                    {deadline.googleCalendarEventId ? 'Re-sync Calendar' : 'Sync to Google Cal'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onStartFocus(deadline);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                    Start Focus Timer
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(deadline);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete deadline
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title and checkbox */}
        <div className="flex items-start gap-3 mt-1">
          <button
            onClick={handleCompleteClick}
            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
            title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
            ) : (
              <Circle className="w-5 h-5 hover:scale-110 transition-transform" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={`text-sm font-semibold leading-snug break-words ${
                isCompleted ? 'line-through text-slate-400 font-normal' : 'text-slate-900'
              }`}
            >
              {deadline.title}
            </h4>

            {/* Countdown chip and due date */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getUrgencyBadgeColor()}`}
              >
                <Clock className="w-3 h-3" />
                {formatCountdown()}
              </span>

              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formatDueDateFormatted()}
              </span>
            </div>
          </div>
        </div>

        {/* Subtask progress bar */}
        {totalSubtasks > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium">
                Subtasks ({completedSubtasks}/{totalSubtasks})
              </span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5 text-[11px]"
              >
                {showDetails ? (
                  <>Hide <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>View checklist <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            </div>
            
            {/* Progress track */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPercent === 100
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Expanded subtasks checklist */}
            {showDetails && (
              <div className="mt-2.5 space-y-1.5 pt-1">
                {deadline.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    onClick={() => onToggleSubtask(deadline.id, subtask.id)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => {}}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span
                      className={`flex-1 ${
                        subtask.completed ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom bar: Calendar badge, notes, Quick Focus button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Google Calendar status */}
          <div className="flex items-center gap-1.5">
            {deadline.googleCalendarEventId ? (
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CalendarCheck className="w-3 h-3 text-emerald-600" />
                <span>Synced with Google Cal</span>
                {deadline.googleCalendarHtmlLink && (
                  <a
                    href={deadline.googleCalendarHtmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 ml-0.5"
                    title="Open in Google Calendar"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={() => onSyncCalendar(deadline)}
                disabled={isSyncing}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-0.5 rounded-md border border-slate-200 hover:border-indigo-200 transition-colors"
                title="Add to Google Calendar"
              >
                <CalendarPlus className="w-3 h-3 text-indigo-500" />
                <span>{isSyncing ? 'Syncing...' : 'Sync to G-Cal'}</span>
              </button>
            )}
          </div>

          {/* Quick study button */}
          {!isCompleted && (
            <button
              onClick={() => onStartFocus(deadline)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-[11px] transition-colors"
            >
              <Play className="w-3 h-3 fill-indigo-600" />
              <span>Focus Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

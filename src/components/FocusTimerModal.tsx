import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Coffee,
  CheckCircle,
  Timer,
} from 'lucide-react';
import { Deadline, Course } from '../types/deadline';
import { playNotificationChime } from '../services/notificationService';

interface FocusTimerModalProps {
  isOpen: boolean;
  deadline: Deadline | null;
  course?: Course;
  onClose: () => void;
  onLogStudyTime: (deadlineId: string, hours: number) => void;
}

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  isOpen,
  deadline,
  course,
  onClose,
  onLogStudyTime,
}) => {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [duration, setDuration] = useState(25 * 60); // 25 mins
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    if (deadline) {
      setMode('focus');
      setDuration(25 * 60);
      setTimeLeft(25 * 60);
      setIsRunning(false);
    }
  }, [deadline]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      playNotificationChime();
      if (mode === 'focus') {
        const nextSessions = sessionsCompleted + 1;
        setSessionsCompleted(nextSessions);
        if (deadline) {
          onLogStudyTime(deadline.id, 0.42); // 25 minutes ~ 0.42 hours
        }
        setMode('break');
        setDuration(5 * 60);
        setTimeLeft(5 * 60);
      } else {
        setMode('focus');
        setDuration(25 * 60);
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, deadline, sessionsCompleted, onLogStudyTime]);

  if (!isOpen || !deadline) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = Math.round(((duration - timeLeft) / duration) * 100);

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(newMode);
    const newDur = newMode === 'focus' ? 25 * 60 : 5 * 60;
    setDuration(newDur);
    setTimeLeft(newDur);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-2 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Study Focus Timer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-5">
          {/* Linked Deadline context */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: course?.color || '#6366F1' }}
              />
              <span className="text-[10px] font-bold uppercase text-slate-500">
                {course?.code}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
              {deadline.title}
            </p>
          </div>

          {/* Mode switch pills */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => switchMode('focus')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'focus'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              25m Focus
            </button>
            <button
              onClick={() => switchMode('break')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'break'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5m Break
            </button>
          </div>

          {/* Circular Countdown Display */}
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="84"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-100"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="84"
                stroke="currentColor"
                strokeWidth="10"
                className={mode === 'focus' ? 'text-indigo-600' : 'text-emerald-500'}
                fill="transparent"
                strokeDasharray={2 * Math.PI * 84}
                strokeDashoffset={2 * Math.PI * 84 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tracking-tight text-slate-900 font-mono">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs font-medium text-slate-400 mt-1 capitalize">
                {mode === 'focus' ? 'Deep Work' : 'Rest & Hydrate'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Reset timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleToggleTimer}
              className={`py-3 px-8 rounded-2xl text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-white" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" /> Start
                </>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            {sessionsCompleted} study sprint{sessionsCompleted === 1 ? '' : 's'} logged today
          </div>
        </div>
      </div>
    </div>
  );
};

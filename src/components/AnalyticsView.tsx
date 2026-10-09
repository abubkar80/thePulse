import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  BookOpen,
  Calendar,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { Deadline, Course } from '../types/deadline';

interface AnalyticsViewProps {
  deadlines: Deadline[];
  courses: Course[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ deadlines, courses }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  const completedDeadlines = deadlines.filter((d) => d.status === 'completed');
  const activeDeadlines = deadlines.filter((d) => d.status !== 'completed');

  const totalEstHours = deadlines.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
  const remainingHours = activeDeadlines.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
  const loggedStudyHours = deadlines.reduce((acc, d) => acc + (d.completedHours || 0), 0);

  const completionRate = deadlines.length > 0 ? Math.round((completedDeadlines.length / deadlines.length) * 100) : 0;

  // Breakdown by course
  const courseWorkload = courses.map((course) => {
    const courseDeadlines = deadlines.filter((d) => d.courseId === course.id);
    const activeCourseDeadlines = courseDeadlines.filter((d) => d.status !== 'completed');
    const hours = activeCourseDeadlines.reduce((acc, d) => acc + (d.estimatedHours || 0), 0);
    return {
      course,
      count: activeCourseDeadlines.length,
      hours,
    };
  });

  const handleExportCSV = () => {
    setIsExporting(true);

    const headers = [
      'Deadline ID',
      'Title',
      'Course Code',
      'Course Name',
      'Assignment Type',
      'Due Date',
      'Due Time',
      'Priority',
      'Status',
      'Weight (%)',
      'Estimated Hours',
      'Logged Hours',
      'Completed Subtasks',
      'Total Subtasks',
      'Subtask Progress (%)',
      'Google Calendar Synced',
      'Notes',
      'Created Date',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = deadlines.map((dl) => {
      const course = courses.find((c) => c.id === dl.courseId);
      const dueDateObj = new Date(dl.dueDate);
      const datePart = !isNaN(dueDateObj.getTime()) ? dueDateObj.toLocaleDateString() : dl.dueDate;
      const timePart = !isNaN(dueDateObj.getTime()) ? dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const totalSub = dl.subtasks ? dl.subtasks.length : 0;
      const compSub = dl.subtasks ? dl.subtasks.filter((s) => s.completed).length : 0;
      const subtaskRate = totalSub > 0 ? Math.round((compSub / totalSub) * 100) : 0;

      return [
        escapeCsv(dl.id),
        escapeCsv(dl.title),
        escapeCsv(course?.code || 'GENERAL'),
        escapeCsv(course?.name || 'General'),
        escapeCsv(dl.type),
        escapeCsv(datePart),
        escapeCsv(timePart),
        escapeCsv(dl.priority.toUpperCase()),
        escapeCsv(dl.status === 'completed' ? 'Completed' : dl.status === 'in_progress' ? 'In Progress' : 'Not Started'),
        escapeCsv(dl.weightPercentage ?? ''),
        escapeCsv(dl.estimatedHours ?? ''),
        escapeCsv(dl.completedHours ? Number(dl.completedHours.toFixed(1)) : '0'),
        escapeCsv(compSub),
        escapeCsv(totalSub),
        escapeCsv(`${subtaskRate}%`),
        escapeCsv(dl.googleCalendarEventId ? 'Yes' : 'No'),
        escapeCsv(dl.notes || ''),
        escapeCsv(new Date(dl.createdAt).toLocaleDateString()),
      ].join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `duepulse_deadlines_report_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportedSuccess(true);
    setTimeout(() => setExportedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in">
      {/* Top Action Card: Export to CSV */}
      <div className="p-4 rounded-3xl bg-linear-to-r from-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-2xl bg-white/10 text-indigo-300 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">Academic Report Export</h3>
            <p className="text-[11px] text-slate-300">
              Download CSV file for Excel, Google Sheets, or advisors
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all shadow-sm ${
            exportedSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-900/30'
              : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-900/40'
          }`}
          title="Download deadline log as a CSV spreadsheet"
        >
          {exportedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Exported!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export to CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-100 shadow-2xs">
          <div className="flex items-center gap-2 text-indigo-700 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Remaining Work</span>
          </div>
          <p className="text-2xl font-black text-indigo-950">{remainingHours} hrs</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Across {activeDeadlines.length} active tasks</p>
        </div>

        <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-100 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Completion</span>
          </div>
          <p className="text-2xl font-black text-emerald-950">{completionRate}%</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{completedDeadlines.length} of {deadlines.length} finished</p>
        </div>
      </div>

      {/* Study Hours Tracker */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Study Session Progress</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {loggedStudyHours.toFixed(1)} / {totalEstHours} hrs
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-linear-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((loggedStudyHours / (totalEstHours || 1)) * 100))}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Use the Focus Timer on each deadline card to log study sprints and track real output.
        </p>
      </div>

      {/* Course Workload Distribution */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Active Workload by Subject
        </h3>

        <div className="space-y-3">
          {courseWorkload.map(({ course, count, hours }) => (
            <div key={course.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: course.color }}
                  />
                  {course.code} - {course.name}
                </span>
                <span className="text-slate-500 font-medium">
                  {count} deadline{count === 1 ? '' : 's'} ({hours}h)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: course.color,
                    width: `${Math.min(100, (hours / (remainingHours || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

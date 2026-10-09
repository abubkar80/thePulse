import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ArrowDownToLine,
  UploadCloud,
  LogOut,
  AlertCircle,
  Clock,
  Sparkles,
  Link,
  Check,
} from 'lucide-react';
import { Deadline, Course, GoogleCalendarEventItem } from '../types/deadline';
import { fetchUpcomingGoogleEvents } from '../services/googleCalendar';
import { User } from 'firebase/auth';

interface CalendarSyncViewProps {
  user: User | null;
  accessToken: string | null;
  deadlines: Deadline[];
  courses: Course[];
  onGoogleSignIn: () => void;
  onLogout: () => void;
  onSyncDeadline: (deadline: Deadline) => Promise<void>;
  onSyncAllPending: () => Promise<void>;
  onImportEvents: (selectedEvents: GoogleCalendarEventItem[], courseId: string) => void;
  onRequestDeleteCalendarEvent: (deadline: Deadline) => void;
  isSyncingAll: boolean;
}

export const CalendarSyncView: React.FC<CalendarSyncViewProps> = ({
  user,
  accessToken,
  deadlines,
  courses,
  onGoogleSignIn,
  onLogout,
  onSyncDeadline,
  onSyncAllPending,
  onImportEvents,
  onRequestDeleteCalendarEvent,
  isSyncingAll,
}) => {
  const [isFetchingCalendar, setIsFetchingCalendar] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [importCourseId, setImportCourseId] = useState<string>(courses[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const syncedCount = deadlines.filter((d) => d.googleCalendarEventId).length;
  const pendingCount = deadlines.filter((d) => !d.googleCalendarEventId && d.status !== 'completed').length;

  const handleFetchGoogleEvents = async () => {
    if (!accessToken) return;
    setIsFetchingCalendar(true);
    setErrorMsg(null);
    try {
      const items = await fetchUpcomingGoogleEvents(accessToken);
      setGoogleEvents(items);
      setSelectedEventIds(new Set(items.map((i) => i.id)));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch Google Calendar events');
    } finally {
      setIsFetchingCalendar(false);
    }
  };

  const toggleSelectEvent = (id: string) => {
    const next = new Set(selectedEventIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEventIds(next);
  };

  const handleImportSelected = () => {
    const toImport = googleEvents.filter((ev) => selectedEventIds.has(ev.id));
    if (toImport.length === 0) return;
    onImportEvents(toImport, importCourseId);
    setGoogleEvents([]);
    setSelectedEventIds(new Set());
    setSyncSuccessMsg(`Successfully imported ${toImport.length} events as deadlines!`);
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in">
      {/* Banner Card */}
      <div className="rounded-3xl bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Calendar className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-100">
              Google Workspace Integration
            </span>
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">
            Google Calendar Sync
          </h2>
          <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-sm">
            Synchronize assignment due dates directly to your primary Google Calendar. Receive automatic reminder popups on all your devices.
          </p>

          {/* Connection status */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between flex-wrap gap-2">
            {user ? (
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border-2 border-white/60 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-900 font-bold flex items-center justify-center text-xs">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold leading-none text-white">
                    {user.displayName || 'Google Account'}
                  </p>
                  <p className="text-[11px] text-indigo-200 mt-0.5">{user.email}</p>
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-indigo-200">
                Not connected yet
              </span>
            )}

            {user && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-white transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold ml-1">✕</button>
        </div>
      )}

      {syncSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* If NOT connected: Show official Google Sign-in button */}
      {!user && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Connect Your Google Calendar
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-5">
            Sign in with Google to enable two-way sync, automated reminder alerts, and unified timetable management.
          </p>

          {/* Official Google Sign-In Button as mandated by workspace-integration guidelines */}
          <button onClick={onGoogleSignIn} className="gsi-material-button">
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
        </div>
      )}

      {/* When CONNECTED: Sync controls and status */}
      {user && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Synced with G-Cal</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {syncedCount} <span className="text-xs font-normal text-slate-400">deadlines</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Pending Sync</span>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                {pendingCount} <span className="text-xs font-normal text-slate-400">deadlines</span>
              </p>
            </div>
          </div>

          {/* Action Buttons: Sync All & Import */}
          <div className="flex gap-2">
            <button
              onClick={onSyncAllPending}
              disabled={isSyncingAll || pendingCount === 0}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              {isSyncingAll ? 'Syncing...' : `Sync All Pending (${pendingCount})`}
            </button>

            <button
              onClick={handleFetchGoogleEvents}
              disabled={isFetchingCalendar}
              className="py-2.5 px-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowDownToLine className="w-4 h-4 text-indigo-600" />
              {isFetchingCalendar ? 'Fetching...' : 'Import from Calendar'}
            </button>
          </div>

          {/* Import Events Selector Modal / Panel */}
          {googleEvents.length > 0 && (
            <div className="p-4 rounded-3xl bg-slate-50 border border-indigo-200 shadow-sm animate-in fade-in space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Import Events as Deadlines ({googleEvents.length} found)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Select calendar events to convert into tracked student assignments
                  </p>
                </div>
                <button
                  onClick={() => setGoogleEvents([])}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Course assign selector */}
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Assign to course:</span>
                <select
                  value={importCourseId}
                  onChange={(e) => setImportCourseId(e.target.value)}
                  className="bg-transparent font-semibold text-indigo-700 outline-none flex-1"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event check list */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {googleEvents.map((ev) => {
                  const isChecked = selectedEventIds.has(ev.id);
                  const dateStr = ev.start.dateTime || ev.start.date || '';
                  const formatted = dateStr ? new Date(dateStr).toLocaleString() : 'No date';
                  return (
                    <div
                      key={ev.id}
                      onClick={() => toggleSelectEvent(ev.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer text-xs flex items-center gap-2.5 transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                          : 'bg-white border-slate-200 text-slate-600 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{ev.summary}</p>
                        <p className="text-[10px] text-slate-500">{formatted}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setGoogleEvents([])}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSelected}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  Import {selectedEventIds.size} Selected
                </button>
              </div>
            </div>
          )}

          {/* Synced Deadlines List */}
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Deadlines Sync Registry
                </h3>
                <p className="text-[11px] text-slate-500">
                  Individual calendar status and deep links
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {deadlines.length} total
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {deadlines.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No deadlines yet. Add an assignment to start syncing.
                </div>
              ) : (
                deadlines.map((dl) => {
                  const course = courses.find((c) => c.id === dl.courseId);
                  const isSynced = Boolean(dl.googleCalendarEventId);
                  return (
                    <div
                      key={dl.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: course?.color || '#6366F1' }}
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {course?.code}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {dl.title}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(dl.dueDate).toLocaleDateString()} at{' '}
                          {new Date(dl.dueDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSynced ? (
                          <>
                            {dl.googleCalendarHtmlLink && (
                              <a
                                href={dl.googleCalendarHtmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => onSyncDeadline(dl)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Update Google Calendar event"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRequestDeleteCalendarEvent(dl)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove event from Google Calendar"
                            >
                              <span className="text-[10px] font-medium text-rose-500 px-1 border border-rose-200 rounded">
                                Unlink
                              </span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onSyncDeadline(dl)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          >
                            <UploadCloud className="w-3 h-3" />
                            Sync
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

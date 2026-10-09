/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Bell,
  BellRing,
  BookOpen,
  BarChart3,
  ListTodo,
  Layers,
  Search,
  SlidersHorizontal,
  Smartphone,
  Maximize2,
  RefreshCw,
  Sparkles,
  Wifi,
  Battery,
  AlertCircle,
  Flame,
  Bot,
} from 'lucide-react';
import {
  Deadline,
  DeadlineStatus,
  Course,
  NotificationSettings,
  PushNotificationRecord,
  GoogleCalendarEventItem,
} from './types/deadline';
import {
  loadDeadlines,
  saveDeadlines,
  loadCourses,
  saveCourses,
  loadSettings,
  saveSettings,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from './services/firebaseAuth';
import {
  syncDeadlineToGoogleCalendar,
  deleteCalendarEvent,
} from './services/googleCalendar';
import {
  checkAndTriggerDeadlineAlerts,
  getNotificationHistory,
  sendPushNotification,
} from './services/notificationService';
import { DeadlineCard } from './components/DeadlineCard';
import { DeadlineModal } from './components/DeadlineModal';
import { CalendarSyncView } from './components/CalendarSyncView';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { FocusTimerModal } from './components/FocusTimerModal';
import { TimelineView } from './components/TimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { CoursesModal } from './components/CoursesModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { AiStudyCoachModal } from './components/AiStudyCoachModal';
import { User } from 'firebase/auth';

type ActiveTab = 'deadlines' | 'timeline' | 'calendar' | 'analytics';

export default function App() {
  // Core state
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings());
  const [notificationsHistory, setNotificationsHistory] = useState<PushNotificationRecord[]>([]);

  // Auth & Google Calendar state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('deadlines');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'urgent' | 'completed'>('all');
  const [isMobileFrameMode, setIsMobileFrameMode] = useState(true);

  // Modals state
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isCoursesModalOpen, setIsCoursesModalOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [focusDeadline, setFocusDeadline] = useState<Deadline | null>(null);

  // Destructive Confirmation Modal state
  const [confirmationConfig, setConfirmationConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemDescription?: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    type?: 'delete_deadline' | 'delete_calendar_event' | 'sync_overwrite' | 'generic';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Current phone simulator clock
  const [simTime, setSimTime] = useState('');

  // Initial load
  useEffect(() => {
    const loadedD = loadDeadlines();
    const loadedC = loadCourses();
    const loadedS = loadSettings();
    setDeadlines(loadedD);
    setCourses(loadedC);
    setSettings(loadedS);
    setNotificationsHistory(getNotificationHistory());

    const updateClock = () => {
      const now = new Date();
      setSimTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        setCachedAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setCachedAccessToken(null);
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Periodic deadline alerts check
  useEffect(() => {
    if (deadlines.length > 0 && settings.enabled) {
      checkAndTriggerDeadlineAlerts(deadlines, settings);
      setNotificationsHistory(getNotificationHistory());
    }

    const alertInterval = setInterval(() => {
      if (deadlines.length > 0 && settings.enabled) {
        checkAndTriggerDeadlineAlerts(deadlines, settings);
        setNotificationsHistory(getNotificationHistory());
      }
    }, 60000); // Check every minute

    return () => clearInterval(alertInterval);
  }, [deadlines, settings]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Google Sign-in Handler
  const handleGoogleSignIn = async () => {
    try {
      showToast('Connecting to Google Calendar...', 'info');
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast(`Connected as ${result.user.displayName || result.user.email}!`, 'success');
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      showToast('Google Sign-In was cancelled or failed.', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('Disconnected from Google Calendar.', 'info');
  };

  // Save deadlines helper
  const updateAndPersistDeadlines = useCallback((updated: Deadline[]) => {
    setDeadlines(updated);
    saveDeadlines(updated);
  }, []);

  // Sync deadline to Google Calendar
  const handleSyncDeadline = async (deadline: Deadline) => {
    if (!accessToken) {
      showToast('Please sign in with Google first to sync calendar events.', 'info');
      setActiveTab('calendar');
      return;
    }

    try {
      showToast(`Syncing "${deadline.title}" to Google Calendar...`, 'info');
      const course = courses.find((c) => c.id === deadline.courseId);
      const result = await syncDeadlineToGoogleCalendar(deadline, course, accessToken);

      const updated = deadlines.map((d) =>
        d.id === deadline.id
          ? {
              ...d,
              googleCalendarEventId: result.eventId,
              googleCalendarHtmlLink: result.htmlLink,
              googleCalendarSyncedAt: new Date().toISOString(),
            }
          : d
      );
      updateAndPersistDeadlines(updated);
      showToast('Added to Google Calendar with reminders!', 'success');
    } catch (err: any) {
      console.error('Calendar sync error:', err);
      showToast(`Failed to sync calendar: ${err.message}`, 'error');
    }
  };

  // Sync All Pending Deadlines
  const handleSyncAllPending = async () => {
    if (!accessToken) {
      showToast('Please connect Google Calendar first.', 'info');
      return;
    }

    const pending = deadlines.filter((d) => !d.googleCalendarEventId && d.status !== 'completed');
    if (pending.length === 0) {
      showToast('All active deadlines are already synced!', 'info');
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;
    const nextDeadlines = [...deadlines];

    for (const dl of pending) {
      try {
        const course = courses.find((c) => c.id === dl.courseId);
        const result = await syncDeadlineToGoogleCalendar(dl, course, accessToken);
        const idx = nextDeadlines.findIndex((d) => d.id === dl.id);
        if (idx !== -1) {
          nextDeadlines[idx] = {
            ...nextDeadlines[idx],
            googleCalendarEventId: result.eventId,
            googleCalendarHtmlLink: result.htmlLink,
            googleCalendarSyncedAt: new Date().toISOString(),
          };
          successCount++;
        }
      } catch (e) {
        console.error('Batch sync error for deadline', dl.id, e);
      }
    }

    updateAndPersistDeadlines(nextDeadlines);
    setIsSyncingAll(false);
    showToast(`Successfully synced ${successCount} deadlines to Google Calendar!`, 'success');
  };

  // Import events from Google Calendar
  const handleImportEvents = (
    events: GoogleCalendarEventItem[],
    targetCourseId: string
  ) => {
    const newItems: Deadline[] = events.map((ev, index) => {
      const dueIso = ev.end.dateTime || ev.end.date || ev.start.dateTime || ev.start.date || new Date().toISOString();
      return {
        id: `imported_${Date.now()}_${index}`,
        title: ev.summary || 'Imported Calendar Assignment',
        courseId: targetCourseId,
        type: 'assignment',
        dueDate: dueIso.slice(0, 16),
        priority: 'medium',
        status: 'not_started',
        notes: ev.description || 'Imported from Google Calendar',
        subtasks: [
          { id: `st_imp_1_${index}`, title: 'Review requirements', completed: false },
          { id: `st_imp_2_${index}`, title: 'Submit assignment', completed: false },
        ],
        googleCalendarEventId: ev.id,
        googleCalendarHtmlLink: ev.htmlLink,
        googleCalendarSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    });

    const updated = [...newItems, ...deadlines];
    updateAndPersistDeadlines(updated);
    showToast(`Imported ${newItems.length} deadlines from Google Calendar!`, 'success');
  };

  // User Confirmation for Destructive Operation: Delete Google Calendar Event
  const requestDeleteCalendarEvent = (deadline: Deadline) => {
    setConfirmationConfig({
      isOpen: true,
      title: 'Remove from Google Calendar?',
      message:
        'This will delete the event from your primary Google Calendar and unlink it from DuePulse. Are you sure you want to proceed?',
      itemDescription: `Event: ${deadline.title} (${new Date(deadline.dueDate).toLocaleDateString()})`,
      confirmLabel: 'Remove Event',
      isDestructive: true,
      type: 'delete_calendar_event',
      onConfirm: async () => {
        setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
        if (deadline.googleCalendarEventId && accessToken) {
          try {
            await deleteCalendarEvent(deadline.googleCalendarEventId, accessToken);
          } catch (e) {
            console.warn('Failed to delete event in calendar:', e);
          }
        }
        const updated = deadlines.map((d) =>
          d.id === deadline.id
            ? {
                ...d,
                googleCalendarEventId: undefined,
                googleCalendarHtmlLink: undefined,
                googleCalendarSyncedAt: undefined,
              }
            : d
        );
        updateAndPersistDeadlines(updated);
        showToast('Event unlinked from Google Calendar.', 'info');
      },
    });
  };

  // User Confirmation for Destructive Operation: Delete Deadline
  const requestDeleteDeadline = (deadline: Deadline) => {
    setConfirmationConfig({
      isOpen: true,
      title: 'Delete Assignment Deadline?',
      message:
        'Are you sure you want to permanently delete this deadline? This will also remove any linked calendar reminders.',
      itemDescription: `Deadline: ${deadline.title}`,
      confirmLabel: 'Delete Deadline',
      isDestructive: true,
      type: 'delete_deadline',
      onConfirm: async () => {
        setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
        // If synced with Google Calendar, remove remote event as well
        if (deadline.googleCalendarEventId && accessToken) {
          try {
            await deleteCalendarEvent(deadline.googleCalendarEventId, accessToken);
          } catch (e) {
            console.warn('Remote event cleanup failed:', e);
          }
        }
        const updated = deadlines.filter((d) => d.id !== deadline.id);
        updateAndPersistDeadlines(updated);
        showToast('Deadline deleted.', 'info');
      },
    });
  };

  // Toggle completion status
  const handleToggleStatus = (id: string) => {
    const updated = deadlines.map((d) => {
      if (d.id === id) {
        const nextStatus: DeadlineStatus = d.status === 'completed' ? 'in_progress' : 'completed';
        return { ...d, status: nextStatus };
      }
      return d;
    });
    updateAndPersistDeadlines(updated);
  };

  // Toggle subtask
  const handleToggleSubtask = (deadlineId: string, subtaskId: string) => {
    const updated = deadlines.map((d) => {
      if (d.id === deadlineId) {
        const nextSubtasks = d.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...d, subtasks: nextSubtasks };
      }
      return d;
    });
    updateAndPersistDeadlines(updated);
  };

  // Create or Update Deadline
  const handleSaveDeadline = async (
    data: Partial<Deadline>,
    autoSyncToCalendar: boolean
  ) => {
    if (editingDeadline) {
      // Update
      const updatedDeadline: Deadline = {
        ...editingDeadline,
        ...data,
      } as Deadline;

      const nextList = deadlines.map((d) =>
        d.id === editingDeadline.id ? updatedDeadline : d
      );
      updateAndPersistDeadlines(nextList);
      setIsDeadlineModalOpen(false);
      setEditingDeadline(null);
      showToast('Deadline updated successfully!', 'success');

      if (autoSyncToCalendar && accessToken) {
        handleSyncDeadline(updatedDeadline);
      }
    } else {
      // Create new
      const newDeadline: Deadline = {
        id: `dl_${Date.now()}`,
        title: data.title || 'Untitled',
        courseId: data.courseId || courses[0]?.id || 'c1',
        type: data.type || 'assignment',
        dueDate: data.dueDate || new Date().toISOString().slice(0, 16),
        priority: data.priority || 'medium',
        status: 'not_started',
        weightPercentage: data.weightPercentage,
        estimatedHours: data.estimatedHours,
        completedHours: 0,
        notes: data.notes,
        subtasks: data.subtasks || [],
        createdAt: new Date().toISOString(),
      };

      const nextList = [newDeadline, ...deadlines];
      updateAndPersistDeadlines(nextList);
      setIsDeadlineModalOpen(false);
      showToast('New deadline added!', 'success');

      // Schedule push notification reminder test
      sendPushNotification(
        `📌 New Deadline Tracked`,
        `"${newDeadline.title}" is due on ${new Date(newDeadline.dueDate).toLocaleDateString()}`,
        { sound: settings.soundEnabled, deadlineId: newDeadline.id }
      );

      if (autoSyncToCalendar && accessToken) {
        handleSyncDeadline(newDeadline);
      }
    }
  };

  // Filter deadlines
  const filteredDeadlines = deadlines.filter((d) => {
    if (selectedCourseFilter !== 'all' && d.courseId !== selectedCourseFilter) return false;
    if (statusFilter === 'active' && d.status === 'completed') return false;
    if (statusFilter === 'completed' && d.status !== 'completed') return false;
    if (statusFilter === 'urgent') {
      const diffHours = (new Date(d.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      if (d.status === 'completed' || diffHours > 48) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const course = courses.find((c) => c.id === d.courseId);
      const matchCourse = course?.code.toLowerCase().includes(q) || course?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchCourse) return false;
    }
    return true;
  });

  const urgentCount = deadlines.filter((d) => {
    if (d.status === 'completed') return false;
    const diffHours = (new Date(d.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return diffHours <= 48;
  }).length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4 text-slate-900 font-sans">
      {/* Desktop Top Toolbar (Switch frame mode, view docs, quick actions) */}
      <header className="w-full max-w-md sm:max-w-xl mb-3 hidden sm:flex items-center justify-between px-3 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
            DP
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">DuePulse Mobile</h1>
            <p className="text-[11px] text-slate-400">Student Deadline & Calendar Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileFrameMode(!isMobileFrameMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors border border-slate-700"
            title="Toggle between Mobile Simulator Frame and Full Screen View"
          >
            {isMobileFrameMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Full Width</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container (Mobile App Shell) */}
      <main
        className={`w-full bg-slate-100 flex flex-col relative transition-all duration-300 overflow-hidden ${
          isMobileFrameMode
            ? 'max-w-md sm:rounded-[44px] sm:shadow-2xl sm:border-[10px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 sm:h-[844px]'
            : 'max-w-3xl sm:rounded-3xl shadow-xl border border-slate-800 min-h-[90vh]'
        }`}
      >
        {/* Smartphone Speaker & Dynamic Island simulation (in frame mode) */}
        {isMobileFrameMode && (
          <div className="w-full bg-slate-900 text-white px-7 pt-3 pb-2 flex items-center justify-between text-xs font-semibold shrink-0 select-none">
            <span>{simTime || '9:41'}</span>
            <div className="w-20 h-4 bg-black rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* In-App Header */}
        <div className="bg-white border-b border-slate-200/80 px-4 py-3 shrink-0 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900 leading-none">
                DuePulse
              </h2>
              <span className="text-[10px] font-semibold text-indigo-600 tracking-wide uppercase">
                {activeTab === 'deadlines'
                  ? 'Active Deadlines'
                  : activeTab === 'timeline'
                  ? 'Chronological View'
                  : activeTab === 'calendar'
                  ? 'Calendar Sync'
                  : 'Analytics & Hours'}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5">
            {/* AI Study Coach Button */}
            <button
              onClick={() => setIsAiCoachOpen(true)}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold text-[11px] shadow-xs hover:shadow-md transition-all active:scale-95"
              title="Chat with Gemini AI Study Coach"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>AI Coach</span>
            </button>

            {/* Courses Manager Button */}
            <button
              onClick={() => setIsCoursesModalOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Manage Courses & Colors"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Notification Center Button */}
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Push Notifications Settings & Alerts"
            >
              <Bell className="w-4 h-4" />
              {settings.enabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-40 animate-in slide-in-from-top-2 duration-200">
            <div
              className={`p-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center gap-2 border ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900 text-white border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="flex-1">{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Scrollable Content View */}
        <div className="flex-1 overflow-y-auto px-4 py-3 hide-scrollbar">
          {/* TAB 1: DEADLINES LIST */}
          {activeTab === 'deadlines' && (
            <div className="space-y-3 pb-16">
              {/* AI Study Coach Interactive Card */}
              <div
                onClick={() => setIsAiCoachOpen(true)}
                className="p-3.5 rounded-2xl bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-xs flex items-center justify-between cursor-pointer hover:opacity-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                    <Bot className="w-4 h-4 text-indigo-200" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold leading-tight">Gemini AI Study Coach</p>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/40 text-indigo-200 font-medium">
                        Search & Voice
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-200 mt-0.5">
                      Ask study questions, search research papers, or dictate audio
                    </p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              </div>

              {/* Search and Quick Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search assignments or courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      statusFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All ({deadlines.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('urgent')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                      statusFilter === 'urgent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Flame className="w-3 h-3 fill-current" />
                    Urgent ({urgentCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      statusFilter === 'active'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      statusFilter === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Finished
                  </button>
                </div>

                {/* Course selector chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar text-[11px]">
                  <button
                    onClick={() => setSelectedCourseFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      selectedCourseFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    All Courses
                  </button>
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourseFilter(c.id)}
                      className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                        selectedCourseFilter === c.id
                          ? 'text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                      style={{
                        backgroundColor: selectedCourseFilter === c.id ? c.color : undefined,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadlines List */}
              <div className="space-y-3 pt-1">
                {filteredDeadlines.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No deadlines match your filters</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tap the plus button below to add an assignment or clear search.
                    </p>
                  </div>
                ) : (
                  filteredDeadlines.map((dl) => {
                    const course = courses.find((c) => c.id === dl.courseId);
                    return (
                      <DeadlineCard
                        key={dl.id}
                        deadline={dl}
                        course={course}
                        onToggleStatus={handleToggleStatus}
                        onToggleSubtask={handleToggleSubtask}
                        onEdit={(d) => {
                          setEditingDeadline(d);
                          setIsDeadlineModalOpen(true);
                        }}
                        onDelete={requestDeleteDeadline}
                        onSyncCalendar={handleSyncDeadline}
                        onStartFocus={(d) => setFocusDeadline(d)}
                        isCalendarConnected={Boolean(user && accessToken)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <TimelineView
              deadlines={deadlines}
              courses={courses}
              onToggleStatus={handleToggleStatus}
              onToggleSubtask={handleToggleSubtask}
              onEdit={(d) => {
                setEditingDeadline(d);
                setIsDeadlineModalOpen(true);
              }}
              onDelete={requestDeleteDeadline}
              onSyncCalendar={handleSyncDeadline}
              onStartFocus={(d) => setFocusDeadline(d)}
              isCalendarConnected={Boolean(user && accessToken)}
            />
          )}

          {/* TAB 3: CALENDAR SYNC */}
          {activeTab === 'calendar' && (
            <CalendarSyncView
              user={user}
              accessToken={accessToken}
              deadlines={deadlines}
              courses={courses}
              onGoogleSignIn={handleGoogleSignIn}
              onLogout={handleLogout}
              onSyncDeadline={handleSyncDeadline}
              onSyncAllPending={handleSyncAllPending}
              onImportEvents={handleImportEvents}
              onRequestDeleteCalendarEvent={requestDeleteCalendarEvent}
              isSyncingAll={isSyncingAll}
            />
          )}

          {/* TAB 4: ANALYTICS & STUDY PROGRESS */}
          {activeTab === 'analytics' && (
            <AnalyticsView deadlines={deadlines} courses={courses} />
          )}
        </div>

        {/* Floating Action Button (Add Deadline) */}
        <div className="absolute right-4 bottom-20 z-20">
          <button
            onClick={() => {
              setEditingDeadline(null);
              setIsDeadlineModalOpen(true);
            }}
            className="w-13 h-13 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center transition-all cursor-pointer"
            title="Create New Deadline"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Mobile App Bottom Tab Bar */}
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 shrink-0 flex items-center justify-around z-30 shadow-lg">
          <button
            onClick={() => setActiveTab('deadlines')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'deadlines'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            <span className="text-[10px]">Deadlines</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'timeline'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl relative transition-all ${
              activeTab === 'calendar'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px]">Sync G-Cal</span>
            {user && (
              <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'analytics'
                ? 'text-indigo-600 font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Workload</span>
          </button>
        </div>
      </main>

      {/* MODALS */}
      {/* 1. Deadline Create/Edit Modal */}
      <DeadlineModal
        isOpen={isDeadlineModalOpen}
        editingDeadline={editingDeadline}
        courses={courses}
        isCalendarConnected={Boolean(user && accessToken)}
        onSave={handleSaveDeadline}
        onClose={() => {
          setIsDeadlineModalOpen(false);
          setEditingDeadline(null);
        }}
      />

      {/* 2. Notification Center & Push Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        settings={settings}
        notificationsHistory={notificationsHistory}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
        onClearHistory={() => {
          localStorage.removeItem('duepulse_notifications_history');
          setNotificationsHistory([]);
        }}
        onClose={() => setIsNotificationModalOpen(false)}
      />

      {/* 3. Focus Timer Modal */}
      <FocusTimerModal
        isOpen={Boolean(focusDeadline)}
        deadline={focusDeadline}
        course={courses.find((c) => c.id === focusDeadline?.courseId)}
        onClose={() => setFocusDeadline(null)}
        onLogStudyTime={(deadlineId, hours) => {
          const updated = deadlines.map((d) =>
            d.id === deadlineId
              ? { ...d, completedHours: (d.completedHours || 0) + hours }
              : d
          );
          updateAndPersistDeadlines(updated);
          showToast(`Logged ${Math.round(hours * 60)} minutes of focus time!`, 'success');
        }}
      />

      {/* 4. Courses Management Modal */}
      <CoursesModal
        isOpen={isCoursesModalOpen}
        courses={courses}
        onSaveCourses={(newCourses) => {
          setCourses(newCourses);
          saveCourses(newCourses);
        }}
        onClose={() => setIsCoursesModalOpen(false)}
      />

      {/* 5. Destructive Operations Confirmation Modal (Mandatory for Google Calendar & Deletions) */}
      <ConfirmationModal
        isOpen={confirmationConfig.isOpen}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        itemDescription={confirmationConfig.itemDescription}
        confirmLabel={confirmationConfig.confirmLabel}
        isDestructive={confirmationConfig.isDestructive}
        type={confirmationConfig.type}
        onConfirm={confirmationConfig.onConfirm}
        onCancel={() => setConfirmationConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 6. AI Study Coach Modal (Gemini 3.5, Google Search Grounding & Audio Transcription) */}
      <AiStudyCoachModal
        isOpen={isAiCoachOpen}
        deadlines={deadlines}
        courses={courses}
        onClose={() => setIsAiCoachOpen(false)}
      />
    </div>
  );
}

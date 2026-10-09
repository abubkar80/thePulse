import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle,
  X,
  Send,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { NotificationSettings, PushNotificationRecord } from '../types/deadline';
import {
  isPushSupported,
  getPushPermissionState,
  requestPushPermission,
  sendPushNotification,
  playNotificationChime,
} from '../services/notificationService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  settings: NotificationSettings;
  notificationsHistory: PushNotificationRecord[];
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  settings,
  notificationsHistory,
  onUpdateSettings,
  onClearHistory,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(getPushPermissionState());
  const [testSent, setTestSent] = useState(false);
  const isSupported = isPushSupported();

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestPushPermission();
    setPermission(perm);
    if (perm === 'granted') {
      onUpdateSettings({ ...settings, enabled: true });
      sendPushNotification(
        '🎉 Notifications Enabled!',
        'You will now receive timely alerts for upcoming assignments and study sessions.',
        { sound: settings.soundEnabled }
      );
    }
  };

  const handleSendTestPush = () => {
    setTestSent(true);
    sendPushNotification(
      '⏰ DuePulse Push Alert',
      'Test successful! You have Problem Set 4 due in 8 hours for CS 301.',
      { sound: settings.soundEnabled }
    );
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleToggleSound = () => {
    const nextSound = !settings.soundEnabled;
    onUpdateSettings({ ...settings, soundEnabled: nextSound });
    if (nextSound) {
      playNotificationChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div 
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Push Notifications</h3>
              <p className="text-xs text-slate-500">Alerts, chimes & deadline countdowns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto hide-scrollbar">
          {/* Permission status card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                System Push Status
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  permission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : permission === 'denied'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {permission}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              {permission === 'granted'
                ? 'Push notifications are active. You will receive system alerts even when the tab is backgrounded.'
                : permission === 'denied'
                ? 'Push notifications are blocked in your browser settings. Please allow notifications in site permissions.'
                : 'Grant browser permission to receive lock-screen and banner alerts for assignment deadlines.'}
            </p>

            <div className="flex gap-2">
              {permission !== 'granted' ? (
                <button
                  onClick={handleRequestPermission}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Enable Push Notifications
                </button>
              ) : (
                <button
                  onClick={handleSendTestPush}
                  disabled={testSent}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testSent ? 'Notification Sent! 🚀' : 'Send Test Push Alert'}
                </button>
              )}

              <button
                onClick={handleToggleSound}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  settings.soundEnabled
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
                title={settings.soundEnabled ? 'Mute chimes' : 'Enable chimes'}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Schedule Reminders Options */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Deadline Reminder Windows
            </h4>

            <div className="space-y-2">
              {/* 1 hour before */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">1 Hour Before</p>
                    <p className="text-[11px] text-slate-500">Urgent final submission reminder</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify1HourBefore}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, notify1HourBefore: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* 24 hours before */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">24 Hours Before (1 Day)</p>
                    <p className="text-[11px] text-slate-500">Advance warning for drafting and review</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify24HoursBefore}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, notify24HoursBefore: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* 3 days before */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">3 Days Before</p>
                    <p className="text-[11px] text-slate-500">Early heads-up for long essays and projects</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notify3DaysBefore}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, notify3DaysBefore: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>

              {/* Daily study digest */}
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Daily Morning Digest</p>
                    <p className="text-[11px] text-slate-500">Summary of today's upcoming deadlines at 8:00 AM</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dailyMorningDigest}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, dailyMorningDigest: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Alert History / Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Notification History ({notificationsHistory.length})
              </h4>
              {notificationsHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear log
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-40 overflow-y-auto bg-slate-50/50">
              {notificationsHistory.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-400">
                  No alerts fired yet. They will appear here when triggered.
                </p>
              ) : (
                notificationsHistory.map((item) => (
                  <div key={item.id} className="p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">{item.body}</p>
                  </div>
                ))
              )}
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

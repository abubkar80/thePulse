export type Priority = 'low' | 'medium' | 'high';
export type DeadlineStatus = 'not_started' | 'in_progress' | 'completed';
export type AssignmentType = 'assignment' | 'exam' | 'project' | 'essay' | 'quiz' | 'lab';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Course {
  id: string;
  code: string; // e.g. "CS 301"
  name: string; // e.g. "Data Structures & Algorithms"
  color: string; // e.g. "#4F46E5"
}

export interface Deadline {
  id: string;
  title: string;
  courseId: string;
  type: AssignmentType;
  dueDate: string; // ISO string: "2026-10-15T23:59"
  priority: Priority;
  status: DeadlineStatus;
  weightPercentage?: number; // e.g., 20%
  estimatedHours?: number;
  completedHours?: number;
  notes?: string;
  subtasks: Subtask[];
  googleCalendarEventId?: string;
  googleCalendarSyncedAt?: string;
  googleCalendarHtmlLink?: string;
  reminderMinutesBefore?: number[]; // e.g. [60, 1440]
  createdAt: string;
}

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  notify1HourBefore: boolean;
  notify24HoursBefore: boolean;
  notify3DaysBefore: boolean;
  dailyMorningDigest: boolean;
  dailyDigestTime: string; // "08:00"
  soundEnabled: boolean;
}

export interface PushNotificationRecord {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  deadlineId?: string;
  read: boolean;
}

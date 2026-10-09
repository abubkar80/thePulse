import { Deadline, Course, NotificationSettings } from '../types/deadline';

const DEADLINES_KEY = 'duepulse_deadlines';
const COURSES_KEY = 'duepulse_courses';
const SETTINGS_KEY = 'duepulse_settings';

export const INITIAL_COURSES: Course[] = [
  { id: 'c1', code: 'CS 301', name: 'Data Structures & Algorithms', color: '#6366F1' }, // Indigo
  { id: 'c2', code: 'MATH 240', name: 'Linear Algebra & Calculus II', color: '#EC4899' }, // Pink
  { id: 'c3', code: 'PHYS 150', name: 'Physics for Engineers', color: '#10B981' }, // Emerald
  { id: 'c4', code: 'ENG 102', name: 'Academic Research & Writing', color: '#F59E0B' }, // Amber
  { id: 'c5', code: 'BIO 210', name: 'Cellular Genetics & Lab', color: '#06B6D4' }, // Cyan
];

export const getInitialDeadlines = (): Deadline[] => {
  const now = new Date();
  
  // Create relative dates so countdowns are dynamic and immediately interesting
  const plusHours = (h: number) => {
    const d = new Date(now.getTime() + h * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const plusDays = (days: number, hour = 23, minute = 59) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return [
    {
      id: 'd1',
      title: 'Problem Set 4: Red-Black Trees & Heap Sort',
      courseId: 'c1',
      type: 'assignment',
      dueDate: plusHours(8), // Due in 8 hours (Urgent!)
      priority: 'high',
      status: 'in_progress',
      weightPercentage: 15,
      estimatedHours: 5,
      completedHours: 3.5,
      notes: 'Remember to attach runtime complexity proofs for exercise 3.',
      subtasks: [
        { id: 's1', title: 'Implement RB-Tree insertion fixes', completed: true },
        { id: 's2', title: 'Write runtime analysis proof', completed: true },
        { id: 's3', title: 'Pass unit tests in grader sandbox', completed: false },
        { id: 's4', title: 'Generate PDF export and submit to portal', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd2',
      title: 'Midterm Exam: Eigenvalues & Vector Spaces',
      courseId: 'c2',
      type: 'exam',
      dueDate: plusDays(2, 14, 0), // In 2 days at 2:00 PM
      priority: 'high',
      status: 'in_progress',
      weightPercentage: 30,
      estimatedHours: 12,
      completedHours: 6,
      notes: 'Formula sheet allowed (1 double-sided page). Focus on diagonalization.',
      subtasks: [
        { id: 's5', title: 'Review lecture notes 6-12', completed: true },
        { id: 's6', title: 'Solve 2024 practice exam', completed: true },
        { id: 's7', title: 'Prepare cheat sheet / formula summary', completed: false },
        { id: 's8', title: 'Attend professor office hours', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd3',
      title: 'Literature Review Essay: Modern AI Ethics',
      courseId: 'c4',
      type: 'essay',
      dueDate: plusDays(5, 23, 59),
      priority: 'medium',
      status: 'not_started',
      weightPercentage: 20,
      estimatedHours: 8,
      completedHours: 0,
      notes: 'Minimum 2,500 words with at least 8 peer-reviewed citations in APA 7.',
      subtasks: [
        { id: 's9', title: 'Select 8 academic papers from IEEE & ACM', completed: false },
        { id: 's10', title: 'Construct argumentative thesis outline', completed: false },
        { id: 's11', title: 'Write first draft (Intro + 3 Body themes)', completed: false },
        { id: 's12', title: 'Peer review & bibliography check', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd4',
      title: 'Lab 5 Report: Electromagnetism & Induction',
      courseId: 'c3',
      type: 'lab',
      dueDate: plusDays(7, 18, 0),
      priority: 'medium',
      status: 'not_started',
      weightPercentage: 10,
      estimatedHours: 4,
      completedHours: 0,
      notes: 'Include oscilloscope screenshots and error margin calculations.',
      subtasks: [
        { id: 's13', title: 'Process raw CSV data in Python/Excel', completed: false },
        { id: 's14', title: 'Plot magnetic flux vs induced voltage', completed: false },
        { id: 's15', title: 'Write error discussion section', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd5',
      title: 'Weekly Quiz 7: DNA Replication & Transcription',
      courseId: 'c5',
      type: 'quiz',
      dueDate: plusDays(3, 11, 30),
      priority: 'low',
      status: 'not_started',
      weightPercentage: 5,
      estimatedHours: 2,
      completedHours: 0,
      notes: '20 multiple choice questions in 30 minutes on Canvas.',
      subtasks: [
        { id: 's16', title: 'Review chapter 14 flashcards', completed: false },
        { id: 's17', title: 'Take practice quiz', completed: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ];
};

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  notify1HourBefore: true,
  notify24HoursBefore: true,
  notify3DaysBefore: true,
  dailyMorningDigest: true,
  dailyDigestTime: '08:00',
  soundEnabled: true,
};

export const loadDeadlines = (): Deadline[] => {
  try {
    const raw = localStorage.getItem(DEADLINES_KEY);
    if (!raw) {
      const initial = getInitialDeadlines();
      saveDeadlines(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialDeadlines();
  }
};

export const saveDeadlines = (deadlines: Deadline[]) => {
  try {
    localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
  } catch (e) {
    console.error('Failed to save deadlines to localStorage', e);
  }
};

export const loadCourses = (): Course[] => {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    if (!raw) {
      saveCourses(INITIAL_COURSES);
      return INITIAL_COURSES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_COURSES;
  }
};

export const saveCourses = (courses: Course[]) => {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error('Failed to save courses to localStorage', e);
  }
};

export const loadSettings = (): NotificationSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
};

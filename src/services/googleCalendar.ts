import { Deadline, Course, GoogleCalendarEventItem } from '../types/deadline';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface SyncResult {
  eventId: string;
  htmlLink: string;
}

export const syncDeadlineToGoogleCalendar = async (
  deadline: Deadline,
  course: Course | undefined,
  accessToken: string
): Promise<SyncResult> => {
  const coursePrefix = course ? `[${course.code}] ` : '';
  const summary = `${coursePrefix}${deadline.title} (Due)`;
  
  // End time is due date
  const dueDateObj = new Date(deadline.dueDate);
  // Start time is 1 hour before due date (or 30 mins) for a calendar block
  const startDateObj = new Date(dueDateObj.getTime() - 60 * 60 * 1000);

  const subtasksList = deadline.subtasks.length > 0
    ? '\n\nChecklist:\n' + deadline.subtasks.map(s => `${s.completed ? '✅' : '⬜'} ${s.title}`).join('\n')
    : '';

  const description = `📚 Course: ${course ? `${course.code} - ${course.name}` : 'General'}
⚠️ Priority: ${deadline.priority.toUpperCase()}
📌 Type: ${deadline.type}
${deadline.weightPercentage ? `⚖️ Weight: ${deadline.weightPercentage}%\n` : ''}${deadline.estimatedHours ? `⏱️ Est. Study Time: ${deadline.estimatedHours} hours\n` : ''}${deadline.notes ? `\nNotes:\n${deadline.notes}` : ''}${subtasksList}

Tracked via DuePulse Mobile Student Assistant`;

  const eventPayload = {
    summary,
    description,
    start: {
      dateTime: startDateObj.toISOString(),
    },
    end: {
      dateTime: dueDateObj.toISOString(),
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },     // 1 hour before
        { method: 'popup', minutes: 1440 },   // 24 hours before
        { method: 'popup', minutes: 4320 },   // 3 days before
      ],
    },
    colorId: course ? mapColorToGoogleColorId(course.color) : '11',
  };

  // If already synced, update the event
  if (deadline.googleCalendarEventId) {
    const res = await fetch(`${CALENDAR_API_BASE}/${deadline.googleCalendarEventId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (res.status === 404) {
      // Event might have been deleted in Google Calendar, create new
      return createNewCalendarEvent(eventPayload, accessToken);
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to update calendar event: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return {
      eventId: data.id,
      htmlLink: data.htmlLink,
    };
  }

  // Create new event
  return createNewCalendarEvent(eventPayload, accessToken);
};

const createNewCalendarEvent = async (
  eventPayload: unknown,
  accessToken: string
): Promise<SyncResult> => {
  const res = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create calendar event: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
};

export const deleteCalendarEvent = async (
  eventId: string,
  accessToken: string
): Promise<boolean> => {
  const res = await fetch(`${CALENDAR_API_BASE}/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 404) {
    return true; // Already deleted
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete event: ${res.status} ${errText}`);
  }

  return true;
};

export const fetchUpcomingGoogleEvents = async (
  accessToken: string
): Promise<GoogleCalendarEventItem[]> => {
  const now = new Date();
  const oneMonthAhead = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const queryParams = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: oneMonthAhead.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '30',
  });

  const res = await fetch(`${CALENDAR_API_BASE}?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch events: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || 'Untitled Event',
    description: item.description,
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
    status: item.status,
  }));
};

// Maps hex/Tailwind style color to Google Calendar colorId (1 to 11)
function mapColorToGoogleColorId(hex: string): string {
  // Google palette: 1 Lavender, 2 Sage, 3 Grape, 4 Flamingo, 5 Banana, 6 Tangerine, 7 Peacock, 8 Graphite, 9 Blueberry, 10 Basil, 11 Tomato
  if (hex.includes('ef4444') || hex.includes('red')) return '11';
  if (hex.includes('f59e0b') || hex.includes('amber') || hex.includes('orange')) return '6';
  if (hex.includes('10b981') || hex.includes('green') || hex.includes('emerald')) return '10';
  if (hex.includes('06b6d4') || hex.includes('cyan') || hex.includes('teal')) return '7';
  if (hex.includes('8b5cf6') || hex.includes('purple') || hex.includes('violet')) return '3';
  if (hex.includes('ec4899') || hex.includes('pink')) return '4';
  return '9'; // Blueberry / default blue
}

const CLOCKIFY_API = 'https://api.clockify.me/api/v1';

// Format seconds as "Xh Ym"
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Format seconds as decimal hours, e.g. 1.5
function toHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

// Parse ISO 8601 duration PT1H23M45S → seconds
function parseDuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
}

// Calculate elapsed seconds from a start time ISO string
function elapsedFrom(startStr) {
  if (!startStr) return 0;
  return Math.floor((Date.now() - new Date(startStr).getTime()) / 1000);
}

// Format a Date as an ISO 8601 string with the local UTC offset (e.g. 2026-04-22T07:00:00+02:00)
// so Clockify stores the correct wall-clock time regardless of the JS environment's UTC offset.
function toLocalISOString(date) {
  const off = -date.getTimezoneOffset(); // minutes ahead of UTC
  const sign = off >= 0 ? '+' : '-';
  const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`;
}

// Resolve a human date string to a midnight-local Date object.
// Accepts: "today", "yesterday", day names ("Monday"), or ISO date strings ("2026-04-21").
function resolveDate(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!dateStr || dateStr.toLowerCase() === 'today') return today;
  if (dateStr.toLowerCase() === 'yesterday') return new Date(today.getTime() - 86400000);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(dateStr.toLowerCase());
  if (dayIndex !== -1) {
    let diff = today.getDay() - dayIndex;
    if (diff <= 0) diff += 7;
    return new Date(today.getTime() - diff * 86400000);
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed)) { parsed.setHours(0, 0, 0, 0); return parsed; }
  throw new Error(`Cannot parse date: "${dateStr}"`);
}

export function createClockifyHandlers(apiKey) {
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };
  let _userId = null;
  let _workspaceId = null;
  let _projects = null;

  async function ensureUser() {
    if (_userId) return;
    const res = await fetch(`${CLOCKIFY_API}/user`, { headers });
    if (!res.ok) throw new Error(`Clockify auth failed (${res.status})`);
    const u = await res.json();
    _userId = u.id;
    _workspaceId = u.defaultWorkspace;
  }

  async function getProjects() {
    if (_projects) return _projects;
    await ensureUser();
    const res = await fetch(`${CLOCKIFY_API}/workspaces/${_workspaceId}/projects?page-size=50`, { headers });
    if (!res.ok) return [];
    _projects = await res.json();
    return _projects;
  }

  async function getEntriesForDate(date) {
    await ensureUser();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    const url = `${CLOCKIFY_API}/workspaces/${_workspaceId}/user/${_userId}/time-entries?start=${start.toISOString()}&end=${end.toISOString()}&page-size=50`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Clockify entries failed (${res.status})`);
    return res.json();
  }

  async function getTodayEntries() {
    return getEntriesForDate(new Date());
  }

  const handlers = {
    clockify_get_today_hours: async () => {
      const entries = await getTodayEntries();
      const projects = await getProjects();
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
      let totalSeconds = 0;
      let current = null;

      for (const e of entries) {
        if (!e.timeInterval.end) {
          // Running entry
          const elapsed = elapsedFrom(e.timeInterval.start);
          current = {
            id: e.id,
            description: e.description || 'No description',
            project: projectMap[e.projectId] || 'Unknown project',
            elapsed: formatDuration(elapsed),
            elapsedSeconds: elapsed,
            startedAt: e.timeInterval.start,
          };
          totalSeconds += elapsed;
        } else {
          totalSeconds += parseDuration(e.timeInterval.duration);
        }
      }

      return {
        totalHours: toHours(totalSeconds),
        totalFormatted: formatDuration(totalSeconds),
        currentEntry: current,
        entryCount: entries.length,
      };
    },

    clockify_get_current_entry: async () => {
      const data = await handlers.clockify_get_today_hours();
      return data.currentEntry || { running: false };
    },

    clockify_start_timer: async ({ description, projectId }) => {
      await ensureUser();
      const body = {
        start: new Date().toISOString(),
        description: description || '',
      };
      if (projectId) body.projectId = projectId;

      const res = await fetch(`${CLOCKIFY_API}/workspaces/${_workspaceId}/time-entries`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Start timer failed (${res.status})`);
      const entry = await res.json();
      return { success: true, id: entry.id, description: entry.description, startedAt: entry.timeInterval.start };
    },

    clockify_stop_timer: async () => {
      await ensureUser();
      const res = await fetch(`${CLOCKIFY_API}/workspaces/${_workspaceId}/user/${_userId}/time-entries`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ end: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Stop timer failed (${res.status})`);
      const entry = await res.json();
      const duration = parseDuration(entry.timeInterval.duration);
      return { success: true, duration: formatDuration(duration), durationSeconds: duration };
    },

    clockify_list_today_entries: async () => {
      const entries = await getTodayEntries();
      const projects = await getProjects();
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
      return entries.map(e => ({
        id: e.id,
        description: e.description || 'No description',
        project: projectMap[e.projectId] || 'Unknown',
        duration: e.timeInterval.end ? formatDuration(parseDuration(e.timeInterval.duration)) : `Running (${formatDuration(elapsedFrom(e.timeInterval.start))})`,
        running: !e.timeInterval.end,
      }));
    },

    clockify_list_projects: async () => {
      const projects = await getProjects();
      return projects.map(p => ({ id: p.id, name: p.name, color: p.color }));
    },

    clockify_log_hours: async ({ date, hours, projectId, description, startTime, endTime }) => {
      await ensureUser();
      const day = resolveDate(date || 'today');
      const [startHour, startMin] = (startTime || '09:00').split(':').map(Number);
      const start = new Date(day);
      start.setHours(startHour, startMin, 0, 0);

      let end;
      if (endTime && endTime.toLowerCase() !== 'now') {
        const [endHour, endMin] = endTime.split(':').map(Number);
        end = new Date(day);
        end.setHours(endHour, endMin, 0, 0);
      } else if (endTime?.toLowerCase() === 'now' || !hours) {
        end = new Date(); // current time
      } else {
        end = new Date(start.getTime() + hours * 3600000);
      }

      const computedHours = Math.round((end - start) / 3600000 * 100) / 100;

      // Clockify rejects entries with end in the future
      if (end > new Date()) end = new Date();

      const body = { start: toLocalISOString(start), end: toLocalISOString(end), description: description || '' };
      if (projectId) body.projectId = projectId;

      const res = await fetch(`${CLOCKIFY_API}/workspaces/${_workspaceId}/time-entries`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Log hours failed (${res.status}): ${text}`);
      }
      const entry = await res.json();
      const projects = await getProjects();
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
      return {
        success: true,
        id: entry.id,
        date: day.toDateString(),
        hours: computedHours,
        description: entry.description || '',
        project: projectMap[entry.projectId] || 'No project',
        start: entry.timeInterval.start,
        end: entry.timeInterval.end,
      };
    },

    clockify_get_entries_for_date: async ({ date }) => {
      const day = resolveDate(date || 'today');
      const entries = await getEntriesForDate(day);
      const projects = await getProjects();
      const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
      let totalSeconds = 0;
      const mapped = entries.map(e => {
        const secs = e.timeInterval.end ? parseDuration(e.timeInterval.duration) : elapsedFrom(e.timeInterval.start);
        totalSeconds += secs;
        return {
          id: e.id,
          description: e.description || 'No description',
          project: projectMap[e.projectId] || 'Unknown',
          duration: e.timeInterval.end ? formatDuration(secs) : `Running (${formatDuration(secs)})`,
          running: !e.timeInterval.end,
        };
      });
      return { date: day.toDateString(), totalHours: toHours(totalSeconds), totalFormatted: formatDuration(totalSeconds), entries: mapped };
    },

    clockify_delete_entry: async ({ entryId }) => {
      await ensureUser();
      const res = await fetch(`${CLOCKIFY_API}/workspaces/${_workspaceId}/time-entries/${entryId}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) throw new Error(`Delete entry failed (${res.status})`);
      return { success: true, deletedId: entryId };
    },
  };

  return handlers;
}

// Returns the current running entry's elapsed data for dashboard polling
export async function fetchHoursData(apiKey) {
  if (!apiKey) return null;
  const handlers = createClockifyHandlers(apiKey);
  return handlers.clockify_get_today_hours();
}

export const clockifyIntegration = {
  name: 'clockify',
  description: 'Clockify time tracking — start/stop timers, get today\'s hours',
  functionDeclarations: [
    {
      name: 'clockify_get_today_hours',
      description: 'Get total hours tracked today and the currently running timer',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'clockify_get_current_entry',
      description: 'Get the currently running Clockify time entry',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'clockify_start_timer',
      description: 'Start a new Clockify time entry',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What you are working on' },
          projectId: { type: 'string', description: 'Optional project ID from clockify_list_projects' },
        },
      },
    },
    {
      name: 'clockify_stop_timer',
      description: 'Stop the currently running Clockify time entry',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'clockify_list_today_entries',
      description: 'List all time entries tracked today',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'clockify_list_projects',
      description: 'List available Clockify projects',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'clockify_log_hours',
      description: 'Log hours worked on a specific date (past or today). Provide either hours OR endTime (or both). Use endTime "now" when the user says "till now" or "until now".',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to log hours for. Accepts "today", "yesterday", day names ("Monday"), or ISO dates ("2026-04-21"). Defaults to today.' },
          hours: { type: 'number', description: 'Number of hours to log (e.g. 8, 1.5). Optional if endTime is provided.' },
          startTime: { type: 'string', description: 'Start time in HH:MM 24h format. Defaults to 09:00.' },
          endTime: { type: 'string', description: 'End time in HH:MM 24h format, or "now" to use the current time. Use this instead of hours when the user specifies an end time.' },
          projectId: { type: 'string', description: 'Project ID from clockify_list_projects (optional)' },
          description: { type: 'string', description: 'Description of the work done' },
        },
      },
    },
    {
      name: 'clockify_get_entries_for_date',
      description: 'Get all time entries and total hours for a specific date (not just today)',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to query. Accepts "today", "yesterday", day names ("Monday"), or ISO dates ("2026-04-21").' },
        },
        required: ['date'],
      },
    },
    {
      name: 'clockify_delete_entry',
      description: 'Delete a Clockify time entry by ID. Use clockify_get_entries_for_date to find the ID first.',
      parameters: {
        type: 'object',
        properties: {
          entryId: { type: 'string', description: 'The Clockify time entry ID to delete' },
        },
        required: ['entryId'],
      },
    },
  ],
};

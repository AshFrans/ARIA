import { createGitHubClient } from '../lib/github';
import { todayPath, formatNoteDate, currentTimeLabel } from '../lib/markdown';

function notePath() {
  return `notes/${todayPath()}.md`;
}

function newNoteContent() {
  return `# Notes — ${formatNoteDate()}\n\n`;
}

export function createNotesHandlers(githubConfig) {
  const gh = createGitHubClient(githubConfig);
  let _cachedNote = null; // { content, sha }

  async function loadNote() {
    const path = notePath();
    _cachedNote = await gh.getFile(path);
    if (!_cachedNote) {
      const content = newNoteContent();
      const result = await gh.putFile(path, content, null, `Create note ${todayPath()} via Aria`);
      _cachedNote = { content, sha: result.content.sha };
    }
    return _cachedNote;
  }

  const handlers = {
    notes_get_today: async () => {
      const note = await loadNote();
      return { content: note.content, date: todayPath() };
    },

    notes_append: async ({ entry }) => {
      const note = await loadNote();
      const time = currentTimeLabel();
      const newSection = `\n## ${time}\n${entry}\n`;
      const updated = note.content + newSection;
      const path = notePath();
      const result = await gh.putFile(path, updated, _cachedNote.sha, `Append note entry via Aria`);
      _cachedNote = { content: updated, sha: result.content.sha };
      return { success: true, time, entry };
    },

    notes_replace_content: async ({ content }) => {
      const note = await loadNote();
      const path = notePath();
      const result = await gh.putFile(path, content, _cachedNote.sha, `Edit note via Aria`);
      _cachedNote = { content, sha: result.content.sha };
      return { success: true };
    },
  };

  return handlers;
}

export const notesIntegration = {
  name: 'notes',
  description: 'Daily notes management via GitHub — read and append to today\'s note',
  functionDeclarations: [
    {
      name: 'notes_get_today',
      description: "Get today's note content for the active tab",
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'notes_append',
      description: "Append a new timestamped entry to today's note",
      parameters: {
        type: 'object',
        properties: {
          entry: { type: 'string', description: 'The note content to append' },
        },
        required: ['entry'],
      },
    },
    {
      name: 'notes_replace_content',
      description: "Replace the entire content of today's note. Use this to edit, delete, or reorder sections. Always call notes_get_today first to read the current content, then pass the modified version here.",
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The full new note content to save' },
        },
        required: ['content'],
      },
    },
  ],
};

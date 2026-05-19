import { createGitHubClient } from '../lib/github';
import { storage } from '../lib/storage';

const TODOS_PATH = 'todos/todos.md';
const CLOCKIFY_API = 'https://api.clockify.me/api/v1';
const PROJECT_PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#64748b'];

// Parse a todos.md file into structured todo objects
export function parseTodos(markdown) {
  if (!markdown) return [];
  const todos = [];
  const lines = markdown.split('\n');
  let idCounter = 0;

  for (const line of lines) {
    const match = line.match(/^- \[([ x])\] (.+)$/);
    if (!match) continue;
    const completed = match[1] === 'x';
    const rest = match[2];

    const priorityMatch = rest.match(/#(high|medium|low)/i);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() : null;

    const dueMatch = rest.match(/due:(\S+)/);
    const due = dueMatch ? dueMatch[1] : null;

    // proj:"Multi Word" or proj:SingleWord
    const projectMatch = rest.match(/proj:"([^"]+)"|proj:(\S+)/);
    const project = projectMatch ? (projectMatch[1] ?? projectMatch[2]) : null;

    const text = rest
      .replace(/#(high|medium|low)/gi, '')
      .replace(/due:\S+/g, '')
      .replace(/proj:"[^"]+"/g, '')
      .replace(/proj:\S+/g, '')
      .trim();

    todos.push({ id: String(idCounter++), text, completed, priority, due, project, raw: line });
  }

  return todos;
}

// Serialize todos back to todos.md format, grouped by priority
export function serializeTodos(todos) {
  const lines = ['# Todo List', ''];

  const groups = {
    high: todos.filter(t => t.priority === 'high'),
    medium: todos.filter(t => t.priority === 'medium'),
    low: todos.filter(t => t.priority === 'low'),
    none: todos.filter(t => !t.priority),
  };

  const renderGroup = (label, items) => {
    if (items.length === 0) return;
    lines.push(`## ${label}`);
    const sorted = [...items.filter(t => !t.completed), ...items.filter(t => t.completed)];
    for (const t of sorted) {
      const check = t.completed ? 'x' : ' ';
      const parts = [t.text];
      if (t.priority) parts.push(`#${t.priority}`);
      if (t.due) parts.push(`due:${t.due}`);
      if (t.project) parts.push(t.project.includes(' ') ? `proj:"${t.project}"` : `proj:${t.project}`);
      lines.push(`- [${check}] ${parts.join(' ')}`);
    }
    lines.push('');
  };

  renderGroup('High Priority', groups.high);
  renderGroup('Medium Priority', groups.medium);
  renderGroup('Low Priority', groups.low);
  if (groups.none.length > 0) renderGroup('Other', groups.none);

  return lines.join('\n');
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

// Sort: incomplete with due dates first (ascending), then incomplete without (by priority), completed last
export function sortTodos(todos) {
  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.due && b.due) {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
    }
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
  });
}

export function createTodosHandlers(githubConfig, { clockifyApiKey, customProjects = [], tab = 'Work' } = {}) {
  const gh = createGitHubClient(githubConfig);

  let _cachedFile = null; // { content, sha }

  async function loadTodos() {
    _cachedFile = await gh.getFile(TODOS_PATH);
    if (!_cachedFile) {
      const initial = serializeTodos([]);
      const result = await gh.putFile(TODOS_PATH, initial, null, 'Initialize todos.md via Aria');
      _cachedFile = { content: initial, sha: result.content.sha };
    }
    return { todos: parseTodos(_cachedFile.content), sha: _cachedFile.sha };
  }

  async function saveTodos(todos) {
    const content = serializeTodos(todos);
    const result = await gh.putFile(TODOS_PATH, content, _cachedFile?.sha, 'Update todos via Aria');
    _cachedFile = { content, sha: result.content.sha };
    return todos;
  }

  const handlers = {
    todos_list: async ({ showCompleted } = {}) => {
      const { todos } = await loadTodos();
      const list = showCompleted ? todos : todos.filter(t => !t.completed);
      return { todos: sortTodos(list), total: list.length };
    },

    todos_create: async ({ text, priority, due, project }) => {
      const { todos } = await loadTodos();
      const newTodo = {
        id: String(Date.now()),
        text,
        completed: false,
        priority: priority || null,
        due: due || null,
        project: project || null,
      };
      todos.push(newTodo);
      await saveTodos(todos);
      return { success: true, todo: newTodo };
    },

    todos_complete: async ({ id, text }) => {
      const { todos } = await loadTodos();
      // Match by id or by text substring
      const todo = todos.find(t => t.id === id || (text && t.text.toLowerCase().includes(text.toLowerCase())));
      if (!todo) return { success: false, error: 'Todo not found' };
      todo.completed = true;
      await saveTodos(todos);
      return { success: true, todo };
    },

    todos_delete: async ({ id, text }) => {
      const { todos } = await loadTodos();
      const idx = todos.findIndex(t => t.id === id || (text && t.text.toLowerCase().includes(text.toLowerCase())));
      if (idx === -1) return { success: false, error: 'Todo not found' };
      const [removed] = todos.splice(idx, 1);
      await saveTodos(todos);
      return { success: true, deleted: removed };
    },

    todos_list_projects: async () => {
      const result = [];

      // Clockify projects first (Work tab only)
      if (clockifyApiKey) {
        try {
          const userRes = await fetch(`${CLOCKIFY_API}/user`, { headers: { 'X-Api-Key': clockifyApiKey } });
          if (userRes.ok) {
            const user = await userRes.json();
            const pRes = await fetch(`${CLOCKIFY_API}/workspaces/${user.defaultWorkspace}/projects?page-size=50`, { headers: { 'X-Api-Key': clockifyApiKey } });
            if (pRes.ok) {
              const data = await pRes.json();
              data.forEach(p => result.push({ id: `clockify:${p.id}`, name: p.name, color: p.color, source: 'clockify' }));
            }
          }
        } catch (_) {}
      }

      // Custom projects from storage
      customProjects.forEach(p => result.push({ ...p, source: 'custom' }));

      return { projects: result };
    },

    todos_create_project: async ({ name, color }) => {
      const storageKey = tab === 'Work' ? 'work_custom_projects' : 'personal_custom_projects';
      const existing = (await storage.get(storageKey)) || [];
      if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return { error: `Project "${name}" already exists` };
      }
      const newColor = color || PROJECT_PALETTE[existing.length % PROJECT_PALETTE.length];
      const proj = { id: `custom:${Date.now()}`, name, color: newColor };
      await storage.set(storageKey, [...existing, proj]);
      return { success: true, project: { ...proj, source: 'custom' } };
    },
  };

  return handlers;
}

export const todosIntegration = {
  name: 'todos',
  description: 'Todo list management via GitHub — create, complete, delete todos',
  functionDeclarations: [
    {
      name: 'todos_list',
      description: 'List todos from the active tab repository',
      parameters: {
        type: 'object',
        properties: {
          showCompleted: { type: 'boolean', description: 'Include completed todos (default false)' },
        },
      },
    },
    {
      name: 'todos_create',
      description: 'Create a new todo in the active tab repository. Call todos_list_projects first if you do not know available project names.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The todo text' },
          priority: { type: 'string', description: 'Priority: high, medium, or low' },
          due: { type: 'string', description: 'Due date as YYYY-MM-DD' },
          project: { type: 'string', description: 'Project name this todo belongs to' },
        },
        required: ['text'],
      },
    },
    {
      name: 'todos_complete',
      description: 'Mark a todo as complete by id or text match',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Todo id' },
          text: { type: 'string', description: 'Partial text to match the todo' },
        },
      },
    },
    {
      name: 'todos_delete',
      description: 'Delete a todo by id or text match',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Todo id' },
          text: { type: 'string', description: 'Partial text to match the todo' },
        },
      },
    },
    {
      name: 'todos_list_projects',
      description: 'List all available projects (Clockify + custom). Call this before creating a todo so you can assign the correct project.',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'todos_create_project',
      description: 'Create a new custom project for organising todos',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          color: { type: 'string', description: 'Optional hex color e.g. #6366f1' },
        },
        required: ['name'],
      },
    },
  ],
};

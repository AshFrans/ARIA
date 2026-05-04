import { createGitHubClient } from '../lib/github';

const TODOS_PATH = 'todos/todos.md';

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

    // Extract priority tag: #high #medium #low
    const priorityMatch = rest.match(/#(high|medium|low)/i);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() : null;

    // Extract due date: due:YYYY-MM-DD
    const dueMatch = rest.match(/due:(\S+)/);
    const due = dueMatch ? dueMatch[1] : null;

    // Clean text by removing tags
    const text = rest
      .replace(/#(high|medium|low)/gi, '')
      .replace(/due:\S+/g, '')
      .trim();

    todos.push({ id: String(idCounter++), text, completed, priority, due, raw: line });
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
    // Incomplete first, then completed
    const sorted = [...items.filter(t => !t.completed), ...items.filter(t => t.completed)];
    for (const t of sorted) {
      const check = t.completed ? 'x' : ' ';
      const parts = [t.text];
      if (t.priority) parts.push(`#${t.priority}`);
      if (t.due) parts.push(`due:${t.due}`);
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

export function createTodosHandlers(githubConfig) {
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
      return { todos: list, total: list.length };
    },

    todos_create: async ({ text, priority, due }) => {
      const { todos } = await loadTodos();
      const newTodo = {
        id: String(Date.now()),
        text,
        completed: false,
        priority: priority || null,
        due: due || null,
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
      description: 'Create a new todo in the active tab repository',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The todo text' },
          priority: { type: 'string', description: 'Priority: high, medium, or low' },
          due: { type: 'string', description: 'Due date as YYYY-MM-DD' },
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
  ],
};

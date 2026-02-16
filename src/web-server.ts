import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { store } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const corsOrigin = process.env.TODO_CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin.split(',') } : undefined));
app.use(express.json());

// Reload data from disk on every API request (sync with MCP server)
app.use('/api', (_req, _res, next) => {
  store.reload();
  next();
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==================== Auth Routes ====================

app.post('/api/login', (req, res) => {
  const { user_id } = req.body;
  const user = store.login(user_id);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

app.post('/api/logout', (_req, res) => {
  store.logout();
  res.json({ success: true });
});

app.get('/api/current-user', (_req, res) => {
  const user = store.getCurrentUser();
  if (user) {
    res.json(user);
  } else {
    res.json(null);
  }
});

// ==================== User Routes ====================

app.get('/api/users', (_req, res) => {
  res.json(store.getUsers());
});

app.post('/api/users', (req, res) => {
  const { name, email, role, avatar } = req.body;
  const user = store.addUser(name, email, role, avatar);
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied' });
  }
});

// ==================== Project Routes ====================

app.get('/api/projects', (_req, res) => {
  res.json(store.getProjects());
});

app.post('/api/projects', (req, res) => {
  const { name, color } = req.body;
  const project = store.addProject(name, color);
  if (project) {
    res.json({ success: true, project });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied' });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  const success = store.deleteProject(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied or not found' });
  }
});

// ==================== Todo Routes ====================

app.get('/api/todos', (req, res) => {
  let todos = store.getTodos();

  // Filter by query params
  const { project, assignee, status, priority } = req.query;

  if (project) {
    todos = todos.filter(t => t.projectId === project);
  }
  if (assignee) {
    todos = todos.filter(t => t.assigneeId === assignee);
  }
  if (status === 'completed') {
    todos = todos.filter(t => t.completed);
  } else if (status === 'pending') {
    todos = todos.filter(t => !t.completed);
  }
  if (priority) {
    todos = todos.filter(t => t.priority === priority);
  }

  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { title, project_id, assignee_id, date, time, priority, importance, note } = req.body;
  const todo = store.addTodo({
    title,
    projectId: project_id,
    assigneeId: assignee_id,
    date,
    time,
    priority,
    importance,
    note
  });
  if (todo) {
    res.json({ success: true, todo });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied' });
  }
});

app.put('/api/todos/:id', (req, res) => {
  const { title, project_id, assignee_id, date, time, priority, importance, note } = req.body;
  const todo = store.updateTodo(req.params.id, {
    title,
    projectId: project_id,
    assigneeId: assignee_id,
    date,
    time,
    priority,
    importance,
    note
  });
  if (todo) {
    res.json({ success: true, todo });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied or not found' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  const todo = store.deleteTodo(req.params.id);
  if (todo) {
    res.json({ success: true, deleted: todo });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied or not found' });
  }
});

app.patch('/api/todos/:id/toggle', (req, res) => {
  const todo = store.toggleTodo(req.params.id);
  if (todo) {
    res.json({ success: true, todo });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied or not found' });
  }
});

app.patch('/api/todos/:id/assign', (req, res) => {
  const { user_id } = req.body;
  const todo = store.assignTodo(req.params.id, user_id);
  if (todo) {
    res.json({ success: true, todo });
  } else {
    res.status(403).json({ success: false, error: 'Permission denied or not found' });
  }
});

// ==================== Query Routes ====================

app.get('/api/summary', (_req, res) => {
  const summary = store.getSummary();
  // Also include global stats even when not logged in
  const todos = store.getTodos();
  const projects = store.getProjects();
  const users = store.getUsers();

  const today = new Date().toISOString().split('T')[0];
  const overdue = todos.filter(t => !t.completed && t.date < today);
  const urgent = todos.filter(t => !t.completed && t.priority === 'urgent');
  const pending = todos.filter(t => !t.completed);
  const completed = todos.filter(t => t.completed);

  res.json({
    ...((typeof summary === 'object' && summary !== null) ? summary : {}),
    global: {
      totalTodos: todos.length,
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
      urgent: urgent.length,
      totalProjects: projects.length,
      totalUsers: users.length
    }
  });
});

app.get('/api/overdue', (_req, res) => {
  res.json(store.getOverdueTodos());
});

app.get('/api/urgent', (_req, res) => {
  res.json(store.getUrgentTodos());
});

// ==================== Fallback: serve SPA ====================

app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ==================== Start Server ====================

export function startWebServer(port?: number) {
  const PORT = port || parseInt(process.env.TODO_WEB_PORT || '3456', 10);
  app.listen(PORT, () => {
    console.log(`Todo Web UI running at http://localhost:${PORT}`);
  });
}

// Run directly
const isDirectRun = process.argv[1]?.includes('web-server');
if (isDirectRun) {
  startWebServer();
}

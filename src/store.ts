import * as fs from 'fs';
import * as path from 'path';
import { User, Project, Todo, Role, Permissions, DataStore } from './types.js';

// ==================== Data Store ====================

const DATA_FILE = process.env.TODO_DATA_PATH || path.join(process.env.HOME || '.', '.todo-mcp-data.json');

const defaultUsers: User[] = [
  { id: 'admin1', name: 'Admin', email: 'admin@company.com', avatar: '👑', role: 'admin' },
  { id: 'manager1', name: 'Project Manager', email: 'pm@company.com', avatar: '📊', role: 'manager' },
  { id: 'dev1', name: 'Developer 1', email: 'dev1@company.com', avatar: '💻', role: 'member' },
  { id: 'dev2', name: 'Developer 2', email: 'dev2@company.com', avatar: '🎨', role: 'member' },
  { id: 'viewer1', name: 'Viewer', email: 'viewer@company.com', avatar: '👀', role: 'viewer' }
];

const defaultProjects: Project[] = [
  { id: 'proj1', name: 'Website Redesign', color: '#667eea', createdAt: new Date().toISOString() },
  { id: 'proj2', name: 'Mobile App', color: '#f5576c', createdAt: new Date().toISOString() },
  { id: 'proj3', name: 'API Development', color: '#2ed573', createdAt: new Date().toISOString() },
  { id: 'proj4', name: 'Marketing', color: '#ffa502', createdAt: new Date().toISOString() }
];

// ==================== Permissions ====================

const permissions: Record<Role, Permissions> = {
  admin: {
    canCreateTask: true,
    canAssignOthers: true,
    canDeleteAny: true,
    canEditAny: true,
    canManageProjects: true,
    canManageUsers: true
  },
  manager: {
    canCreateTask: true,
    canAssignOthers: true,
    canDeleteAny: true,
    canEditAny: true,
    canManageProjects: true,
    canManageUsers: false
  },
  member: {
    canCreateTask: true,
    canAssignOthers: false,
    canDeleteAny: false,
    canEditAny: false,
    canManageProjects: false,
    canManageUsers: false
  },
  viewer: {
    canCreateTask: false,
    canAssignOthers: false,
    canDeleteAny: false,
    canEditAny: false,
    canManageProjects: false,
    canManageUsers: false
  }
};

// ==================== Store Class ====================

export class TodoStore {
  private data: DataStore;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DataStore {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return {
      users: defaultUsers,
      projects: defaultProjects,
      todos: [],
      currentUserId: null
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // ==================== Reload from disk ====================

  reload(): void {
    this.data = this.loadData();
  }

  // ==================== Utility ====================

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  isOverdue(dateStr: string): boolean {
    const today = new Date(this.getTodayString());
    const taskDate = new Date(dateStr);
    return taskDate < today;
  }

  // ==================== Auth ====================

  getCurrentUser(): User | null {
    if (!this.data.currentUserId) return null;
    return this.data.users.find(u => u.id === this.data.currentUserId) || null;
  }

  login(userId: string): User | null {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      this.data.currentUserId = userId;
      this.saveData();
      return user;
    }
    return null;
  }

  logout(): void {
    this.data.currentUserId = null;
    this.saveData();
  }

  hasPermission(permission: keyof Permissions): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return permissions[user.role]?.[permission] || false;
  }

  canEditTask(todo: Todo): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (this.hasPermission('canEditAny')) return true;
    return todo.assigneeId === user.id || todo.createdBy === user.id;
  }

  canDeleteTask(todo: Todo): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (this.hasPermission('canDeleteAny')) return true;
    return todo.createdBy === user.id;
  }

  // ==================== Users ====================

  getUsers(): User[] {
    return this.data.users;
  }

  getUser(userId: string): User | null {
    return this.data.users.find(u => u.id === userId) || null;
  }

  addUser(name: string, email: string, role: Role, avatar?: string): User | null {
    if (!this.hasPermission('canManageUsers')) {
      return null;
    }
    const user: User = {
      id: this.generateId(),
      name,
      email,
      avatar: avatar || '👤',
      role
    };
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  // ==================== Projects ====================

  getProjects(): Project[] {
    return this.data.projects;
  }

  getProject(projectId: string): Project | null {
    return this.data.projects.find(p => p.id === projectId) || null;
  }

  addProject(name: string, color?: string): Project | null {
    if (!this.hasPermission('canManageProjects')) {
      return null;
    }
    const user = this.getCurrentUser();
    const project: Project = {
      id: this.generateId(),
      name,
      color: color || '#667eea',
      createdAt: new Date().toISOString(),
      createdBy: user?.id
    };
    this.data.projects.push(project);
    this.saveData();
    return project;
  }

  deleteProject(projectId: string): boolean {
    if (!this.hasPermission('canManageProjects')) {
      return false;
    }
    const index = this.data.projects.findIndex(p => p.id === projectId);
    if (index > -1) {
      this.data.projects.splice(index, 1);
      // Also remove todos in this project
      this.data.todos = this.data.todos.filter(t => t.projectId !== projectId);
      this.saveData();
      return true;
    }
    return false;
  }

  // ==================== Todos ====================

  getTodos(): Todo[] {
    return this.data.todos;
  }

  getTodo(todoId: string): Todo | null {
    return this.data.todos.find(t => t.id === todoId) || null;
  }

  addTodo(params: {
    title: string;
    projectId?: string;
    assigneeId?: string;
    date?: string;
    time?: string;
    priority?: string;
    importance?: number;
    note?: string;
  }): Todo | null {
    if (!this.hasPermission('canCreateTask')) {
      return null;
    }

    const user = this.getCurrentUser();
    if (!user) return null;

    const assigneeId = params.assigneeId || user.id;

    // Check permission to assign to others
    if (assigneeId !== user.id && !this.hasPermission('canAssignOthers')) {
      return null;
    }

    const todo: Todo = {
      id: this.generateId(),
      title: params.title,
      projectId: params.projectId || this.data.projects[0]?.id || '',
      assigneeId,
      date: params.date || this.getTodayString(),
      time: params.time,
      priority: (params.priority as Todo['priority']) || 'medium',
      importance: params.importance || 3,
      note: params.note,
      completed: false,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };

    this.data.todos.push(todo);
    this.saveData();
    return todo;
  }

  updateTodo(todoId: string, updates: Partial<Todo>): Todo | null {
    const todo = this.getTodo(todoId);
    if (!todo) return null;

    if (!this.canEditTask(todo)) {
      return null;
    }

    // Check permission to change assignee
    if (updates.assigneeId && updates.assigneeId !== todo.assigneeId) {
      if (!this.hasPermission('canAssignOthers')) {
        return null;
      }
    }

    Object.assign(todo, updates);
    this.saveData();
    return todo;
  }

  toggleTodo(todoId: string): Todo | null {
    const todo = this.getTodo(todoId);
    if (!todo) return null;

    if (!this.canEditTask(todo)) {
      return null;
    }

    todo.completed = !todo.completed;
    todo.completedAt = todo.completed ? new Date().toISOString() : undefined;
    this.saveData();
    return todo;
  }

  deleteTodo(todoId: string): Todo | null {
    const todo = this.getTodo(todoId);
    if (!todo) return null;

    if (!this.canDeleteTask(todo)) {
      return null;
    }

    const index = this.data.todos.findIndex(t => t.id === todoId);
    if (index > -1) {
      const deleted = this.data.todos.splice(index, 1)[0];
      this.saveData();
      return deleted;
    }
    return null;
  }

  assignTodo(todoId: string, userId: string): Todo | null {
    if (!this.hasPermission('canAssignOthers')) {
      return null;
    }

    const todo = this.getTodo(todoId);
    const user = this.getUser(userId);

    if (!todo || !user) return null;

    todo.assigneeId = userId;
    this.saveData();
    return todo;
  }

  // ==================== Queries ====================

  getTodosByProject(projectId: string): Todo[] {
    return this.data.todos.filter(t => t.projectId === projectId);
  }

  getTodosByAssignee(userId: string): Todo[] {
    return this.data.todos.filter(t => t.assigneeId === userId);
  }

  getTodosByDate(date: string): Todo[] {
    return this.data.todos.filter(t => t.date === date);
  }

  getOverdueTodos(): Todo[] {
    return this.data.todos.filter(t => this.isOverdue(t.date) && !t.completed);
  }

  getUrgentTodos(): Todo[] {
    return this.data.todos.filter(t => t.priority === 'urgent' && !t.completed);
  }

  getPendingTodos(): Todo[] {
    return this.data.todos.filter(t => !t.completed);
  }

  getCompletedTodos(): Todo[] {
    return this.data.todos.filter(t => t.completed);
  }

  // ==================== Summary ====================

  getSummary(): object {
    const user = this.getCurrentUser();
    if (!user) {
      return { error: 'Not logged in' };
    }

    const myTodos = this.data.todos.filter(t => t.assigneeId === user.id);
    const today = this.getTodayString();

    return {
      user: user.name,
      role: user.role,
      permissions: permissions[user.role],
      totalTasks: myTodos.length,
      completed: myTodos.filter(t => t.completed).length,
      pending: myTodos.filter(t => !t.completed).length,
      urgent: myTodos.filter(t => t.priority === 'urgent' && !t.completed).length,
      overdue: myTodos.filter(t => this.isOverdue(t.date) && !t.completed).length,
      todayTasks: myTodos.filter(t => t.date === today).length,
      allStats: {
        totalTodos: this.data.todos.length,
        totalProjects: this.data.projects.length,
        totalUsers: this.data.users.length
      }
    };
  }
}

// Singleton instance
export const store = new TodoStore();

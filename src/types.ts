// ==================== Types ====================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
}

export type Role = 'admin' | 'manager' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  createdBy?: string;
}

export interface Todo {
  id: string;
  title: string;
  projectId: string;
  assigneeId: string;
  date: string;
  time?: string;
  priority: Priority;
  importance: number;
  note?: string;
  completed: boolean;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Permissions {
  canCreateTask: boolean;
  canAssignOthers: boolean;
  canDeleteAny: boolean;
  canEditAny: boolean;
  canManageProjects: boolean;
  canManageUsers: boolean;
}

export interface TodoSummary {
  user: string;
  role: Role;
  totalTasks: number;
  completed: number;
  pending: number;
  urgent: number;
  overdue: number;
  todayTasks: number;
}

export interface DataStore {
  users: User[];
  projects: Project[];
  todos: Todo[];
  currentUserId: string | null;
}

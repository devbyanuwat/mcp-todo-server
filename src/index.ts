#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { store } from "./store.js";

// ==================== Server Setup ====================

const server = new McpServer({
  name: "todo-mcp-server",
  version: "1.0.0"
});

// ==================== Auth Tools ====================

server.registerTool(
  "todo_login",
  {
    title: "Login to Todo System",
    description: `Login as a user to access the todo system.

Args:
  - user_id (string): The user ID to login as (e.g., 'admin1', 'manager1', 'dev1', 'dev2', 'viewer1')

Returns:
  User object with id, name, email, avatar, and role.
  
Available default users:
  - admin1: Admin (full access)
  - manager1: Project Manager (manage projects and assign tasks)
  - dev1, dev2: Developers (manage own tasks)
  - viewer1: Viewer (read-only)`,
    inputSchema: z.object({
      user_id: z.string().describe("User ID to login as")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ user_id }) => {
    store.reload();
    const user = store.login(user_id);
    if (user) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, user }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "User not found" }) }]
    };
  }
);

server.registerTool(
  "todo_logout",
  {
    title: "Logout from Todo System",
    description: "Logout the current user from the todo system.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    store.logout();
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, message: "Logged out" }) }]
    };
  }
);

server.registerTool(
  "todo_current_user",
  {
    title: "Get Current User",
    description: "Get the currently logged in user information.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const user = store.getCurrentUser();
    return {
      content: [{ type: "text", text: JSON.stringify(user || { error: "Not logged in" }, null, 2) }]
    };
  }
);

// ==================== User Tools ====================

server.registerTool(
  "todo_list_users",
  {
    title: "List All Users",
    description: "Get all users in the system with their roles.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const users = store.getUsers();
    return {
      content: [{ type: "text", text: JSON.stringify({ users, count: users.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_add_user",
  {
    title: "Add New User",
    description: `Add a new user to the system. Requires 'admin' role.

Args:
  - name (string): User's full name
  - email (string): User's email address
  - role (string): One of 'admin', 'manager', 'member', 'viewer'
  - avatar (string, optional): Emoji avatar for the user`,
    inputSchema: z.object({
      name: z.string().min(1).describe("User's full name"),
      email: z.string().email().describe("User's email address"),
      role: z.enum(['admin', 'manager', 'member', 'viewer']).describe("User's role"),
      avatar: z.string().optional().describe("Emoji avatar")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ name, email, role, avatar }) => {
    store.reload();
    const user = store.addUser(name, email, role, avatar);
    if (user) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, user }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or failed to create user" }) }]
    };
  }
);

// ==================== Project Tools ====================

server.registerTool(
  "todo_list_projects",
  {
    title: "List All Projects",
    description: "Get all projects in the system.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const projects = store.getProjects();
    return {
      content: [{ type: "text", text: JSON.stringify({ projects, count: projects.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_add_project",
  {
    title: "Add New Project",
    description: `Create a new project. Requires 'admin' or 'manager' role.

Args:
  - name (string): Project name
  - color (string, optional): Hex color code (e.g., '#667eea')`,
    inputSchema: z.object({
      name: z.string().min(1).describe("Project name"),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Hex color code")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ name, color }) => {
    store.reload();
    const project = store.addProject(name, color);
    if (project) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, project }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or failed to create project" }) }]
    };
  }
);

server.registerTool(
  "todo_delete_project",
  {
    title: "Delete Project",
    description: "Delete a project and all its tasks. Requires 'admin' or 'manager' role.",
    inputSchema: z.object({
      project_id: z.string().describe("Project ID to delete")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ project_id }) => {
    store.reload();
    const success = store.deleteProject(project_id);
    return {
      content: [{ type: "text", text: JSON.stringify({ success, message: success ? "Project deleted" : "Permission denied or project not found" }) }]
    };
  }
);

// ==================== Todo Tools ====================

server.registerTool(
  "todo_list",
  {
    title: "List All Todos",
    description: "Get all todos in the system.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const todos = store.getTodos();
    return {
      content: [{ type: "text", text: JSON.stringify({ todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_add",
  {
    title: "Add New Todo",
    description: `Create a new todo task.

Args:
  - title (string): Task title/description
  - project_id (string, optional): Project ID to assign to
  - assignee_id (string, optional): User ID to assign to (default: current user)
  - date (string, optional): Due date in YYYY-MM-DD format (default: today)
  - time (string, optional): Due time in HH:MM format
  - priority (string, optional): 'urgent', 'high', 'medium', 'low' (default: medium)
  - importance (number, optional): 1-5 stars (default: 3)
  - note (string, optional): Additional notes

Role permissions:
  - admin/manager: Can assign to any user
  - member: Can only assign to self
  - viewer: Cannot create tasks`,
    inputSchema: z.object({
      title: z.string().min(1).describe("Task title"),
      project_id: z.string().optional().describe("Project ID"),
      assignee_id: z.string().optional().describe("User ID to assign to"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Due date (YYYY-MM-DD)"),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Due time (HH:MM)"),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe("Priority level"),
      importance: z.number().int().min(1).max(5).optional().describe("Importance (1-5)"),
      note: z.string().optional().describe("Additional notes")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    store.reload();
    const todo = store.addTodo({
      title: params.title,
      projectId: params.project_id,
      assigneeId: params.assignee_id,
      date: params.date,
      time: params.time,
      priority: params.priority,
      importance: params.importance,
      note: params.note
    });
    if (todo) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, todo }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or failed to create todo" }) }]
    };
  }
);

server.registerTool(
  "todo_update",
  {
    title: "Update Todo",
    description: "Update an existing todo task.",
    inputSchema: z.object({
      todo_id: z.string().describe("Todo ID to update"),
      title: z.string().optional().describe("New title"),
      project_id: z.string().optional().describe("New project ID"),
      assignee_id: z.string().optional().describe("New assignee ID"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("New due date"),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("New due time"),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe("New priority"),
      importance: z.number().int().min(1).max(5).optional().describe("New importance"),
      note: z.string().optional().describe("New notes")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ todo_id, ...updates }) => {
    store.reload();
    const todo = store.updateTodo(todo_id, {
      title: updates.title,
      projectId: updates.project_id,
      assigneeId: updates.assignee_id,
      date: updates.date,
      time: updates.time,
      priority: updates.priority,
      importance: updates.importance,
      note: updates.note
    });
    if (todo) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, todo }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or todo not found" }) }]
    };
  }
);

server.registerTool(
  "todo_toggle",
  {
    title: "Toggle Todo Complete",
    description: "Mark a todo as complete or incomplete.",
    inputSchema: z.object({
      todo_id: z.string().describe("Todo ID to toggle")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ todo_id }) => {
    store.reload();
    const todo = store.toggleTodo(todo_id);
    if (todo) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, todo, completed: todo.completed }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or todo not found" }) }]
    };
  }
);

server.registerTool(
  "todo_delete",
  {
    title: "Delete Todo",
    description: "Delete a todo task.",
    inputSchema: z.object({
      todo_id: z.string().describe("Todo ID to delete")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async ({ todo_id }) => {
    store.reload();
    const todo = store.deleteTodo(todo_id);
    if (todo) {
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, deleted: todo }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied or todo not found" }) }]
    };
  }
);

server.registerTool(
  "todo_assign",
  {
    title: "Assign Todo to User",
    description: "Assign a todo to a different user. Requires 'admin' or 'manager' role.",
    inputSchema: z.object({
      todo_id: z.string().describe("Todo ID to assign"),
      user_id: z.string().describe("User ID to assign to")
    }).strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ todo_id, user_id }) => {
    store.reload();
    const todo = store.assignTodo(todo_id, user_id);
    if (todo) {
      const user = store.getUser(user_id);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, todo, assignedTo: user?.name }, null, 2) }]
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: false, error: "Permission denied, todo not found, or user not found" }) }]
    };
  }
);

// ==================== Query Tools ====================

server.registerTool(
  "todo_by_project",
  {
    title: "Get Todos by Project",
    description: "Get all todos for a specific project.",
    inputSchema: z.object({
      project_id: z.string().describe("Project ID to filter by")
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ project_id }) => {
    store.reload();
    const todos = store.getTodosByProject(project_id);
    const project = store.getProject(project_id);
    return {
      content: [{ type: "text", text: JSON.stringify({ project: project?.name, todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_by_assignee",
  {
    title: "Get Todos by Assignee",
    description: "Get all todos assigned to a specific user.",
    inputSchema: z.object({
      user_id: z.string().describe("User ID to filter by")
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ user_id }) => {
    store.reload();
    const todos = store.getTodosByAssignee(user_id);
    const user = store.getUser(user_id);
    return {
      content: [{ type: "text", text: JSON.stringify({ user: user?.name, todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_by_date",
  {
    title: "Get Todos by Date",
    description: "Get all todos for a specific date.",
    inputSchema: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date in YYYY-MM-DD format")
    }).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ date }) => {
    store.reload();
    const todos = store.getTodosByDate(date);
    return {
      content: [{ type: "text", text: JSON.stringify({ date, todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_overdue",
  {
    title: "Get Overdue Todos",
    description: "Get all overdue (past due date) incomplete todos.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const todos = store.getOverdueTodos();
    return {
      content: [{ type: "text", text: JSON.stringify({ overdue: true, todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_urgent",
  {
    title: "Get Urgent Todos",
    description: "Get all urgent priority incomplete todos.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const todos = store.getUrgentTodos();
    return {
      content: [{ type: "text", text: JSON.stringify({ priority: "urgent", todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_pending",
  {
    title: "Get Pending Todos",
    description: "Get all incomplete todos.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const todos = store.getPendingTodos();
    return {
      content: [{ type: "text", text: JSON.stringify({ completed: false, todos, count: todos.length }, null, 2) }]
    };
  }
);

server.registerTool(
  "todo_completed",
  {
    title: "Get Completed Todos",
    description: "Get all completed todos.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const todos = store.getCompletedTodos();
    return {
      content: [{ type: "text", text: JSON.stringify({ completed: true, todos, count: todos.length }, null, 2) }]
    };
  }
);

// ==================== Summary Tool ====================

server.registerTool(
  "todo_summary",
  {
    title: "Get Todo Summary",
    description: "Get a summary of todos for the current user including stats and permissions.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    store.reload();
    const summary = store.getSummary();
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
    };
  }
);

// ==================== Run Server ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Todo MCP Server running on stdio");

  // Start web server alongside MCP if --web flag is passed
  if (process.argv.includes('--web')) {
    const { startWebServer } = await import('./web-server.js');
    startWebServer();
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

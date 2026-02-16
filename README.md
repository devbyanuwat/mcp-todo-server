# Todo MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

An MCP (Model Context Protocol) server for team todo/task management. Includes project organization, team assignment, role-based access control, and a built-in **Web UI dashboard**.

<!-- ![Dashboard Screenshot](screenshots/dashboard.png) -->

## Features

- **Task Management** - Create, update, delete, and track tasks with priority levels and importance ratings
- **Projects** - Organize tasks into color-coded projects
- **Team Assignment** - Assign tasks to team members
- **Role-based Access** - 4 roles with granular permissions (Admin, Manager, Member, Viewer)
- **Web UI Dashboard** - Built-in web interface with charts, filters, and full CRUD
- **Persistent Storage** - JSON file-based storage, no database required
- **25+ MCP Tools** - Comprehensive toolset for AI assistants

## Roles & Permissions

| Role | Create Task | Assign Others | Delete Any | Manage Projects | Manage Users |
|------|:-----------:|:-------------:|:----------:|:---------------:|:------------:|
| Admin | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes | Yes | - |
| Member | Yes | - | - | - | - |
| Viewer | - | - | - | - | - |

## Quick Start

### Install from source

```bash
git clone https://github.com/devbyanuwat/mcp-todo-server.git
cd todo-mcp-server
npm install
npm run build
```

### Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/path/to/todo-mcp-server/dist/index.js"]
    }
  }
}
```

### Use with Claude Code (CLI)

```bash
claude mcp add todo node /path/to/todo-mcp-server/dist/index.js
```

### Web UI

```bash
npm run web
# Open http://localhost:3456
```

Start the web server alongside the MCP server:

```bash
node dist/index.js --web
```

## Available MCP Tools

### Authentication
| Tool | Description |
|------|-------------|
| `todo_login` | Login as a user |
| `todo_logout` | Logout current user |
| `todo_current_user` | Get current user info |

### Users
| Tool | Description |
|------|-------------|
| `todo_list_users` | List all users |
| `todo_add_user` | Add a new user (Admin only) |

### Projects
| Tool | Description |
|------|-------------|
| `todo_list_projects` | List all projects |
| `todo_add_project` | Create a new project |
| `todo_delete_project` | Delete a project |

### Tasks
| Tool | Description |
|------|-------------|
| `todo_list` | List all todos |
| `todo_add` | Create a new todo |
| `todo_update` | Update a todo |
| `todo_toggle` | Toggle complete/incomplete |
| `todo_delete` | Delete a todo |
| `todo_assign` | Assign a todo to a user |

### Queries
| Tool | Description |
|------|-------------|
| `todo_by_project` | Filter todos by project |
| `todo_by_assignee` | Filter todos by assignee |
| `todo_by_date` | Filter todos by date |
| `todo_overdue` | Get overdue todos |
| `todo_urgent` | Get urgent todos |
| `todo_pending` | Get incomplete todos |
| `todo_completed` | Get completed todos |
| `todo_summary` | Get summary statistics |

## Example Usage

```
User: Login as admin and show me the task summary

Claude: [uses todo_login with user_id="admin1"]
        [uses todo_summary]

        You're logged in as Admin. Here's your summary:
        - Total tasks: 5
        - Completed: 2
        - Pending: 3
        - Urgent: 1

User: Create a new task for dev1 - implement login feature for mobile app, due tomorrow

Claude: [uses todo_add with title="Implement Login Feature",
         project_id="proj2", assignee_id="dev1",
         date="2026-01-15", priority="high"]

        Task created:
        - Title: Implement Login Feature
        - Project: Mobile App
        - Assigned to: Developer 1
        - Due: 2026-01-15
        - Priority: High
```

## Default Users

| ID | Name | Role |
|----|------|------|
| `admin1` | Admin | admin |
| `manager1` | Project Manager | manager |
| `dev1` | Developer 1 | member |
| `dev2` | Developer 2 | member |
| `viewer1` | Viewer | viewer |

## REST API (for any AI / HTTP client)

The web server exposes a full REST API at `http://localhost:3456/api`. Any AI or tool that can make HTTP requests can use it.

```bash
npm run web   # Start the API server
```

### Authentication

```bash
# Login (required before creating/modifying data)
curl -X POST http://localhost:3456/api/login \
  -H "Content-Type: application/json" \
  -d '{"user_id": "admin1"}'

# Get current user
curl http://localhost:3456/api/current-user

# Logout
curl -X POST http://localhost:3456/api/logout
```

### Todos

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/todos` | List all todos |
| `GET` | `/api/todos?project={id}` | Filter by project |
| `GET` | `/api/todos?assignee={id}` | Filter by assignee |
| `GET` | `/api/todos?status=pending` | Filter by status (`pending` / `completed`) |
| `GET` | `/api/todos?priority=urgent` | Filter by priority (`urgent` / `high` / `medium` / `low`) |
| `POST` | `/api/todos` | Create a todo |
| `PUT` | `/api/todos/:id` | Update a todo |
| `DELETE` | `/api/todos/:id` | Delete a todo |
| `PATCH` | `/api/todos/:id/toggle` | Toggle complete/incomplete |
| `PATCH` | `/api/todos/:id/assign` | Assign to a user |

**Create a todo:**

```bash
curl -X POST http://localhost:3456/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement login page",
    "project_id": "proj2",
    "assignee_id": "dev1",
    "date": "2026-02-20",
    "time": "17:00",
    "priority": "high",
    "importance": 4,
    "note": "Use OAuth2 flow"
  }'
```

**Update a todo:**

```bash
curl -X PUT http://localhost:3456/api/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title", "priority": "urgent"}'
```

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `DELETE` | `/api/projects/:id` | Delete a project |

```bash
curl -X POST http://localhost:3456/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "New Project", "color": "#8b5cf6"}'
```

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Add a user (Admin only) |

### Queries

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/summary` | Dashboard stats (total, pending, completed, overdue, urgent) |
| `GET` | `/api/overdue` | All overdue incomplete todos |
| `GET` | `/api/urgent` | All urgent incomplete todos |

### Response Format

All mutation endpoints return:

```json
// Success
{ "success": true, "todo": { ... } }

// Error
{ "success": false, "error": "Permission denied" }
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `TODO_DATA_PATH` | Path to the JSON data file | `~/.todo-mcp-data.json` |
| `TODO_WEB_PORT` | Web UI server port | `3456` |
| `TODO_CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `*` (all) |

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build
npm run build

# Start MCP server
npm start

# Start Web UI only
npm run web

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Project Structure

```
todo-mcp-server/
├── src/
│   ├── types.ts          # TypeScript interfaces
│   ├── store.ts          # Data store & business logic
│   ├── index.ts          # MCP server & tool definitions
│   └── web-server.ts     # Express REST API & web UI
├── public/
│   ├── index.html        # Web UI (SPA)
│   ├── app.js            # Frontend logic
│   └── style.css         # Styles
├── dist/                 # Compiled output (generated)
├── package.json
├── tsconfig.json
└── LICENSE
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)

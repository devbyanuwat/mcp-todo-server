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

// ==================== State ====================
let state = {
  users: [],
  projects: [],
  todos: [],
  currentUser: null,
  currentPage: 'dashboard'
};

let charts = {};

// ==================== API ====================
const api = {
  async get(url) {
    const res = await fetch(url);
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async put(url, data) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async patch(url, data) {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    return res.json();
  },
  async del(url) {
    const res = await fetch(url, { method: 'DELETE' });
    return res.json();
  }
};

// ==================== Init ====================
async function init() {
  await loadData();
  populateFilters();
  renderAll();
}

async function loadData() {
  const [users, projects, todos, currentUser, summary] = await Promise.all([
    api.get('/api/users'),
    api.get('/api/projects'),
    api.get('/api/todos'),
    api.get('/api/current-user'),
    api.get('/api/summary')
  ]);
  state.users = users;
  state.projects = projects;
  state.todos = todos;
  state.currentUser = currentUser;
  state.summary = summary;

  // Populate user selector
  const select = document.getElementById('user-select');
  select.innerHTML = '<option value="">Login as...</option>';
  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.avatar} ${u.name} (${u.role})`;
    if (currentUser && currentUser.id === u.id) opt.selected = true;
    select.appendChild(opt);
  });

  // Update user info in sidebar
  const roleEl = document.getElementById('user-role');
  if (currentUser) {
    document.getElementById('user-avatar').textContent = currentUser.avatar;
    document.getElementById('user-name').textContent = currentUser.name;
    if (roleEl) roleEl.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
  } else {
    document.getElementById('user-avatar').textContent = '?';
    document.getElementById('user-name').textContent = 'Not logged in';
    if (roleEl) roleEl.textContent = 'Guest';
  }
}

function populateFilters() {
  // Project filter
  const pf = document.getElementById('filter-project');
  pf.innerHTML = '<option value="">All Projects</option>';
  state.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    pf.appendChild(opt);
  });

  // Assignee filter
  const af = document.getElementById('filter-assignee');
  af.innerHTML = '<option value="">All Assignees</option>';
  state.users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.avatar} ${u.name}`;
    af.appendChild(opt);
  });

  // Todo form selects
  const tp = document.getElementById('todo-project');
  tp.innerHTML = '';
  state.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    tp.appendChild(opt);
  });

  const ta = document.getElementById('todo-assignee');
  ta.innerHTML = '';
  state.users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.avatar} ${u.name}`;
    ta.appendChild(opt);
  });
}

// ==================== Navigation ====================
function showPage(page) {
  state.currentPage = page;
  document.getElementById('page-dashboard').classList.toggle('hidden', page !== 'dashboard');
  document.getElementById('page-todos').classList.toggle('hidden', page !== 'todos');
  document.getElementById('page-projects').classList.toggle('hidden', page !== 'projects');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('nav-active'));
  document.getElementById(`nav-${page}`).classList.add('nav-active');

  if (page === 'dashboard') renderDashboard();
  if (page === 'todos') renderTodos();
  if (page === 'projects') renderProjects();
}

function showProjectTodos(projectId) {
  document.getElementById('filter-project').value = projectId;
  document.getElementById('filter-assignee').value = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-search').value = '';
  showPage('todos');
}

// ==================== Render All ====================
function renderAll() {
  renderDashboard();
  renderTodos();
  renderProjects();
}

// ==================== Dashboard ====================
function renderDashboard() {
  const s = state.summary?.global || {};
  document.getElementById('stat-total').textContent = s.totalTodos || 0;
  document.getElementById('stat-pending').textContent = s.pending || 0;
  document.getElementById('stat-completed').textContent = s.completed || 0;
  document.getElementById('stat-overdue').textContent = s.overdue || 0;
  document.getElementById('stat-urgent').textContent = s.urgent || 0;

  renderCharts();
  renderOverdueList();
  renderUrgentList();
}

function renderCharts() {
  // Shared chart defaults
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#6b7280';

  // By Project - Doughnut
  const projectCounts = {};
  const projectColors = {};
  state.projects.forEach(p => { projectCounts[p.name] = 0; projectColors[p.name] = p.color; });
  state.todos.forEach(t => {
    const p = state.projects.find(p => p.id === t.projectId);
    if (p) projectCounts[p.name] = (projectCounts[p.name] || 0) + 1;
  });

  // Filter out projects with 0 todos for cleaner chart
  const activeProjects = Object.entries(projectCounts).filter(([, v]) => v > 0);
  const projLabels = activeProjects.map(([k]) => k);
  const projData = activeProjects.map(([, v]) => v);
  const projColors = projLabels.map(l => projectColors[l] || '#667eea');

  if (charts.project) charts.project.destroy();
  charts.project = new Chart(document.getElementById('chart-project'), {
    type: 'doughnut',
    data: {
      labels: projLabels,
      datasets: [{
        data: projData,
        backgroundColor: projColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: '500' }, usePointStyle: true, pointStyleWidth: 8 }
        }
      }
    }
  });

  // By Priority - Bar
  const priorityOrder = ['urgent', 'high', 'medium', 'low'];
  const priorityColors = { urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#22c55e' };
  const priorityBgColors = { urgent: 'rgba(239,68,68,0.15)', high: 'rgba(249,115,22,0.15)', medium: 'rgba(59,130,246,0.15)', low: 'rgba(34,197,94,0.15)' };
  const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
  state.todos.filter(t => !t.completed).forEach(t => {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });

  if (charts.priority) charts.priority.destroy();
  charts.priority = new Chart(document.getElementById('chart-priority'), {
    type: 'bar',
    data: {
      labels: priorityOrder.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
      datasets: [{
        data: priorityOrder.map(p => priorityCounts[p]),
        backgroundColor: priorityOrder.map(p => priorityColors[p]),
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } },
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '500' } } }
      }
    }
  });

  // By Assignee - Horizontal Bar
  const assigneeCounts = {};
  state.users.forEach(u => { assigneeCounts[u.name] = 0; });
  state.todos.filter(t => !t.completed).forEach(t => {
    const u = state.users.find(u => u.id === t.assigneeId);
    if (u) assigneeCounts[u.name] = (assigneeCounts[u.name] || 0) + 1;
  });

  if (charts.assignee) charts.assignee.destroy();
  const assigneeLabels = Object.keys(assigneeCounts);
  const assigneeColors = ['#4c6ef5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b'];
  charts.assignee = new Chart(document.getElementById('chart-assignee'), {
    type: 'bar',
    data: {
      labels: assigneeLabels,
      datasets: [{
        data: assigneeLabels.map(l => assigneeCounts[l]),
        backgroundColor: assigneeLabels.map((_, i) => assigneeColors[i % assigneeColors.length]),
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: '#f3f4f6' } },
        y: { grid: { display: false }, ticks: { font: { size: 11, weight: '500' } } }
      }
    }
  });
}

function renderOverdueList() {
  const today = new Date().toISOString().split('T')[0];
  const overdue = state.todos.filter(t => !t.completed && t.date < today);
  const el = document.getElementById('overdue-list');
  if (overdue.length === 0) {
    el.innerHTML = `<div class="text-center py-8">
      <svg class="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <p class="text-sm text-gray-400">No overdue tasks</p>
    </div>`;
    return;
  }
  el.innerHTML = overdue.slice(0, 8).map(t => {
    const project = state.projects.find(p => p.id === t.projectId);
    const days = Math.floor((new Date(today) - new Date(t.date)) / 86400000);
    return `<div class="flex items-center gap-3 p-3 rounded-lg bg-red-50/60 border border-red-100 hover:bg-red-50 transition-colors">
      <input type="checkbox" class="todo-checkbox" onchange="toggleTodo('${t.id}')">
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-800 truncate">${esc(t.title)}</div>
        <div class="flex items-center gap-2 mt-0.5">
          ${project ? `<span class="text-xs px-1.5 py-0.5 rounded" style="background:${project.color}15;color:${project.color}">${esc(project.name)}</span>` : ''}
          <span class="text-xs text-red-500 font-semibold">${days}d overdue</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderUrgentList() {
  const urgent = state.todos.filter(t => !t.completed && t.priority === 'urgent');
  const el = document.getElementById('urgent-list');
  if (urgent.length === 0) {
    el.innerHTML = `<div class="text-center py-8">
      <svg class="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <p class="text-sm text-gray-400">No urgent tasks</p>
    </div>`;
    return;
  }
  el.innerHTML = urgent.slice(0, 8).map(t => {
    const project = state.projects.find(p => p.id === t.projectId);
    return `<div class="flex items-center gap-3 p-3 rounded-lg bg-orange-50/60 border border-orange-100 hover:bg-orange-50 transition-colors">
      <input type="checkbox" class="todo-checkbox" onchange="toggleTodo('${t.id}')">
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-800 truncate">${esc(t.title)}</div>
        <div class="flex items-center gap-2 mt-0.5">
          ${project ? `<span class="text-xs px-1.5 py-0.5 rounded" style="background:${project.color}15;color:${project.color}">${esc(project.name)}</span>` : ''}
          <span class="text-xs text-orange-500 font-semibold">Due ${t.date}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ==================== Todos ====================
function renderTodos() {
  let todos = [...state.todos];
  const filterProject = document.getElementById('filter-project').value;
  const filterAssignee = document.getElementById('filter-assignee').value;
  const filterPriority = document.getElementById('filter-priority').value;
  const filterStatus = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value.toLowerCase();

  if (filterProject) todos = todos.filter(t => t.projectId === filterProject);
  if (filterAssignee) todos = todos.filter(t => t.assigneeId === filterAssignee);
  if (filterPriority) todos = todos.filter(t => t.priority === filterPriority);
  if (filterStatus === 'completed') todos = todos.filter(t => t.completed);
  else if (filterStatus === 'pending') todos = todos.filter(t => !t.completed);
  if (search) todos = todos.filter(t => t.title.toLowerCase().includes(search) || (t.note && t.note.toLowerCase().includes(search)));

  // Sort: incomplete first, then by priority weight, then by date
  const prioWeight = { urgent: 0, high: 1, medium: 2, low: 3 };
  todos.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (prioWeight[a.priority] !== prioWeight[b.priority]) return prioWeight[a.priority] - prioWeight[b.priority];
    return a.date.localeCompare(b.date);
  });

  const tbody = document.getElementById('todo-tbody');
  const emptyEl = document.getElementById('todo-empty');

  if (todos.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  const today = new Date().toISOString().split('T')[0];

  tbody.innerHTML = todos.map(t => {
    const project = state.projects.find(p => p.id === t.projectId);
    const assignee = state.users.find(u => u.id === t.assigneeId);
    const isOverdue = !t.completed && t.date < today;
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < t.importance ? 'text-yellow-400' : 'text-gray-200'} text-sm">&#9733;</span>`
    ).join('');

    return `<tr class="todo-row ${t.completed ? 'completed' : ''}">
      <td class="px-4 py-3 text-center">
        <input type="checkbox" class="todo-checkbox" onchange="toggleTodo('${t.id}')" ${t.completed ? 'checked' : ''}>
      </td>
      <td class="px-4 py-3">
        <div class="text-sm font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-900'}">${esc(t.title)}</div>
        ${t.note ? `<p class="text-xs text-gray-400 mt-0.5 truncate max-w-sm">${esc(t.note)}</p>` : ''}
      </td>
      <td class="px-4 py-3 hidden sm:table-cell">
        ${project ? `<span class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md" style="background:${project.color}12;color:${project.color}"><span class="color-dot" style="background:${project.color}"></span>${esc(project.name)}</span>` : '<span class="text-xs text-gray-300">-</span>'}
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        ${assignee ? `<span class="text-xs font-medium text-gray-600">${assignee.avatar} ${esc(assignee.name)}</span>` : '<span class="text-xs text-gray-300">-</span>'}
      </td>
      <td class="px-4 py-3">
        <span class="priority-${t.priority}">${t.priority}</span>
      </td>
      <td class="px-4 py-3 text-center hidden lg:table-cell">
        <span class="inline-flex gap-0.5">${stars}</span>
      </td>
      <td class="px-4 py-3 hidden md:table-cell">
        <span class="text-xs font-medium ${isOverdue ? 'overdue-text' : 'text-gray-500'}">${t.date}${t.time ? ' ' + t.time : ''}</span>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button onclick="editTodo('${t.id}')" class="action-btn action-edit" title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            Edit
          </button>
          <button onclick="deleteTodo('${t.id}')" class="action-btn action-delete" title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Del
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ==================== Projects ====================
function renderProjects() {
  const grid = document.getElementById('project-grid');
  grid.innerHTML = state.projects.map(p => {
    const todoCount = state.todos.filter(t => t.projectId === p.id).length;
    const pendingCount = state.todos.filter(t => t.projectId === p.id && !t.completed).length;
    const completedCount = todoCount - pendingCount;
    const pct = todoCount > 0 ? Math.round((completedCount / todoCount) * 100) : 0;

    // Assignees for this project
    const assigneeIds = [...new Set(state.todos.filter(t => t.projectId === p.id).map(t => t.assigneeId))];
    const assignees = assigneeIds.map(id => state.users.find(u => u.id === id)).filter(Boolean).slice(0, 4);

    return `<div class="project-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style="--project-color:${p.color}" onclick="showProjectTodos('${p.id}')">
      <div class="h-2" style="background:${p.color}"></div>
      <div class="p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style="background:${p.color}">
            ${esc(p.name.charAt(0))}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 text-sm">${esc(p.name)}</h3>
            <div class="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>${todoCount} tasks</span>
              <span class="text-blue-500 font-medium">${pendingCount} open</span>
              <span class="text-green-500 font-medium">${completedCount} done</span>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mb-4">
          <div class="flex justify-between text-xs mb-1.5">
            <span class="text-gray-500 font-medium">Progress</span>
            <span class="font-bold" style="color:${p.color}">${pct}%</span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div class="h-2 rounded-full transition-all duration-500" style="width:${pct}%;background:${p.color}"></div>
          </div>
        </div>

        <!-- Members + Delete -->
        <div class="flex items-center justify-between">
          <div class="flex -space-x-2">
            ${assignees.length > 0 ? assignees.map(u => `<div class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs" style="background:${p.color}20" title="${esc(u.name)}">${u.avatar}</div>`).join('') : '<span class="text-xs text-gray-400">No members</span>'}
          </div>
          <button onclick="event.stopPropagation(); deleteProject('${p.id}')" class="action-btn action-delete text-xs">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Delete
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ==================== Actions ====================
async function handleLogin(userId) {
  if (!userId) return;
  await api.post('/api/login', { user_id: userId });
  await loadData();
  populateFilters();
  renderAll();
  toast(`Logged in as ${state.currentUser?.name}`);
}

async function toggleTodo(id) {
  await api.patch(`/api/todos/${id}/toggle`);
  await loadData();
  renderAll();
}

async function deleteTodo(id) {
  if (!confirm('Delete this todo?')) return;
  await api.del(`/api/todos/${id}`);
  await loadData();
  renderAll();
  toast('Todo deleted');
}

async function deleteProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!confirm(`Delete project "${project?.name}"? All its todos will be removed.`)) return;
  await api.del(`/api/projects/${id}`);
  await loadData();
  populateFilters();
  renderAll();
  toast('Project deleted');
}

// ==================== Todo Modal ====================
function openTodoModal(todo) {
  document.getElementById('todo-modal').classList.remove('hidden');
  document.getElementById('todo-modal-title').textContent = todo ? 'Edit Todo' : 'New Todo';
  document.getElementById('todo-id').value = todo ? todo.id : '';
  document.getElementById('todo-title').value = todo ? todo.title : '';
  document.getElementById('todo-project').value = todo ? todo.projectId : (state.projects[0]?.id || '');
  document.getElementById('todo-assignee').value = todo ? todo.assigneeId : (state.currentUser?.id || state.users[0]?.id || '');
  document.getElementById('todo-date').value = todo ? todo.date : new Date().toISOString().split('T')[0];
  document.getElementById('todo-time').value = todo?.time || '';
  document.getElementById('todo-priority').value = todo ? todo.priority : 'medium';
  document.getElementById('todo-note').value = todo?.note || '';
  setImportance(todo ? todo.importance : 3);
}

function closeTodoModal() {
  document.getElementById('todo-modal').classList.add('hidden');
}

function editTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (todo) openTodoModal(todo);
}

function setImportance(n) {
  document.getElementById('todo-importance').value = n;
  const stars = document.querySelectorAll('#todo-importance-stars .star-btn');
  stars.forEach((star, i) => {
    if (i < n) {
      star.classList.add('text-yellow-400', 'star-active');
      star.classList.remove('text-gray-300');
    } else {
      star.classList.remove('text-yellow-400', 'star-active');
      star.classList.add('text-gray-300');
    }
  });
}

async function handleTodoSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('todo-id').value;
  const data = {
    title: document.getElementById('todo-title').value,
    project_id: document.getElementById('todo-project').value,
    assignee_id: document.getElementById('todo-assignee').value,
    date: document.getElementById('todo-date').value,
    time: document.getElementById('todo-time').value || undefined,
    priority: document.getElementById('todo-priority').value,
    importance: parseInt(document.getElementById('todo-importance').value),
    note: document.getElementById('todo-note').value || undefined
  };

  if (id) {
    await api.put(`/api/todos/${id}`, data);
    toast('Todo updated');
  } else {
    await api.post('/api/todos', data);
    toast('Todo created');
  }

  closeTodoModal();
  await loadData();
  renderAll();
}

// ==================== Project Modal ====================
function openProjectModal() {
  document.getElementById('project-modal').classList.remove('hidden');
  document.getElementById('project-name').value = '';
  document.getElementById('project-color').value = '#667eea';
  document.getElementById('project-color-label').textContent = '#667eea';
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.add('hidden');
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('project-name').value,
    color: document.getElementById('project-color').value
  };

  await api.post('/api/projects', data);
  closeProjectModal();
  await loadData();
  populateFilters();
  renderAll();
  toast('Project created');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.add('hidden');
    }
  });
});

// ==================== Utilities ====================
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ==================== Start ====================
init();

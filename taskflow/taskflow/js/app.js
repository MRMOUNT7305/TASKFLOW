// ===== DATA =====
const DEMO_USERS = [
  { id: 1, name: 'Alex Johnson', email: 'admin@demo.com', password: 'admin123', role: 'Admin', initials: 'AJ', color: '#7c6dfa' },
  { id: 2, name: 'Sarah Chen', email: 'user@demo.com', password: 'user123', role: 'Member', initials: 'SC', color: '#3ecf8e' }
];

let USERS = JSON.parse(localStorage.getItem('tf_users') || JSON.stringify(DEMO_USERS));
let TASKS = JSON.parse(localStorage.getItem('tf_tasks') || JSON.stringify([
  { id: 1, title: 'Design landing page wireframes', desc: 'Create low and high fidelity mockups for the new landing page.', status: 'todo', priority: 'high', tag: 'Design', assigneeId: 2, due: '2025-06-10', created: '2025-05-20' },
  { id: 2, title: 'Set up CI/CD pipeline', desc: 'Configure GitHub Actions for automated testing and deployment.', status: 'inprogress', priority: 'high', tag: 'DevOps', assigneeId: 1, due: '2025-06-05', created: '2025-05-18' },
  { id: 3, title: 'Write unit tests for API', desc: 'Cover all endpoints with Jest unit tests, achieve 80% coverage.', status: 'inprogress', priority: 'medium', tag: 'Testing', assigneeId: 1, due: '2025-06-12', created: '2025-05-15' },
  { id: 4, title: 'Update documentation', desc: 'Refresh README and API docs to reflect latest changes.', status: 'done', priority: 'low', tag: 'Docs', assigneeId: 2, due: '2025-05-30', created: '2025-05-10' },
  { id: 5, title: 'User research interviews', desc: 'Conduct 5 user interviews to gather feedback on the dashboard.', status: 'todo', priority: 'medium', tag: 'Research', assigneeId: 2, due: '2025-06-15', created: '2025-05-22' },
  { id: 6, title: 'Performance audit', desc: 'Run Lighthouse audits and fix critical performance issues.', status: 'done', priority: 'high', tag: 'Frontend', assigneeId: 1, due: '2025-05-28', created: '2025-05-05' }
]));
let nextId = Math.max(...TASKS.map(t => t.id), 0) + 1;

// ===== STATE =====
let currentUser = null;
let currentView = 'board';
let filterPriority = 'all';
let filterStatus = 'all';
let searchQuery = '';
let editingTaskId = null;
let sidebarOpen = false;

// ===== STORAGE =====
function saveUsers() { localStorage.setItem('tf_users', JSON.stringify(USERS)); }
function saveTasks() { localStorage.setItem('tf_tasks', JSON.stringify(TASKS)); }
function persistCurrentUser(user) {
  if (user) localStorage.setItem('tf_current_user', JSON.stringify(user));
  else localStorage.removeItem('tf_current_user');
}

// ===== AUTH =====
function switchTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const user = USERS.find(u => u.email === email && u.password === pass);
  if (!user) {
    document.getElementById('login-error').textContent = 'Invalid email or password.';
    return;
  }
  document.getElementById('login-error').textContent = '';
  currentUser = user;
  persistCurrentUser(user);
  enterApp();
}

function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  if (!name || !email || !pass) { errEl.textContent = 'All fields are required.'; return; }
  if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (USERS.find(u => u.email === email)) { errEl.textContent = 'Email already registered.'; return; }
  errEl.textContent = '';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#7c6dfa', '#3ecf8e', '#60a5fa', '#fbbf24', '#f87171', '#f472b6'];
  const newUser = { id: USERS.length + 1, name, email, password: pass, role: 'Member', initials, color: colors[USERS.length % colors.length] };
  USERS.push(newUser);
  saveUsers();
  currentUser = newUser;
  persistCurrentUser(newUser);
  enterApp();
  toast(`Welcome, ${name}!`, 'success');
}

function doLogout() {
  currentUser = null;
  persistCurrentUser(null);
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('login-email').value = 'admin@demo.com';
  document.getElementById('login-password').value = 'admin123';
  filterPriority = 'all'; filterStatus = 'all'; searchQuery = '';
}

function enterApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('nav-name').textContent = currentUser.name;
  document.getElementById('nav-role').textContent = currentUser.role;
  document.getElementById('nav-avatar').textContent = currentUser.initials;
  document.getElementById('nav-avatar').style.background = currentUser.color;
  populateAssigneeDropdown();
  renderAll();
  toast(`Welcome back, ${currentUser.name}!`, 'success');
}

// ===== FILTERS & VIEWS =====
function setView(v) {
  currentView = v;
  document.getElementById('board-view').style.display = v === 'board' ? 'block' : 'none';
  document.getElementById('list-view').style.display = v === 'list' ? 'block' : 'none';
  document.getElementById('page-title').textContent = v === 'board' ? 'Kanban Board' : 'Task List';
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  renderAll();
  if (window.innerWidth <= 700) closeSidebar();
}

function filterByPriority(p) {
  filterPriority = filterPriority === p ? 'all' : p;
  filterStatus = 'all';
  renderAll(); updateChips();
  if (window.innerWidth <= 700) closeSidebar();
}

function filterByStatus(s) {
  filterStatus = filterStatus === s ? 'all' : s;
  filterPriority = 'all';
  renderAll(); updateChips();
  if (window.innerWidth <= 700) closeSidebar();
}

function clearFilters() {
  filterPriority = 'all'; filterStatus = 'all'; searchQuery = '';
  document.getElementById('search-input').value = '';
  renderAll(); updateChips();
}

function doSearch(q) { searchQuery = q; renderAll(); }

function updateChips() {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (filterPriority === 'all' && filterStatus === 'all' && !searchQuery) {
    document.getElementById('chip-all').classList.add('active');
  } else {
    if (filterPriority !== 'all') { const el = document.getElementById('chip-' + filterPriority); if (el) el.classList.add('active'); }
    if (filterStatus !== 'all') { const el = document.getElementById('chip-' + filterStatus); if (el) el.classList.add('active'); }
  }
}

function getFiltered() {
  return TASKS.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.tag||'').toLowerCase().includes(q) && !(t.desc||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ===== RENDER =====
function renderAll() {
  renderStats();
  renderProgress();
  if (currentView === 'board') renderBoard();
  else renderList();
}

function renderStats() {
  document.getElementById('stat-todo').textContent = TASKS.filter(t => t.status === 'todo').length;
  document.getElementById('stat-inprog').textContent = TASKS.filter(t => t.status === 'inprogress').length;
  document.getElementById('stat-done').textContent = TASKS.filter(t => t.status === 'done').length;
  document.getElementById('stat-total').textContent = TASKS.length;
}

function renderProgress() {
  const pct = TASKS.length ? Math.round(TASKS.filter(t => t.status === 'done').length / TASKS.length * 100) : 0;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

function renderBoard() {
  const filtered = getFiltered();
  ['todo', 'inprogress', 'done'].forEach(status => {
    const tasks = filtered.filter(t => t.status === status);
    const col = document.getElementById('col-' + status);
    const cnt = document.getElementById('cnt-' + status);
    cnt.textContent = tasks.length;
    if (tasks.length === 0) {
      col.innerHTML = '<div class="empty-col">No tasks here</div>';
    } else {
      col.innerHTML = tasks.map(t => taskCardHTML(t)).join('');
    }
  });
}

function renderList() {
  const filtered = getFiltered();
  const container = document.getElementById('task-list');
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:13px">No tasks match your filters</div>';
    return;
  }
  container.innerHTML = filtered.map(t => listItemHTML(t)).join('');
}

function taskCardHTML(t) {
  const user = USERS.find(u => u.id === t.assigneeId);
  return `<div class="task-card" onclick="openEditModal(${t.id})">
    <div class="task-actions">
      <button class="act-btn" onclick="event.stopPropagation();openEditModal(${t.id})" title="Edit">✎</button>
      <button class="act-btn del" onclick="event.stopPropagation();deleteTask(${t.id})" title="Delete">🗑</button>
    </div>
    <div class="task-card-title">${escHtml(t.title)}</div>
    <div class="task-card-meta">
      <span class="badge badge-${t.priority}">${t.priority}</span>
      ${t.tag ? `<span class="badge badge-tag">${escHtml(t.tag)}</span>` : ''}
      ${user ? `<div class="task-assignee" style="background:${user.color}" title="${user.name}">${user.initials}</div>` : ''}
      ${t.due ? `<span class="task-date">${fmtDate(t.due)}</span>` : ''}
    </div>
  </div>`;
}

function listItemHTML(t) {
  const isDone = t.status === 'done';
  return `<div class="list-item" onclick="openEditModal(${t.id})">
    <div class="check-circle ${isDone ? 'done' : ''}" onclick="event.stopPropagation();toggleDone(${t.id})">${isDone ? '✓' : ''}</div>
    <div style="flex:1">
      <div class="list-title ${isDone ? 'striked' : ''}">${escHtml(t.title)}</div>
      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">
        <span class="badge badge-${t.priority}">${t.priority}</span>
        ${t.tag ? `<span class="badge badge-tag">${escHtml(t.tag)}</span>` : ''}
      </div>
    </div>
    <select class="status-sel" onclick="event.stopPropagation()" onchange="changeStatus(${t.id},this.value)">
      <option value="todo" ${t.status==='todo'?'selected':''}>To Do</option>
      <option value="inprogress" ${t.status==='inprogress'?'selected':''}>In Progress</option>
      <option value="done" ${t.status==='done'?'selected':''}>Done</option>
    </select>
    <span class="list-date">${t.due ? fmtDate(t.due) : ''}</span>
    <button class="list-del" onclick="event.stopPropagation();deleteTask(${t.id})" title="Delete">🗑</button>
  </div>`;
}

// ===== MODAL =====
function populateAssigneeDropdown() {
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>' +
    USERS.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
}

function openModal() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'New Task';
  document.getElementById('save-btn').textContent = 'Create Task';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-tag').value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-assignee').value = '';
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.getElementById('task-title').focus(), 200);
}

function openEditModal(id) {
  const t = TASKS.find(t => t.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('save-btn').textContent = 'Save Changes';
  document.getElementById('delete-btn').style.display = 'inline-flex';
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-desc').value = t.desc || '';
  document.getElementById('task-priority').value = t.priority;
  document.getElementById('task-status').value = t.status;
  document.getElementById('task-tag').value = t.tag || '';
  document.getElementById('task-due').value = t.due || '';
  document.getElementById('task-assignee').value = t.assigneeId || '';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  editingTaskId = null;
}

function saveTask() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { toast('Title is required', 'error'); document.getElementById('task-title').focus(); return; }
  const data = {
    title,
    desc: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    tag: document.getElementById('task-tag').value.trim(),
    due: document.getElementById('task-due').value,
    assigneeId: parseInt(document.getElementById('task-assignee').value) || null
  };
  if (editingTaskId) {
    const idx = TASKS.findIndex(t => t.id === editingTaskId);
    if (idx > -1) { TASKS[idx] = { ...TASKS[idx], ...data }; toast('Task updated', 'success'); }
  } else {
    TASKS.push({ id: nextId++, created: today(), ...data });
    toast('Task created!', 'success');
  }
  saveTasks();
  closeModal();
  renderAll();
}

function deleteCurrentTask() {
  if (!editingTaskId) return;
  if (!confirm('Delete this task?')) return;
  deleteTask(editingTaskId);
  closeModal();
}

function deleteTask(id) {
  TASKS = TASKS.filter(t => t.id !== id);
  saveTasks(); renderAll();
  toast('Task deleted', 'info');
}

function toggleDone(id) {
  const t = TASKS.find(t => t.id === id);
  if (t) { t.status = t.status === 'done' ? 'todo' : 'done'; saveTasks(); renderAll(); }
}

function changeStatus(id, status) {
  const t = TASKS.find(t => t.id === id);
  if (t) { t.status = status; saveTasks(); renderAll(); }
}

// ===== SIDEBAR =====
function toggleSidebar() { sidebarOpen ? closeSidebar() : openSidebar(); }
function openSidebar() {
  sidebarOpen = true;
  document.getElementById('sidebar').classList.add('open');
  let ov = document.getElementById('sidebar-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'sidebar-ov'; ov.className = 'sidebar-overlay'; ov.onclick = closeSidebar; document.body.appendChild(ov); }
  ov.classList.add('show');
}
function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  const ov = document.getElementById('sidebar-ov');
  if (ov) ov.classList.remove('show');
}

// ===== TOAST =====
let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ===== UTILS =====
function escHtml(s) { const d = document.createElement('div'); d.appendChild(document.createTextNode(s || '')); return d.innerHTML; }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('login-form').style.display !== 'none' && document.activeElement.id === 'login-password') doLogin();
  if (e.key === 'Enter' && document.getElementById('modal').classList.contains('open') && e.ctrlKey) saveTask();
});

// ===== INIT =====
window.addEventListener('load', () => {
  // Check for persisted session
  const savedUser = localStorage.getItem('tf_current_user');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      const fresh = USERS.find(x => x.id === u.id && x.email === u.email);
      if (fresh) { currentUser = fresh; enterApp(); return; }
    } catch (e) {}
  }
});

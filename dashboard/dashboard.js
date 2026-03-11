/* ===== Dashboard Main Script ===== */

document.addEventListener('DOMContentLoaded', init);

// State
let allJobs = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let searchQuery = '';
let currentDrawerJobId = null;
let currentView = 'table';

// DOM refs
const tableBody = document.getElementById('tableBody');
const emptyDash = document.getElementById('emptyDash');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const addBtn = document.getElementById('addBtn');
const addModal = document.getElementById('addModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const addActionBtn = document.getElementById('addActionBtn');
const actionsList = document.getElementById('actionsList');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawer = document.getElementById('drawer');
const drawerCompany = document.getElementById('drawerCompany');
const drawerBody = document.getElementById('drawerBody');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const drawerEditBtn = document.getElementById('drawerEditBtn');
const toastEl = document.getElementById('toast');

// ===== Init =====
async function init() {
  allJobs = await StorageManager.getJobs();
  renderAll();
  bindEvents();
}

// ===== Bind Events =====
function bindEvents() {
  // Stat card filters
  document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentFilter = card.dataset.filter;
      renderView();
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderView();
  });

  // Sort
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderView();
  });

  // View toggle
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      switchView();
    });
  });

  // Add
  addBtn.addEventListener('click', () => openAddModal());
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
  modalCloseBtn.addEventListener('click', closeAddModal);
  modalCancelBtn.addEventListener('click', closeAddModal);
  modalSaveBtn.addEventListener('click', saveJob);
  addActionBtn.addEventListener('click', addActionRow);

  // Bind initial action row's remove button
  const initRemove = actionsList.querySelector('.remove-action');
  if (initRemove) initRemove.addEventListener('click', function() { this.closest('li').remove(); });

  // Platform chips
  document.querySelectorAll('.platform-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const chips = document.querySelectorAll('.platform-chip');
      const hidden = document.getElementById('inputApplyThrough');
      if (chip.classList.contains('selected')) {
        chip.classList.remove('selected');
        hidden.value = '';
      } else {
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        hidden.value = chip.dataset.value;
      }
    });
  });

  // Drawer
  drawerCloseBtn.addEventListener('click', closeDrawer);
  drawerEditBtn.addEventListener('click', () => {
    closeDrawer();
    if (currentDrawerJobId) openEditModal(currentDrawerJobId);
  });

  // Overlay clicks
  addModal.addEventListener('click', (e) => { if (e.target === addModal) closeAddModal(); });
  drawerOverlay.addEventListener('click', (e) => { if (e.target === drawerOverlay) closeDrawer(); });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddModal();
      closeDrawer();
    }
  });
}

// ===== Render All =====
function renderAll() {
  renderStats();
  renderView();
}

function switchView() {
  const tableWrapper = document.querySelector('.table-wrapper');
  const timelineView = document.getElementById('timelineView');
  const analyticsView = document.getElementById('analyticsSection');
  if (tableWrapper) tableWrapper.style.display = currentView === 'table' ? '' : 'none';
  if (timelineView) timelineView.style.display = currentView === 'timeline' ? '' : 'none';
  if (analyticsView) analyticsView.style.display = currentView === 'analytics' ? '' : 'none';
  renderView();
}

function renderView() {
  if (currentView === 'timeline') {
    renderTimelineView();
  } else if (currentView === 'analytics') {
    renderAnalytics();
  } else {
    renderTable();
  }
}

// ===== Timeline View =====
function getFilteredSortedJobs() {
  let jobs = [...allJobs];
  if (currentFilter !== 'all') {
    jobs = jobs.filter(j => j.status === currentFilter);
  }
  if (searchQuery) {
    jobs = jobs.filter(j =>
      (j.company || '').toLowerCase().includes(searchQuery) ||
      (j.position || '').toLowerCase().includes(searchQuery) ||
      (j.location || '').toLowerCase().includes(searchQuery) ||
      (j.applyThrough || '').toLowerCase().includes(searchQuery) ||
      (j.roleId || '').toLowerCase().includes(searchQuery)
    );
  }
  return sortJobs(jobs, currentSort);
}

function renderTimelineView() {
  const jobs = getFilteredSortedJobs();
  const body = document.getElementById('timelineBody');
  const empty = document.getElementById('emptyTimeline');

  if (jobs.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Group by date
  const groups = {};
  jobs.forEach(job => {
    const key = formatDate(job.dateAdded);
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
  });

  const statusColors = {
    'Applied': 'var(--accent)',
    'Interviewing': 'var(--warning)',
    'Offer': 'var(--success)',
    'Rejected': 'var(--danger)',
    'Saved': '#af82ff'
  };

  let html = '';
  for (const [date, dateJobs] of Object.entries(groups)) {
    html += `<div class="tl-group">`;
    html += `<div class="tl-date-label">${date}</div>`;
    dateJobs.forEach(job => {
      const color = statusColors[job.status] || 'var(--accent)';
      const roleId = job.roleId ? `<span class="tl-role-id">${escapeHtml(job.roleId)}</span>` : '';
      const location = job.location ? `<span class="tl-item-meta"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(job.location)}</span>` : '';
      const platform = job.applyThrough ? platformBadge(job.applyThrough) : '';
      const salary = job.salary ? `<span class="tl-item-meta"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>${escapeHtml(job.salary)}</span>` : '';
      const actions = (job.nextActions && job.nextActions.length > 0)
        ? `<div class="tl-actions"><span class="tl-item-meta">Next: ${escapeHtml(job.nextActions[0])}${job.nextActions.length > 1 ? ` <span class="text-muted">+${job.nextActions.length - 1}</span>` : ''}</span></div>` : '';

      html += `
        <div class="tl-item" data-id="${job.id}">
          <div class="tl-dot" style="background:${color};box-shadow:0 0 0 3px ${color}33"></div>
          <div class="tl-line"></div>
          <div class="tl-card">
            <div class="tl-card-top">
              <div class="tl-card-info">
                <span class="tl-company">${escapeHtml(job.company)}</span>
                <span class="tl-position">${escapeHtml(job.position)} ${roleId}</span>
              </div>
              <span class="job-status-badge status-${job.status.toLowerCase()}">${escapeHtml(job.status)}</span>
            </div>
            <div class="tl-card-meta">
              ${location}${salary}${platform}
            </div>
            ${actions}
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;

  // Click events
  body.querySelectorAll('.tl-item').forEach(item => {
    item.addEventListener('click', () => openDrawer(item.dataset.id));
  });
}

// ===== Render Stats =====
function renderStats() {
  const total = allJobs.length;
  const applied = allJobs.filter(j => j.status === 'Applied').length;
  const interviewing = allJobs.filter(j => j.status === 'Interviewing').length;
  const offer = allJobs.filter(j => j.status === 'Offer').length;
  const rejected = allJobs.filter(j => j.status === 'Rejected').length;
  const saved = allJobs.filter(j => j.status === 'Saved').length;

  document.getElementById('dashStatTotal').textContent = total;
  document.getElementById('dashStatApplied').textContent = applied;
  document.getElementById('dashStatInterview').textContent = interviewing;
  document.getElementById('dashStatOffer').textContent = offer;
  document.getElementById('dashStatRejected').textContent = rejected;
  document.getElementById('dashStatSaved').textContent = saved;
}

// ===== Analytics =====
const ANALYTICS_GRID_HTML = `
  <div class="analytics-card analytics-wide">
    <div class="analytics-card-header"><h3>Applications Timeline</h3><span class="analytics-subtitle">Last 8 weeks</span></div>
    <div class="analytics-chart-bar" id="timelineChart"></div>
  </div>
  <div class="analytics-card">
    <div class="analytics-card-header"><h3>Applied Through</h3></div>
    <div class="analytics-hbars" id="sourceChart"></div>
  </div>
  <div class="analytics-card">
    <div class="analytics-card-header"><h3>Conversion Funnel</h3></div>
    <div class="analytics-funnel" id="funnelChart"></div>
  </div>
  <div class="analytics-card">
    <div class="analytics-card-header"><h3>Top Companies</h3></div>
    <div class="analytics-hbars" id="topCompaniesChart"></div>
  </div>
  <div class="analytics-card">
    <div class="analytics-card-header"><h3>Busiest Days</h3></div>
    <div class="analytics-hbars" id="weekdayChart"></div>
  </div>
`;
function renderAnalytics() {
  const grid = document.getElementById('analyticsGrid');
  if(!grid) return;

  if (allJobs.length === 0) {
    // document.getElementById('analyticsGrid').innerHTML = '<div class="empty-dash" style="display:flex;"><div class="empty-icon">📊</div><h3>No data yet</h3><p>Add applications to see analytics</p></div>';
    grid.innerHTML = `<div class="empty-dash" style="display:flex;"><div class="empty-icon">📊</div><h3>No data yet</h3><p>Add applications to see analytics</p></div>`;
    return;
  }

  //Restore chart containers if previously replaced by empty state
  if(!document.getElementById('timelineChart')) {
    grid.innerHTML = ANALYTICS_GRID_HTML;
  }

  renderTimeline();
  renderSourceBreakdown();
  renderFunnel();
  renderTopCompanies();
  renderWeekdayChart();
}

// ---- Timeline (last 8 weeks) ----
function renderTimeline() {
  const el = document.getElementById('timelineChart');
  const now = new Date();
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = allJobs.filter(j => {
      const d = new Date(j.dateAdded);
      return d >= weekStart && d < weekEnd;
    }).length;
    const label = `${weekStart.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][weekStart.getMonth()]}`;
    weeks.push({ label, count });
  }
  const max = Math.max(...weeks.map(w => w.count), 1);
  el.innerHTML = weeks.map(w => `
    <div class="tl-col">
      <div class="tl-bar-wrap"><div class="tl-bar" style="height:${(w.count / max) * 100}%"><span class="tl-val">${w.count}</span></div></div>
      <div class="tl-label">${w.label}</div>
    </div>
  `).join('');
}

// ---- Source Breakdown ----
function renderSourceBreakdown() {
  const el = document.getElementById('sourceChart');
  const counts = {};
  allJobs.forEach(j => {
    const src = j.applyThrough || 'Unknown';
    counts[src] = (counts[src] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length ? sorted[0][1] : 1;
  const colorMap = {
    'LinkedIn': '#4da3e8', 'Indeed': '#6b8fff', 'Naukri': '#4dba87',
    'Company Website': '#f0b449', 'Referral': '#af82ff', 'Glassdoor': '#3dc9a3', 'Other': '#9b9b9b', 'Unknown': '#6b6b6b'
  };
  el.innerHTML = sorted.map(([name, count]) => {
    const pct = (count / max) * 100;
    const color = colorMap[name] || '#9b9b9b';
    return `<div class="hbar-row">
      <span class="hbar-label">${escapeHtml(name)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="hbar-value">${count}</span>
    </div>`;
  }).join('');
}

// ---- Conversion Funnel ----
function renderFunnel() {
  const el = document.getElementById('funnelChart');
  const total = allJobs.length;
  const applied = allJobs.filter(j => j.status !== 'Saved').length;
  const interview = allJobs.filter(j => ['Interviewing','Offer'].includes(j.status)).length;
  const offers = allJobs.filter(j => j.status === 'Offer').length;
  const steps = [
    { label: 'Applied', count: applied, color: 'var(--accent)' },
    { label: 'Interviewing', count: interview, color: 'var(--warning)' },
    { label: 'Offers', count: offers, color: 'var(--success)' },
  ];
  const max = Math.max(applied, 1);
  el.innerHTML = steps.map((s, i) => {
    const pct = (s.count / max) * 100;
    const rate = i === 0 ? '' : `<span class="funnel-rate">${applied > 0 ? Math.round((s.count / applied) * 100) : 0}%</span>`;
    return `<div class="funnel-step">
      <div class="funnel-info"><span class="funnel-label">${s.label}</span><span class="funnel-count">${s.count}${rate}</span></div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${s.color}"></div></div>
    </div>`;
  }).join('');
}

// ---- Top Companies ----
function renderTopCompanies() {
  const el = document.getElementById('topCompaniesChart');
  const counts = {};
  allJobs.forEach(j => {
    const c = j.company || 'Unknown';
    counts[c] = (counts[c] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = sorted.length ? sorted[0][1] : 1;
  el.innerHTML = sorted.map(([name, count]) => {
    const pct = (count / max) * 100;
    return `<div class="hbar-row">
      <span class="hbar-label">${escapeHtml(name)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:var(--accent)"></div></div>
      <span class="hbar-value">${count}</span>
    </div>`;
  }).join('');
}

// ---- Weekday Distribution ----
function renderWeekdayChart() {
  const el = document.getElementById('weekdayChart');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  allJobs.forEach(j => {
    const d = new Date(j.dateAdded);
    if (!isNaN(d)) counts[d.getDay()]++;
  });
  const max = Math.max(...counts, 1);
  el.innerHTML = days.map((name, i) => {
    const pct = (counts[i] / max) * 100;
    const isTop = counts[i] === max && counts[i] > 0;
    return `<div class="hbar-row">
      <span class="hbar-label">${name}</span>
      <div class="hbar-track"><div class="hbar-fill${isTop ? ' hbar-top' : ''}" style="width:${pct}%;background:var(--accent)"></div></div>
      <span class="hbar-value">${counts[i]}</span>
    </div>`;
  }).join('');
}

// ===== Render Table =====
function renderTable() {
  let jobs = [...allJobs];

  // Filter
  if (currentFilter !== 'all') {
    jobs = jobs.filter(j => j.status === currentFilter);
  }

  // Search
  if (searchQuery) {
    jobs = jobs.filter(j =>
      (j.company || '').toLowerCase().includes(searchQuery) ||
      (j.position || '').toLowerCase().includes(searchQuery) ||
      (j.location || '').toLowerCase().includes(searchQuery) ||
      (j.applyThrough || '').toLowerCase().includes(searchQuery) ||
      (j.roleId || '').toLowerCase().includes(searchQuery)
    );
  }

  // Sort
  jobs = sortJobs(jobs, currentSort);

  if (jobs.length === 0) {
    tableBody.innerHTML = '';
    emptyDash.style.display = 'block';
    return;
  }

  emptyDash.style.display = 'none';
  tableBody.innerHTML = jobs.map(job => createRowHTML(job)).join('');

  // Row events
  tableBody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-icon')) return;
      openDrawer(row.dataset.id);
    });
  });

  tableBody.querySelectorAll('.edit-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });

  tableBody.querySelectorAll('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await StorageManager.deleteJob(btn.dataset.id);
      allJobs = await StorageManager.getJobs();
      renderAll();
      showToast('Application removed');
    });
  });
}

function platformBadge(value) {
  if (!value) return '<span class="text-muted">—</span>';
  const cls = 'platform-badge platform-' + value.toLowerCase().replace(/\s+/g, '-');
  return `<span class="${cls}">${escapeHtml(value)}</span>`;
}

function createRowHTML(job) {
  const statusClass = `status-${job.status.toLowerCase()}`;
  const date = formatDate(job.dateAdded);
  const roleId = job.roleId ? `<span class="role-id">(${escapeHtml(job.roleId)})</span>` : '';

  // Next actions preview
  let actionsPreview = '<span class="text-muted">—</span>';
  if (job.nextActions && job.nextActions.length > 0) {
    const first = escapeHtml(job.nextActions[0]);
    const more = job.nextActions.length > 1 ? ` <span class="text-muted">+${job.nextActions.length - 1}</span>` : '';
    actionsPreview = `<span class="next-action-preview">• ${first}${more}</span>`;
  }

  return `
    <tr data-id="${job.id}">
      <td><span class="table-company">${escapeHtml(job.company)}</span></td>
      <td><span class="table-role">${escapeHtml(job.position)} ${roleId}</span></td>
      <td><span class="job-status-badge ${statusClass}">${escapeHtml(job.status)}</span></td>
      <td>${escapeHtml(job.location || '—')}</td>
      <td>${platformBadge(job.applyThrough)}</td>
      <td>${escapeHtml(job.salary || '—')}</td>
      <td class="col-next-actions-cell">${actionsPreview}</td>
      <td><span class="table-date">${date}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-icon edit-row-btn" data-id="${job.id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete delete-row-btn" data-id="${job.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function sortJobs(jobs, sort) {
  switch (sort) {
    case 'date-desc':
      return jobs.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    case 'date-asc':
      return jobs.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    case 'company-asc':
      return jobs.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    case 'company-desc':
      return jobs.sort((a, b) => (b.company || '').localeCompare(a.company || ''));
    default:
      return jobs;
  }
}

// ===== Add/Edit Modal =====
function openAddModal() {
  modalTitle.textContent = 'Add New Application';
  clearForm();
  addModal.classList.add('active');
}

async function openEditModal(id) {
  const job = await StorageManager.getJob(id);
  if (!job) return;
  modalTitle.textContent = 'Edit Application';
  document.getElementById('editJobId').value = job.id;
  document.getElementById('inputCompany').value = job.company || '';
  document.getElementById('inputPosition').value = job.position || '';
  document.getElementById('inputRoleId').value = job.roleId || '';
  document.getElementById('inputStatus').value = job.status || 'Applied';
  document.getElementById('inputLocation').value = job.location || '';
  document.getElementById('inputSalary').value = job.salary || '';
  document.getElementById('inputApplyThrough').value = job.applyThrough || '';
  document.querySelectorAll('.platform-chip').forEach(c => {
    c.classList.toggle('selected', c.dataset.value === job.applyThrough);
  });
  document.getElementById('inputUrl').value = job.url || '';

  actionsList.innerHTML = '';
  if (job.nextActions && job.nextActions.length > 0) {
    job.nextActions.forEach(action => addActionRow(null, action));
  } else {
    addActionRow();
  }

  addModal.classList.add('active');
}

function closeAddModal() {
  addModal.classList.remove('active');
  clearForm();
}

function clearForm() {
  document.getElementById('editJobId').value = '';
  document.getElementById('inputCompany').value = '';
  document.getElementById('inputPosition').value = '';
  document.getElementById('inputRoleId').value = '';
  document.getElementById('inputStatus').value = 'Applied';
  document.getElementById('inputLocation').value = '';
  document.getElementById('inputSalary').value = '';
  document.getElementById('inputApplyThrough').value = '';
  document.querySelectorAll('.platform-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('inputUrl').value = '';
  actionsList.innerHTML = '';
  addActionRow();
}

function addActionRow(e, value = '') {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="bullet">•</span>
    <input type="text" placeholder="e.g. Follow up email" value="${escapeHtml(value)}">
    <button class="remove-action" title="Remove">×</button>
  `;
  li.querySelector('.remove-action').addEventListener('click', () => li.remove());
  actionsList.appendChild(li);
}

async function saveJob() {
  const company = document.getElementById('inputCompany').value.trim();
  const position = document.getElementById('inputPosition').value.trim();
  if (!company || !position) {
    showToast('Company and Position are required');
    return;
  }

  const nextActions = [];
  actionsList.querySelectorAll('input').forEach(input => {
    const val = input.value.trim();
    if (val) nextActions.push(val);
  });

  const jobData = {
    company,
    position,
    roleId: document.getElementById('inputRoleId').value.trim(),
    status: document.getElementById('inputStatus').value,
    location: document.getElementById('inputLocation').value.trim(),
    salary: document.getElementById('inputSalary').value.trim(),
    applyThrough: document.getElementById('inputApplyThrough').value.trim(),
    url: document.getElementById('inputUrl').value.trim(),
    nextActions,
  };

  try {
    const editId = document.getElementById('editJobId').value;
    if (editId) {
      await StorageManager.updateJob(editId, jobData);
      showToast('Application updated');
    } else {
      // Duplicate check: same company + roleId
      if (jobData.roleId) {
        const jobs = await StorageManager.getJobs();
        const dup = jobs.find(j => j.roleId && j.roleId.toLowerCase() === jobData.roleId.toLowerCase()
          && j.company.toLowerCase() === jobData.company.toLowerCase());
        if (dup) {
          showToast(`Already applied – ${dup.roleId} at ${dup.company}`);
          return;
        }
      }
      await StorageManager.addJob(jobData);
      showToast('Application saved');
    }

    closeAddModal();
    allJobs = await StorageManager.getJobs();
    renderAll();
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save failed – please try again');
  }
}

// ===== Drawer =====
async function openDrawer(id) {
  const job = await StorageManager.getJob(id);
  if (!job) return;
  currentDrawerJobId = id;
  drawerCompany.textContent = job.company;

  const statusClass = `status-${job.status.toLowerCase()}`;
  const actionsHtml = (job.nextActions && job.nextActions.length > 0)
    ? `<ul class="drawer-actions-list">${job.nextActions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    : `<span style="color:var(--text-muted);">No actions set</span>`;

  const urlHtml = job.url
    ? `<a href="${escapeHtml(job.url)}" target="_blank" rel="noopener">${truncateUrl(job.url)}</a>`
    : `<span style="color:var(--text-muted);">—</span>`;

  drawerBody.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-label">Position</div>
      <div class="drawer-value">${escapeHtml(job.position)} ${job.roleId ? `<span style="color:var(--text-muted);">(${escapeHtml(job.roleId)})</span>` : ''}</div>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">Status</div>
      <div class="drawer-value"><span class="job-status-badge ${statusClass}">${escapeHtml(job.status)}</span></div>
    </div>
    <div class="drawer-grid">
      <div class="drawer-section">
        <div class="drawer-label">Location</div>
        <div class="drawer-value">${escapeHtml(job.location || '—')}</div>
      </div>
      <div class="drawer-section">
        <div class="drawer-label">Salary</div>
        <div class="drawer-value">${escapeHtml(job.salary || '—')}</div>
      </div>
      <div class="drawer-section">
        <div class="drawer-label">Applied Through</div>
        <div class="drawer-value">${platformBadge(job.applyThrough)}</div>
      </div>
      <div class="drawer-section">
        <div class="drawer-label">Date Applied</div>
        <div class="drawer-value">${formatDate(job.dateAdded)}</div>
      </div>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">URL</div>
      <div class="drawer-value">${urlHtml}</div>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">Next Actions</div>
      <div class="drawer-value">${actionsHtml}</div>
    </div>
    <div class="drawer-section" style="margin-top:6px;">
      <div class="drawer-label">Last Modified</div>
      <div class="drawer-value" style="font-size:12px;color:var(--text-muted);">${formatDateTime(job.dateModified)}</div>
    </div>
  `;

  drawerOverlay.classList.add('active');
}

function closeDrawer() {
  drawerOverlay.classList.remove('active');
  currentDrawerJobId = null;
}

// ===== Helpers =====
function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${formatDate(isoStr)} at ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 30 ? u.pathname.slice(0, 30) + '…' : u.pathname);
  } catch {
    return url.length > 50 ? url.slice(0, 50) + '…' : url;
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ===== Export =====
function exportToCSV() {
  if (allJobs.length === 0) {
    showToast('No data to export');
    return;
  }

  const headers = ['Company', 'Position', 'Role ID', 'Status', 'Location', 'Salary', 'Applied Through', 'URL', 'Next Actions', 'Date Added', 'Last Modified'];

  const escCSV = (val) => {
    if (!val) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = allJobs.map(j => [
    escCSV(j.company),
    escCSV(j.position),
    escCSV(j.roleId),
    escCSV(j.status),
    escCSV(j.location),
    escCSV(j.salary),
    escCSV(j.applyThrough),
    escCSV(j.url),
    escCSV((j.nextActions || []).join('; ')),
    escCSV(j.dateAdded ? new Date(j.dateAdded).toLocaleDateString() : ''),
    escCSV(j.dateModified ? new Date(j.dateModified).toLocaleDateString() : ''),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported ' + allJobs.length + ' applications');
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}
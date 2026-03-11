/* ===== Dashboard Main Script ===== */

document.addEventListener('DOMContentLoaded', init);

// State
let allJobs = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let searchQuery = '';
let currentDrawerJobId = null;

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
      renderTable();
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTable();
  });

  // Sort
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTable();
  });

  // Add
  addBtn.addEventListener('click', () => openAddModal());
  modalCloseBtn.addEventListener('click', closeAddModal);
  modalCancelBtn.addEventListener('click', closeAddModal);
  modalSaveBtn.addEventListener('click', saveJob);
  addActionBtn.addEventListener('click', addActionRow);

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
  renderTable();
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

  const editId = document.getElementById('editJobId').value;
  if (editId) {
    await StorageManager.updateJob(editId, jobData);
    showToast('Application updated');
  } else {
    await StorageManager.addJob(jobData);
    showToast('Application saved');
  }

  closeAddModal();
  allJobs = await StorageManager.getJobs();
  renderAll();
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
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}
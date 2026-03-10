/* ===== Popup Main Script ===== */

document.addEventListener('DOMContentLoaded', init);

// DOM refs
const jobListEl = document.getElementById('jobList');
const emptyStateEl = document.getElementById('emptyState');
const fabBtn = document.getElementById('fabBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const addModal = document.getElementById('addModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const detailModal = document.getElementById('detailModal');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailEditBtn = document.getElementById('detailEditBtn');
const detailDoneBtn = document.getElementById('detailDoneBtn');
const detailCompanyEl = document.getElementById('detailCompany');
const detailBodyEl = document.getElementById('detailBody');
const addActionBtn = document.getElementById('addActionBtn');
const actionsList = document.getElementById('actionsList');
const toastEl = document.getElementById('toast');
const jobCountEl = document.getElementById('jobCount');

let currentDetailJobId = null;

// ===== Init =====
async function init() {
  await renderJobs();
  await renderStats();
  bindEvents();
}

// ===== Bind Events =====
function bindEvents() {
  fabBtn.addEventListener('click', () => openAddModal());
  modalCloseBtn.addEventListener('click', closeAddModal);
  modalCancelBtn.addEventListener('click', closeAddModal);
  modalSaveBtn.addEventListener('click', saveJob);
  detailCloseBtn.addEventListener('click', closeDetailModal);
  detailDoneBtn.addEventListener('click', closeDetailModal);
  detailEditBtn.addEventListener('click', () => {
    closeDetailModal();
    if (currentDetailJobId) openEditModal(currentDetailJobId);
  });
  addActionBtn.addEventListener('click', addActionRow);
  dashboardBtn.addEventListener('click', openDashboard);

  // Close modals on overlay click
  addModal.addEventListener('click', (e) => { if (e.target === addModal) closeAddModal(); });
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });
}

// ===== Render Jobs =====
async function renderJobs() {
  const jobs = await StorageManager.getJobs();

  if (jobs.length === 0) {
    jobListEl.style.display = 'none';
    emptyStateEl.style.display = 'flex';
    jobCountEl.textContent = '';
    return;
  }

  jobListEl.style.display = 'block';
  emptyStateEl.style.display = 'none';
  jobCountEl.textContent = `· ${jobs.length}`;

  // Show recent 15 in popup
  const recent = jobs.slice(0, 15);
  jobListEl.innerHTML = recent.map(job => createJobCardHTML(job)).join('');

  // Bind card events
  jobListEl.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      openDetailModal(card.dataset.id);
    });
  });

  jobListEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.job-card').dataset.id;
      await StorageManager.deleteJob(id);
      await renderJobs();
      await renderStats();
      showToast('Application removed');
    });
  });
}

function createJobCardHTML(job) {
  const statusClass = `status-${job.status.toLowerCase()}`;
  const date = formatDate(job.dateAdded);
  const roleId = job.roleId ? `<span class="role-id">(${job.roleId})</span>` : '';
  const location = job.location || '';
  const salary = job.salary || '';

  return `
    <div class="job-card" data-id="${job.id}">
      <button class="delete-btn" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
      <div class="job-card-top">
        <div class="job-company">${escapeHtml(job.company)}</div>
        <span class="job-status-badge ${statusClass}">${escapeHtml(job.status)}</span>
      </div>
      <div class="job-role">${escapeHtml(job.position)} ${roleId}</div>
      <div class="job-meta">
        <span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${date}
        </span>
        ${location ? `<span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(location)}
        </span>` : ''}
        ${salary ? `<span class="job-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          ${escapeHtml(salary)}
        </span>` : ''}
      </div>
    </div>
  `;
}

// ===== Render Stats =====
async function renderStats() {
  const stats = await StorageManager.getStats();
  document.getElementById('statApplied').textContent = stats.applied;
  document.getElementById('statInterview').textContent = stats.interviewing;
  document.getElementById('statOffer').textContent = stats.offer;
  document.getElementById('statRejected').textContent = stats.rejected;
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
  document.getElementById('inputIndustry').value = job.industry || '';
  document.getElementById('inputUrl').value = job.url || '';

  // Populate next actions
  actionsList.innerHTML = '';
  if (job.nextActions && job.nextActions.length > 0) {
    job.nextActions.forEach(action => {
      addActionRow(null, action);
    });
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
  document.getElementById('inputIndustry').value = '';
  document.getElementById('inputUrl').value = '';
  actionsList.innerHTML = '';
  addActionRow();
  // Scroll modal body to top
  const body = addModal.querySelector('.modal-body');
  if (body) body.scrollTop = 0;
}

function addActionRow(e, value = '') {
  const li = document.createElement('li');
  li.innerHTML = `
    <span style="color:var(--text-muted);font-size:11px;">•</span>
    <input type="text" placeholder="e.g. Follow up email" value="${escapeHtml(value)}">
    <button class="remove-action" title="Remove">×</button>
  `;
  li.querySelector('.remove-action').addEventListener('click', () => {
    li.remove();
  });
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
    industry: document.getElementById('inputIndustry').value.trim(),
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
  await renderJobs();
  await renderStats();
}

// ===== Detail Modal =====
async function openDetailModal(id) {
  const job = await StorageManager.getJob(id);
  if (!job) return;
  currentDetailJobId = id;
  detailCompanyEl.textContent = job.company;

  const statusClass = `status-${job.status.toLowerCase()}`;
  const actionsHtml = (job.nextActions && job.nextActions.length > 0)
    ? `<ul class="detail-actions-list">${job.nextActions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    : `<span style="color:var(--text-muted);">No actions set</span>`;

  const urlHtml = job.url
    ? `<a href="${escapeHtml(job.url)}" target="_blank" rel="noopener">${escapeHtml(job.url)}</a>`
    : `<span style="color:var(--text-muted);">—</span>`;

  detailBodyEl.innerHTML = `
    <div class="detail-section">
      <div class="detail-label">Position</div>
      <div class="detail-value">${escapeHtml(job.position)} ${job.roleId ? `<span style="color:var(--text-muted);">(${escapeHtml(job.roleId)})</span>` : ''}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Status</div>
      <div class="detail-value"><span class="job-status-badge ${statusClass}">${escapeHtml(job.status)}</span></div>
    </div>
    <div class="detail-grid">
      <div class="detail-section">
        <div class="detail-label">Location</div>
        <div class="detail-value">${escapeHtml(job.location || '—')}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Salary</div>
        <div class="detail-value">${escapeHtml(job.salary || '—')}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Industry</div>
        <div class="detail-value">${escapeHtml(job.industry || '—')}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Date Applied</div>
        <div class="detail-value">${formatDate(job.dateAdded)}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-label">URL</div>
      <div class="detail-value">${urlHtml}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Next Actions</div>
      <div class="detail-value">${actionsHtml}</div>
    </div>
  `;

  detailModal.classList.add('active');
}

function closeDetailModal() {
  detailModal.classList.remove('active');
  currentDetailJobId = null;
}

// ===== Dashboard =====
function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
}

// ===== Helpers =====
function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

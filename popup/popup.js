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

  // Bind initial action row's remove button
  const initRemove = actionsList.querySelector('.remove-action');
  if (initRemove) initRemove.addEventListener('click', function() { this.closest('li').remove(); });
  detailEditBtn.addEventListener('click', () => {
    closeDetailModal();
    if (currentDetailJobId) openEditModal(currentDetailJobId);
  });
  addActionBtn.addEventListener('click', addActionRow);
  dashboardBtn.addEventListener('click', openDashboard);

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
    return;
  }

  jobListEl.style.display = 'block';
  emptyStateEl.style.display = 'none';

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
  const roleId = job.roleId ? `<span class="role-id">(${escapeHtml(job.roleId)})</span>` : '';
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
        <div class="job-card-badges">
          ${job.applyThrough ? platformIcon(job.applyThrough) : ''}
          <span class="job-status-badge ${statusClass}">${escapeHtml(job.status)}</span>
        </div>
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
  document.getElementById('inputApplyThrough').value = job.applyThrough || '';
  document.querySelectorAll('.platform-chip').forEach(c => {
    c.classList.toggle('selected', c.dataset.value === job.applyThrough);
  });
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
  document.getElementById('inputApplyThrough').value = '';
  document.querySelectorAll('.platform-chip').forEach(c => c.classList.remove('selected'));
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
    await renderJobs();
    await renderStats();
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save failed – please try again');
  }
}

// ===== Detail Modal =====
function platformBadge(value) {
  if (!value) return '<span style="color:var(--text-muted);">—</span>';
  const cls = 'platform-badge platform-' + value.toLowerCase().replace(/\s+/g, '-');
  return `<span class="${cls}">${escapeHtml(value)}</span>`;
}

const PLATFORM_ICONS = {
  'LinkedIn':  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  'Indeed':    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.566 21.552v-8.678c0-.726.061-1.352.184-1.878a4.092 4.092 0 01.585-1.428c.27-.399.612-.726 1.027-.952.415-.234.916-.349 1.49-.349.857 0 1.493.282 1.905.849.415.567.621 1.39.621 2.476v9.96h3.063V10.878c0-.96-.104-1.8-.311-2.52a4.718 4.718 0 00-.952-1.836 3.977 3.977 0 00-1.612-1.132c-.648-.257-1.413-.388-2.3-.388-1.06 0-1.97.245-2.737.726a4.473 4.473 0 00-1.78 2.043h-.06V2.448H7.626v19.104h3.94zM13.4 4.145a2.07 2.07 0 002.07-2.073A2.07 2.07 0 0013.4 0a2.07 2.07 0 00-2.07 2.072 2.07 2.07 0 002.07 2.073z"/></svg>',
  'Naukri':    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm-4 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>',
  'Company Website': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
  'Referral':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  'Glassdoor': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.14 2H6.86A1.86 1.86 0 005 3.86v.28h10.28a1.86 1.86 0 011.86 1.86v12h.28A1.86 1.86 0 0019 16.14V3.86A1.86 1.86 0 0017.14 2zM6.86 22h10.28A1.86 1.86 0 0019 20.14v-.28H8.72a1.86 1.86 0 01-1.86-1.86V6H6.58A1.86 1.86 0 005 7.86v12.28A1.86 1.86 0 006.86 22z"/></svg>',
  'Other':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
};

function platformIcon(value) {
  if (!value) return '';
  const key = value.toLowerCase().replace(/\s+/g, '-');
  const svg = PLATFORM_ICONS[value] || PLATFORM_ICONS['Other'];
  return `<span class="platform-icon platform-icon-${key}" title="${escapeHtml(value)}">${svg}</span>`;
}

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
        <div class="detail-label">Applied Through</div>
        <div class="detail-value">${platformBadge(job.applyThrough)}</div>
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
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
}
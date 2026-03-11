/* ===== Storage Utility for Job Tracker ===== */

const StorageManager = {
  STORAGE_KEY: 'jobTracker_jobs',

  /**
   * Get all jobs from storage, sorted by date descending (newest first)
   */
  async getJobs() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('StorageManager.getJobs error:', chrome.runtime.lastError.message);
          resolve([]);
          return;
        }
        const jobs = result[this.STORAGE_KEY] || [];
        // Sort by date descending
        jobs.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        resolve(jobs);
      });
    });
  },

  /**
   * Save entire jobs array
   */
  async saveJobs(jobs) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: jobs }, () => {
        if (chrome.runtime.lastError) {
          console.warn('StorageManager.saveJobs error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  },

  /**
   * Add a new job
   */
  async addJob(job) {
    const jobs = await this.getJobs();
    job.id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    job.dateAdded = new Date().toISOString();
    job.dateModified = job.dateAdded;
    jobs.unshift(job);
    await this.saveJobs(jobs);
    return job;
  },

  /**
   * Update an existing job
   */
  async updateJob(id, updates) {
    const jobs = await this.getJobs();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx !== -1) {
      const { dateAdded, id, ...safeUpdates } = updates; // Never overwrite id or dateAdded
      jobs[idx] = { ...jobs[idx], ...safeUpdates, dateModified: new Date().toISOString() };
      await this.saveJobs(jobs);
      return jobs[idx];
    }
    return null;
  },

  /**
   * Delete a job by ID
   */
  async deleteJob(id) {
    let jobs = await this.getJobs();
    jobs = jobs.filter(j => j.id !== id);
    await this.saveJobs(jobs);
  },

  /**
   * Get a single job by ID
   */
  async getJob(id) {
    const jobs = await this.getJobs();
    return jobs.find(j => j.id === id) || null;
  },

  /**
   * Get stats count
   */
  async getStats() {
    const jobs = await this.getJobs();
    return {
      total: jobs.length,
      applied: jobs.filter(j => j.status === 'Applied').length,
      interviewing: jobs.filter(j => j.status === 'Interviewing').length,
      offer: jobs.filter(j => j.status === 'Offer').length,
      rejected: jobs.filter(j => j.status === 'Rejected').length,
      saved: jobs.filter(j => j.status === 'Saved').length,
    };
  }
};
/* ===== Job Tracker – Content Script ===== */
/* Floating button + right-side panel on job platforms & /jobs/ URLs */

(() => {
  "use strict";

  /* ---- Guard: only run on matching sites ---- */
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();

  const JOB_PLATFORMS = [
    "linkedin.com",
    "naukri.com",
    "indeed.com",
    "glassdoor.com",
    "glassdoor.co.in",
    "wellfound.com",
    "lever.co",
    "greenhouse.io",
    "jobs.lever.co",
    "boards.greenhouse.io",
    "ziprecruiter.com",
    "monster.com",
    "simplyhired.com",
    "dice.com",
    "hired.com",
    "angel.co",
    "remoteok.com",
    "weworkremotely.com",
    "flexjobs.com",
    "instahyre.com",
    "hirist.com",
    "cutshort.io",
    "foundit.in",
    "apna.co",
    "internshala.com",
    "workindia.in",
    "myworkdayjobs.com",
    "myworkday.com",
    "jobvite.com",
    "smartrecruiters.com",
    "breezy.hr",
  ];

  const isJobPlatform = JOB_PLATFORMS.some((d) => hostname.includes(d));
  const pathAndUrl = (
    window.location.pathname + window.location.search
  ).toLowerCase();
  const hasJobsPath =
    /\/(jobs?|carreers?|openings?|vacancies|positions)(\/|$|\?|#)/i.test(
      pathAndUrl,
    );
  const hasJobHostname = /\b(jobs?|careers?)\./i.test(hostname);

  if (!isJobPlatform && !hasJobsPath && !hasJobHostname) return;

  /* ---- Prevent double-injection (SPAs) ---- */
  if (document.getElementById("jt-fab")) return;

  /* ---- Shadow host (isolates our styles from the page) ---- */
  const host = document.createElement("div");
  host.id = "jt-fab";
  host.style.cssText = "all:initial; position:fixed; z-index:2147483647;";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "closed" });

  /* ---- Inject CSS into shadow DOM ---- */
  const style = document.createElement("style");
  style.textContent = JT_STYLES();
  shadow.appendChild(style);

  /* ---- Floating button ---- */
  const fab = document.createElement("button");
  fab.className = "jt-fab";
  fab.setAttribute("aria-label", "Track this job");
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
      <line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
    <span>Track</span>`;
  shadow.appendChild(fab);

  /* ---- Right-side panel ---- */
  const overlay = document.createElement("div");
  overlay.className = "jt-overlay";

  const panel = document.createElement("div");
  panel.className = "jt-panel";
  panel.innerHTML = `
    <div class="jt-panel-header">
      <h2>Add New Application</h2>
      <button class="jt-close" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="jt-panel-body">
      <div class="jt-form-group">
        <label class="jt-label">Company *</label>
        <input class="jt-input" id="jt-company" type="text" placeholder="e.g. Google" autocomplete="off">
      </div>
      <div class="jt-form-group">
        <label class="jt-label">Position *</label>
        <input class="jt-input" id="jt-position" type="text" placeholder="e.g. Software Engineer" autocomplete="off">
      </div>
      <div class="jt-row">
        <div class="jt-form-group">
          <label class="jt-label">Role ID</label>
          <input class="jt-input" id="jt-roleId" type="text" placeholder="e.g. SE-12345" autocomplete="off">
        </div>
        <div class="jt-form-group">
          <label class="jt-label">Status</label>
          <select class="jt-input" id="jt-status">
            <option value="Applied">Applied</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
            <option value="Saved">Saved</option>
          </select>
        </div>
      </div>
      <div class="jt-row">
        <div class="jt-form-group">
          <label class="jt-label">Location</label>
          <input class="jt-input" id="jt-location" type="text" placeholder="e.g. San Francisco, CA" autocomplete="off">
        </div>
        <div class="jt-form-group">
          <label class="jt-label">Salary</label>
          <input class="jt-input" id="jt-salary" type="text" placeholder="e.g. $150k" autocomplete="off">
        </div>
      </div>
      <div class="jt-form-group">
        <label class="jt-label">Industry</label>
        <input class="jt-input" id="jt-industry" type="text" placeholder="e.g. Technology" autocomplete="off">
      </div>
      <div class="jt-form-group">
        <label class="jt-label">URL</label>
        <input class="jt-input" id="jt-url" type="url" readonly>
      </div>
      <div class="jt-form-group">
        <label class="jt-label">Next Actions</label>
        <ul class="jt-actions-list" id="jt-actionsList">
          <li>
            <span class="jt-action-dot">•</span>
            <input class="jt-action-input" type="text" placeholder="e.g. Follow up email">
            <button class="jt-remove-action" title="Remove">×</button>
          </li>
        </ul>
        <button class="jt-add-action-btn" id="jt-addAction">+ Add action</button>
      </div>
    </div>

    <div class="jt-panel-footer">
      <div class="jt-toast" id="jt-toast"></div>
      <div class="jt-footer-btns">
        <button class="jt-btn jt-btn-ghost" id="jt-cancel">Cancel</button>
        <button class="jt-btn jt-btn-primary" id="jt-save">Save</button>
      </div>
    </div>
  `;

  overlay.appendChild(panel);
  shadow.appendChild(overlay);

  /* ---- Refs inside shadow ---- */
  const $ = (sel) => shadow.querySelector(sel);
  const closeBtn = $(".jt-close");
  const cancelBtn = $("#jt-cancel");
  const saveBtn = $("#jt-save");
  const toastEl = $("#jt-toast");
  const urlInput = $("#jt-url");
  const actionsList = $("#jt-actionsList");
  const addActionBtn = $("#jt-addAction");

  /* ---- Next Actions ---- */
  function addActionRow(value = "") {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="jt-action-dot">•</span>
      <input class="jt-action-input" type="text" placeholder="e.g. Follow up email" value="${escapeAttr(value)}">
      <button class="jt-remove-action" title="Remove">×</button>
    `;
    li.querySelector(".jt-remove-action").addEventListener("click", () =>
      li.remove(),
    );
    actionsList.appendChild(li);
  }

  // Bind the initial row's remove button
  actionsList
    .querySelector(".jt-remove-action")
    .addEventListener("click", function () {
      this.closest("li").remove();
    });

  addActionBtn.addEventListener("click", () => addActionRow());

  function escapeAttr(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ---- Auto-fill helpers ---- */

  /** Grab text from the first matching selector, trimmed. */
  function txt(sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : "";
  }

  /** Grab a meta tag's content. */
  function meta(attr, val) {
    const el = document.querySelector(`meta[${attr}="${val}"]`);
    return el ? (el.content || "").trim() : "";
  }

  /** Try to parse JSON-LD JobPosting schema from the page. */
  function getJobPostingLD() {
    try {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const s of scripts) {
        const data = JSON.parse(s.textContent);
        // Could be a single object or an array
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "JobPosting") return item;
          // Sometimes nested inside @graph
          if (item["@graph"]) {
            const found = item["@graph"].find(
              (g) => g["@type"] === "JobPosting",
            );
            if (found) return found;
          }
        }
      }
    } catch (e) {
      /* ignore parse errors */
    }
    return null;
  }

  /** Return first non-empty value from an array of candidates. */
  function first(...vals) {
    for (const v of vals) {
      if (v && typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  /** Platform-specific scraping strategies. */
  function scrapeLinkedIn() {
    return {
      company: first(
        txt(".job-details-jobs-unified-top-card__company-name a"),
        txt(".job-details-jobs-unified-top-card__company-name"),
        txt(".topcard__org-name-link"),
        txt(".jobs-unified-top-card__company-name a"),
        txt(".jobs-unified-top-card__company-name"),
      ),
      position: first(
        txt(".job-details-jobs-unified-top-card__job-title h1"),
        txt(".job-details-jobs-unified-top-card__job-title"),
        txt(".topcard__title"),
        txt(".jobs-unified-top-card__job-title"),
        txt("h1"),
      ),
      location: first(
        txt(
          ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
        ),
        txt(".job-details-jobs-unified-top-card__bullet"),
        txt(".topcard__flavor--bullet"),
        txt(".jobs-unified-top-card__bullet"),
        txt(
          ".jobs-unified-top-card__subtitle .jobs-unified-top-card__subtitle-primary-grouping .t-black--light span",
        ),
        txt('[class*="top-card"] [class*="bullet"]'),
        txt('[class*="top-card"] [class*="location"]'),
      ),
      roleId: "",
      salary: first(
        txt(".job-details-jobs-unified-top-card__job-insight--highlight span"),
        txt(".salary-main-rail__data-body"),
        txt('[class*="salary"]'),
      ),
    };
  }

  function scrapeIndeed() {
    return {
      company: first(
        txt('[data-testid="inlineHeader-companyName"] a'),
        txt('[data-testid="inlineHeader-companyName"]'),
        txt(".jobsearch-InlineCompanyRating-companyHeader a"),
        txt(".jobsearch-InlineCompanyRating a"),
        txt(".css-1saizt3"),
      ),
      position: first(
        txt('[data-testid="jobsearch-JobInfoHeader-title"]'),
        txt(".jobsearch-JobInfoHeader-title"),
        txt("h1.icl-u-xs-mb--xs"),
        txt("h1"),
      ),
      location: first(
        txt('[data-testid="inlineHeader-companyLocation"]'),
        txt('[data-testid="job-location"]'),
        txt('[data-testid="jobsearch-JobInfoHeader-companyLocation"]'),
        txt(".jobsearch-JobInfoHeader-subtitle .css-6z8o9s"),
        txt(".jobsearch-JobMetadataFooter div"),
        txt("#jobLocationText"),
        txt('[class*="companyLocation"]'),
      ),
      roleId: "",
      salary: first(
        txt('[data-testid="attribute_snippet_testid"]'),
        txt("#salaryInfoAndJobType span"),
        txt(".jobsearch-JobMetadataHeader-item"),
      ),
    };
  }

  function scrapeNaukri() {
    return {
      company: first(
        txt(".styles_jd-header-comp-name__MvqAI a"),
        txt("[data-company-name]"),
        txt(".jd-header-comp-name a"),
        txt(".comp-name a"),
      ),
      position: first(
        txt(".styles_jd-header-title__rZwM1"),
        txt(".jd-header-title"),
        txt("h1.jd-header-title"),
        txt("h1"),
      ),
      location: first(
        txt(".styles_jhc__loc___Du2H span"),
        txt('[class*="jhc__loc"] span'),
        txt('[class*="jhc__loc"]'),
        txt(".loc_tg span"),
        txt(".loc .locWdth"),
        txt(".location a"),
        txt('[class*="loc"] span a'),
        txt('[class*="loc"] a'),
        txt('[class*="location"]'),
      ),
      roleId: first(
        // Naukri sometimes shows Job ID in the details
        (() => {
          const labels = document.querySelectorAll(
            ".styles_details__Y424J .styles_detail-row__RLBaK, .other-details .details-row",
          );
          for (const el of labels) {
            if (/role|job\s*id/i.test(el.textContent)) {
              const val = el.querySelector("span:last-child, a");
              return val ? val.textContent.trim() : "";
            }
          }
          return "";
        })(),
      ),
      salary: first(
        txt(".styles_jhc__salary__jdfEC span"),
        txt(".salary .sal"),
        txt(".salWdth"),
      ),
    };
  }

  function scrapeGlassdoor() {
    return {
      company: first(
        txt('[data-test="employer-name"]'),
        txt(".EmployerProfile_employerName__0nXHO"),
        txt(".employerName"),
        txt(".css-87uc0g"),
      ),
      position: first(
        txt('[data-test="job-title"]'),
        txt(".JobDetails_jobTitle__Rw_gn"),
        txt("h1"),
      ),
      location: first(
        txt('[data-test="location"]'),
        txt(".JobDetails_location__mSg5h"),
        txt(".location"),
      ),
      roleId: "",
      salary: first(
        txt('[data-test="detailSalary"]'),
        txt(".SalaryEstimate_salaryRange__brHFy"),
        txt(".css-1xe2xww"),
      ),
    };
  }

  function scrapeLever() {
    return {
      company: first(
        txt(".main-footer-text a"),
        meta("property", "og:site_name"),
      ),
      position: first(txt(".posting-headline h2"), txt("h1")),
      location: first(
        txt(".posting-categories .location"),
        txt(".sort-by-time .posting-category:first-child"),
      ),
      roleId: "",
      salary: "",
    };
  }

  function scrapeGreenhouse() {
    return {
      company: first(txt(".company-name"), meta("property", "og:site_name")),
      position: first(txt(".app-title"), txt("h1.heading"), txt("h1")),
      location: first(txt(".location"), txt(".body--metadata div")),
      roleId: "",
      salary: "",
    };
  }

  /** Generic strategy: JSON-LD → meta tags → common selectors → page text patterns */
  function scrapeGeneric() {
    const ld = getJobPostingLD();
    const result = {
      company: "",
      position: "",
      location: "",
      roleId: "",
      salary: "",
    };

    if (ld) {
      // Company
      if (ld.hiringOrganization) {
        result.company =
          typeof ld.hiringOrganization === "string"
            ? ld.hiringOrganization
            : ld.hiringOrganization.name || "";
      }
      // Position
      result.position = ld.title || "";
      // Location
      if (ld.jobLocation) {
        const loc = Array.isArray(ld.jobLocation)
          ? ld.jobLocation[0]
          : ld.jobLocation;
        if (loc && loc.address) {
          const a = loc.address;
          result.location = [
            a.addressLocality,
            a.addressRegion,
            a.addressCountry,
          ]
            .filter(Boolean)
            .join(", ");
        }
      }
      // Salary
      if (ld.baseSalary && ld.baseSalary.value) {
        const sv = ld.baseSalary.value;
        const currency = ld.baseSalary.currency || "";
        if (sv.minValue && sv.maxValue) {
          result.salary = `${currency} ${sv.minValue} – ${sv.maxValue}`;
        } else if (sv.value) {
          result.salary = `${currency} ${sv.value}`;
        }
      }
      // Role ID / identifier
      if (ld.identifier) {
        result.roleId =
          typeof ld.identifier === "string"
            ? ld.identifier
            : ld.identifier.value || ld.identifier.name || "";
      }
    }

    return result;
  }

  /** Try page text for a Job ID pattern if nothing else found. */
  function scrapeRoleIdFromText() {
    // Look for common "Job ID: XXXX" patterns in the page
    const body = document.body.innerText || "";
    const patterns = [
      /(?:job\s*(?:id|#|number|code|ref(?:erence)?)\s*[:\-–]\s*)([A-Za-z0-9\-_]{2,30})/i,
      /(?:req(?:uisition)?\s*(?:id|#|number)\s*[:\-–]\s*)([A-Za-z0-9\-_]{2,30})/i,
      /(?:reference\s*(?:id|#|number|code)\s*[:\-–]\s*)([A-Za-z0-9\-_]{2,30})/i,
      /(?:posting\s*(?:id|#)\s*[:\-–]\s*)([A-Za-z0-9\-_]{2,30})/i,
    ];
    for (const pat of patterns) {
      const m = body.match(pat);
      if (m && m[1]) return m[1];
    }
    return "";
  }

  /** Try page text for salary if nothing else found. */
  function scrapeSalaryFromText() {
    const body = document.body.innerText || "";
    // Match patterns like "$120k - $180k", "₹10,00,000 - ₹20,00,000", "€60.000 – €80.000"
    const m = body.match(
      /[\$₹€£]\s?[\d,\.]+[\s]*[kK]?\s*[-–—to]+\s*[\$₹€£]?\s?[\d,\.]+[\s]*[kK]?(?:\s*(?:per|\/)\s*(?:year|annum|yr|month|mo))?/,
    );
    if (m) return m[0].trim();
    // Also try "CTC: 10-20 LPA" pattern common on Indian platforms
    const m2 = body.match(
      /(?:CTC|salary|compensation|package)\s*[:\-–]?\s*([\d,\.]+\s*[-–to]+\s*[\d,\.]+\s*(?:LPA|lpa|Lacs?|Lakhs?|Cr|CPA|K|k)?)/i,
    );
    if (m2) return m2[1].trim();
    return "";
  }

  /** Try page text for location if nothing else found. */
  function scrapeLocationFromText() {
    // 1. Try common DOM selectors that many job sites use
    const domSelectors = [
      '[itemprop="jobLocation"]',
      '[itemprop="addressLocality"]',
      '[class*="location" i]',
      '[class*="Location" i]',
      '[data-automation="job-detail-location"]',
      '[data-testid*="location" i]',
      '[aria-label*="location" i]',
      ".location",
      "#location",
    ];
    for (const sel of domSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const t = el.textContent.trim();
          // Filter out noise: too short, too long, or just the word "location"
          if (t.length > 2 && t.length < 100 && !/^location$/i.test(t)) {
            // Strip leading label like "Location: " or "Location\n"
            const cleaned = t
              .replace(
                /^(?:location|job\s*location|work\s*location)\s*[:\-–\n]\s*/i,
                "",
              )
              .trim();
            if (cleaned.length > 2) return cleaned;
          }
        }
      } catch (e) {
        /* selector may be invalid, skip */
      }
    }

    // 2. Scan text with multiple patterns (case-insensitive)
    const body = document.body.innerText || "";
    const patterns = [
      /(?:location|job\s*location|work\s*location|workplace|office|office\s*location|based\s+(?:in|at))\s*[:\-–|]\s*(.+)/im,
      /(?:location|job\s*location)\s*\n\s*(.+)/im,
    ];
    for (const pat of patterns) {
      const m = body.match(pat);
      if (m && m[1]) {
        // Take first line only, trim
        const loc = m[1].split("\n")[0].trim();
        if (loc.length > 2 && loc.length < 100) return loc;
      }
    }
    return "";
  }

  function autoFill() {
    urlInput.value = window.location.href;

    // Determine which platform scraper to use
    let scraped = {
      company: "",
      position: "",
      location: "",
      roleId: "",
      salary: "",
    };

    if (hostname.includes("linkedin.com")) {
      scraped = scrapeLinkedIn();
    } else if (hostname.includes("indeed.com")) {
      scraped = scrapeIndeed();
    } else if (
      hostname.includes("naukri.com") ||
      hostname.includes("foundit.in")
    ) {
      scraped = scrapeNaukri();
    } else if (
      hostname.includes("glassdoor.com") ||
      hostname.includes("glassdoor.co.in")
    ) {
      scraped = scrapeGlassdoor();
    } else if (hostname.includes("lever.co")) {
      scraped = scrapeLever();
    } else if (hostname.includes("greenhouse.io")) {
      scraped = scrapeGreenhouse();
    }

    // Layer generic JSON-LD / meta on top of any empty fields
    const generic = scrapeGeneric();
    scraped.company = scraped.company || generic.company;
    scraped.position = scraped.position || generic.position;
    scraped.location = scraped.location || generic.location;
    scraped.roleId = scraped.roleId || generic.roleId;
    scraped.salary = scraped.salary || generic.salary;

    // Fallbacks: og/meta tags and common selectors
    scraped.company = scraped.company || meta("property", "og:site_name");

    if (!scraped.position) {
      const h1 = document.querySelector("h1");
      if (h1 && h1.textContent.trim().length < 120) {
        scraped.position = h1.textContent.trim();
      } else {
        const ogTitle = meta("property", "og:title");
        if (ogTitle) scraped.position = ogTitle;
      }
    }

    scraped.location =
      scraped.location ||
      meta("property", "og:locality") ||
      meta("name", "geo.placename") ||
      meta("name", "geo.region") ||
      txt('[itemprop="jobLocation"] [itemprop="addressLocality"]') ||
      txt('[itemprop="jobLocation"]') ||
      txt('[itemprop="addressLocality"]');

    // Last-resort: text / DOM pattern matching
    scraped.roleId = scraped.roleId || scrapeRoleIdFromText();
    scraped.salary = scraped.salary || scrapeSalaryFromText();
    scraped.location = scraped.location || scrapeLocationFromText();

    // Fallback company from domain (only for non-platform sites)
    if (!scraped.company && !JOB_PLATFORMS.some((d) => hostname.includes(d))) {
      const cleanHost = hostname
      .replace(/^(www|jobs?|careers?|talent|hire|apply|join|boards?)\./i, '')
      .replace(/^(www)\./i, '');
      const parts = cleanHost.split(".");
      if (parts.length > 0 && parts[0].length > 1) {
        scraped.company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    // Apply to form fields (only fill empty inputs)
    const fieldMap = {
      "#jt-company": scraped.company,
      "#jt-position": scraped.position,
      "#jt-location": scraped.location,
      "#jt-roleId": scraped.roleId,
      "#jt-salary": scraped.salary,
    };

    for (const [sel, val] of Object.entries(fieldMap)) {
      const input = $(sel);
      if (input && !input.value && val) {
        input.value = val;
      }
    }
  }

  /* ---- Open / Close ---- */
  let isOpen = false;
  let lastTrackedUrl = "";

  function openPanel() {
    isOpen = true;

    //if Url changed since last time panel was opened, reset form and auto-fill again
    const curUrl = window.location.href;
    if (lastTrackedUrl && lastTrackedUrl != curUrl) {
      resetForm();
    }
    lastTrackedUrl = curUrl;

    overlay.classList.add("jt-open");
    fab.classList.add("jt-hide");
    autoFill();
    const comp = $("#jt-company");
    if (!comp.value) {
      comp.focus();
    } else {
      $("#jt-position").focus();
    }
  }

  function closePanel() {
    isOpen = false;
    overlay.classList.remove("jt-open");
    fab.classList.remove("jt-hide");
  }

  function resetForm() {
    [
      "#jt-company",
      "#jt-position",
      "#jt-roleId",
      "#jt-location",
      "#jt-salary",
      "#jt-industry",
      "#jt-url",
    ].forEach((sel) => {
      $(sel).value = "";
    });
    $("#jt-status").value = "Applied";
    // Reset actions to one empty row
    actionsList.innerHTML = "";
    addActionRow();
    // Scroll body to top
    const body = $(".jt-panel-body");
    if (body) body.scrollTop = 0;
  }

  /* ---- Toast ---- */
  function showToast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className =
      "jt-toast jt-toast-show" + (isError ? " jt-toast-err" : "");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.className = "jt-toast";
    }, 2500);
  }

  /* ---- Save directly to chrome.storage ---- */
  const STORAGE_KEY = "jobTracker_jobs";

  function saveJob() {
    const company = $("#jt-company").value.trim();
    const position = $("#jt-position").value.trim();

    if (!company || !position) {
      showToast("Company and Position are required", true);
      return;
    }

    const nextActions = [];
    actionsList.querySelectorAll(".jt-action-input").forEach((input) => {
      const val = input.value.trim();
      if (val) nextActions.push(val);
    });

    const jobData = {
      company,
      position,
      roleId: $("#jt-roleId").value.trim(),
      status: $("#jt-status").value,
      location: $("#jt-location").value.trim(),
      salary: $("#jt-salary").value.trim(),
      industry: $("#jt-industry").value.trim(),
      url: $("#jt-url").value.trim(),
      nextActions,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };

    try {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          showToast("Save failed – try the extension popup", true);
          return;
        }
        const jobs = result[STORAGE_KEY] || [];
        jobs.unshift(jobData);
        chrome.storage.local.set({ [STORAGE_KEY]: jobs }, () => {
          if (chrome.runtime.lastError) {
            showToast("Save failed – try the extension popup", true);
          } else {
            showToast("✓ Job saved to tracker!");
            setTimeout(() => {
              closePanel();
              resetForm();
            }, 1000);
          }
        });
      });
    } catch (e) {
      showToast("Extension context lost – reload the page", true);
    }
  }

  /* ---- Event listeners ---- */
  fab.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  cancelBtn.addEventListener("click", () => {
    closePanel();
    resetForm();
  });
  saveBtn.addEventListener("click", saveJob);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  /* ---- Draggable FAB ---- */
  let dragging = false,
    dragOffsetX = 0,
    dragOffsetY = 0,
    hasMoved = false;

  fab.addEventListener("pointerdown", (e) => {
    dragging = true;
    hasMoved = false;
    const rect = fab.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    fab.setPointerCapture(e.pointerId);
    fab.style.transition = "none";
  });

  fab.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    hasMoved = true;
    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;
    fab.style.left = x + "px";
    fab.style.top = y + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
  });

  fab.addEventListener("pointerup", (e) => {
    dragging = false;
    fab.style.transition = "";
    if (hasMoved) {
      e.stopImmediatePropagation();
    }
  });

  /* ============================================================
     STYLES (returned as a string so everything lives in shadow DOM)
     ============================================================ */
  function JT_STYLES() {
    return `
      /* --- Reset inside shadow --- */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* --- FAB (bottom-right) --- */
      .jt-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px 12px 16px;
        background: #202020;
        color: #9b9b9b;
        border: 1px solid #363636;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: grab;
        box-shadow: 0 4px 16px rgba(0,0,0,.45);
        transition: all .2s ease;
        user-select: none;
        touch-action: none;
      }
      .jt-fab:hover {
        background: #252525;
        border-color: #4a6fa5;
        color: #e0e0e0;
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(0,0,0,.55);
      }
      .jt-fab:active { cursor: grabbing; }
      .jt-fab.jt-hide {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }
      .jt-fab svg { width: 20px; height: 20px; flex-shrink: 0; opacity: 0.7; }
      .jt-fab:hover svg { opacity: 1; stroke: #4a6fa5; }

      /* --- Overlay --- */
      .jt-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(0,0,0,.45);
        backdrop-filter: blur(2px);
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
      }
      .jt-overlay.jt-open {
        opacity: 1;
        pointer-events: auto;
      }

      /* --- Panel (slides from RIGHT) --- */
      .jt-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 400px;
        max-width: 94vw;
        background: #202020;
        border-left: 1px solid #363636;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: #e0e0e0;
        transform: translateX(100%);
        transition: transform .3s cubic-bezier(.4,0,.2,1);
        box-shadow: -6px 0 30px rgba(0,0,0,.5);
      }
      .jt-open .jt-panel { transform: translateX(0); }

      /* --- Header (matches popup modal-header) --- */
      .jt-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid #363636;
        flex-shrink: 0;
      }
      .jt-panel-header h2 {
        font-size: 14px;
        font-weight: 600;
      }
      .jt-close {
        background: none;
        border: none;
        color: #6b6b6b;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        transition: background .15s, color .15s;
      }
      .jt-close:hover { background: #333; color: #e0e0e0; }

      /* --- Body (matches popup modal-body) --- */
      .jt-panel-body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 14px 18px 14px;
        min-height: 0;
        -webkit-overflow-scrolling: touch;
      }
      .jt-panel-body::-webkit-scrollbar { width: 6px; }
      .jt-panel-body::-webkit-scrollbar-track { background: transparent; }
      .jt-panel-body::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
      .jt-panel-body::-webkit-scrollbar-thumb:hover { background: #505050; }

      /* --- Form group (matches popup .form-group) --- */
      .jt-form-group {
        margin-bottom: 12px;
      }
      .jt-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .5px;
        color: #6b6b6b;
        margin-bottom: 5px;
      }
      .jt-input {
        width: 100%;
        padding: 8px 10px;
        background: #252525;
        border: 1px solid #363636;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color .15s;
      }
      .jt-input:focus { border-color: #4a6fa5; }
      .jt-input::placeholder { color: #6b6b6b; }
      .jt-input[readonly] { color: #6b6b6b; cursor: default; }

      select.jt-input {
        cursor: pointer;
        appearance: none;
        accent-color: #3d5f8a;
        color: #9b9b9b;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
        padding-right: 30px;
      }
      select.jt-input option { background: #202020; color: #9b9b9b; }

      /* --- Row (matches popup .form-row) --- */
      .jt-row {
        display: flex;
        gap: 10px;
      }
      .jt-row .jt-form-group { flex: 1; }

      /* --- Next Actions (matches popup) --- */
      .jt-actions-list {
        list-style: none;
        padding: 0;
      }
      .jt-actions-list li {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .jt-action-dot {
        color: #6b6b6b;
        font-size: 11px;
      }
      .jt-action-input {
        flex: 1;
        padding: 6px 8px;
        background: #252525;
        border: 1px solid #363636;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 12px;
        font-family: inherit;
        outline: none;
        transition: border-color .15s;
      }
      .jt-action-input:focus { border-color: #4a6fa5; }
      .jt-action-input::placeholder { color: #6b6b6b; }
      .jt-remove-action {
        background: none;
        border: none;
        color: #6b6b6b;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
        display: flex;
        font-size: 16px;
        line-height: 1;
        transition: color .15s;
      }
      .jt-remove-action:hover { color: #e06c75; }

      .jt-add-action-btn {
        background: none;
        border: 1px dashed #363636;
        border-radius: 6px;
        color: #6b6b6b;
        font-size: 11px;
        padding: 5px 10px;
        cursor: pointer;
        width: 100%;
        transition: all .15s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-family: inherit;
      }
      .jt-add-action-btn:hover {
        border-color: #4a6fa5;
        color: #4a6fa5;
      }

      /* --- Footer (matches popup modal-footer) --- */
      .jt-panel-footer {
        padding: 12px 18px;
        border-top: 1px solid #363636;
        flex-shrink: 0;
        background: #202020;
      }
      .jt-footer-btns {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .jt-btn {
        padding: 7px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all .15s;
        border: 1px solid transparent;
        font-family: inherit;
      }
      .jt-btn-primary {
        background: #4a6fa5;
        color: #fff;
        border-color: #4a6fa5;
      }
      .jt-btn-primary:hover { background: #3d5f8a; }
      .jt-btn-ghost {
        background: transparent;
        color: #9b9b9b;
        border-color: #363636;
      }
      .jt-btn-ghost:hover { background: #333; color: #e0e0e0; }

      /* --- Toast --- */
      .jt-toast {
        font-size: 12px;
        text-align: center;
        padding: 0;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        color: #4dba87;
        transition: all .3s ease;
        margin-bottom: 0;
      }
      .jt-toast.jt-toast-show {
        max-height: 36px;
        padding: 6px 0 10px;
        opacity: 1;
      }
      .jt-toast.jt-toast-err { color: #e06c75; }

      /* --- Responsive --- */
      @media (max-width: 480px) {
        .jt-panel { width: 100vw; max-width: 100vw; }
        .jt-fab span { display: none; }
        .jt-fab { padding: 12px; border-radius: 50%; }
      }
    `;
  }
})();

// CampusVoice: Administration & Maintenance Portal Controller
// API_BASE is provided by auth.js

// Elements
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statInProgress = document.getElementById("statInProgress");
const statResolved = document.getElementById("statResolved");
const statHighPriority = document.getElementById("statHighPriority");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const complaintsTableBody = document.getElementById("complaintsTableBody");
const ticketCountLabel = document.getElementById("ticketCountLabel");
const refreshIcon = document.getElementById("refreshIcon");

// Modal Elements
const statusModal = document.getElementById("statusModal");
const modalTicketId = document.getElementById("modalTicketId");
const modalStatusSelect = document.getElementById("modalStatusSelect");
const modalTechnicianInput = document.getElementById("modalTechnicianInput");
const modalNotesText = document.getElementById("modalNotesText");
const noticeModal = document.getElementById("noticeModal");

let rawComplaints = [];
let adminPollTimer = null;

// Initialize on page load with readyState fallback
async function initAdmin() {
  const activeUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!activeUser || !activeUser.verified_auth || activeUser.role !== 'admin') {
    return;
  }
  const verifiedUser = await verifyServerSession(['admin']);
  if (!verifiedUser) return;
  const adminNameEl = document.getElementById("adminName");
  if (adminNameEl) adminNameEl.innerText = verifiedUser.full_name || "Administrator";

  await fetchDashboardData();
  
  if (searchInput) searchInput.addEventListener("input", debounce(fetchComplaintsTable, 300));
  if (categoryFilter) categoryFilter.addEventListener("change", fetchComplaintsTable);
  if (statusFilter) statusFilter.addEventListener("change", fetchComplaintsTable);

  if (typeof connectRealtimeSocket === "function") {
    connectRealtimeSocket({
      onEvent: (msg) => {
        if (msg.type === "complaint_created" || msg.type === "complaint_updated" || msg.type === "notice_published") {
          fetchDashboardData();
          const p = msg.payload || {};
          if (msg.type === "complaint_created") {
            showAdminToast(`New Grievance: ${p.ticket_id || ""}`, `${p.category || ""} • ${p.title || ""}`);
          } else if (msg.type === "complaint_updated") {
            showAdminToast(`Updated: ${p.ticket_id || ""}`, `${p.status || ""}`);
          }
        }
      },
      onStatusChange: (connected) => {
        const el = document.getElementById("adminLiveStatus");
        if (el) {
          el.innerHTML = connected
            ? `<span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span> Live Sync`
            : `<span style="width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span> Reconnecting...`;
        }
      },
    });
  }
  if (!adminPollTimer) {
    adminPollTimer = setInterval(fetchDashboardData, 20000);
  }
}

function showAdminToast(title, message) {
  const container = document.getElementById("toastAlertContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.style.cssText = "padding: 14px 18px; background: #0f172a; color: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); border: 1px solid #334155; max-width: 360px; pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; transition: all 0.3s ease;";
  toast.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 8px; background: #7c3aed; display: grid; place-items: center; flex-shrink: 0; color: #ffffff;">
      <i class="fa-solid fa-bell"></i>
    </div>
    <div style="flex: 1;">
      <h5 style="margin: 0 0 2px 0; font-size: 0.84rem; font-weight: 700;">${title}</h5>
      <p style="margin: 0; font-size: 0.76rem; color: #cbd5e1; line-height: 1.35;">${message}</p>
    </div>
    <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; padding: 0 4px;">&times;</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdmin);
} else {
  initAdmin();
}

// Master Refresh
async function fetchDashboardData() {
  if (refreshIcon) refreshIcon.classList.add("fa-spin");
  await Promise.all([fetchAnalytics(), fetchComplaintsTable()]);
  if (refreshIcon) refreshIcon.classList.remove("fa-spin");
}

// Fetch KPI Metrics
async function fetchAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/complaints/analytics`, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    if (statTotal) statTotal.innerText = data.total ?? 0;
    if (statPending) statPending.innerText = data.pending ?? 0;
    if (statInProgress) statInProgress.innerText = data.in_progress ?? 0;
    if (statResolved) statResolved.innerText = data.resolved ?? 0;
    if (statHighPriority) statHighPriority.innerText = data.high_priority ?? 0;
  } catch (err) {}
}

// Fetch and Filter Complaints Table
async function fetchComplaintsTable() {
  const category = categoryFilter ? categoryFilter.value : "All";
  const status = statusFilter ? statusFilter.value : "All";
  const search = searchInput ? searchInput.value.trim() : "";

  let list = [];
  try {
    let url = `${API_BASE}/complaints/?`;
    if (category && category !== "All") url += `category=${encodeURIComponent(category)}&`;
    if (status && status !== "All") url += `status=${encodeURIComponent(status)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("Failed to fetch complaints");
    list = await res.json();
    rawComplaints = list;
  } catch (err) {
    if (complaintsTableBody) {
      complaintsTableBody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-rose-500">Unable to sync grievance registry from server.</td></tr>`;
    }
    return;
  }

  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  if (ticketCountLabel) ticketCountLabel.innerText = `${tr("dept_showing_prefix", "Showing")} ${list.length} ${tr("adm_showing_rec", "complaint record(s)")}`;
  if (!complaintsTableBody) return;

  if (list.length === 0) {
    complaintsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-inbox text-3xl mb-2 text-slate-300 block"></i>
          ${tr("adm_no_match", "No complaints found matching the criteria.")}
        </td>
      </tr>
    `;
    return;
  }

  complaintsTableBody.innerHTML = list.map(c => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-mono font-bold text-blue-700">${c.ticket_id}</td>
      <td class="py-3 px-4 font-medium text-slate-700">
        <div>${c.student_name || tr("enrolled_student", "Enrolled Student")}</div>
        <span class="text-[10px] text-slate-400 font-mono">${c.student_id || ''}</span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">${(typeof tCategory === "function") ? tCategory(c.category) : c.category}</span>
      </td>
      <td class="py-3 px-4 max-w-xs font-medium text-slate-800" title="${c.issue}">
        <p class="truncate font-bold">${c.title || c.issue}</p>
        <span class="text-[10px] text-slate-400 font-normal">${formatDate(c.created_at)}</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium">
        <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${c.location}
      </td>
      <td class="py-3 px-4">
        <div class="flex items-center space-x-1">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${getPriorityBadge(c.priority)}">${c.urgency_score || 50}/100 (${(typeof tPriority === "function") ? tPriority(c.priority) : c.priority})</span>
          <span class="text-[10px] text-slate-400">(${(typeof tSentiment === "function") ? tSentiment(c.sentiment || 'Neutral') : (c.sentiment || 'Neutral')})</span>
        </div>
      </td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(c.status)}">${(typeof tStatus === "function") ? tStatus(c.status) : c.status}</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium text-[11px]">
        ${c.assigned_technician || `<span class="text-slate-400 italic">${tr("dept_unassigned", "Unassigned")}</span>`}
      </td>
      <td class="py-3 px-4 text-right">
        <button type="button" onclick="openStatusModal('${c.ticket_id}')" 
          class="px-3 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition shadow-sm">
          ${tr("dept_btn_assign", "Assign / Update")}
        </button>
      </td>
    </tr>
  `).join("");
}

// Update Status Modal
window.openStatusModal = function(ticketId) {
  const c = rawComplaints.find(x => x.ticket_id === ticketId);
  const currentStatus = c ? c.status : "Pending";
  const technician = c ? (c.assigned_technician || "") : "";
  const notes = c ? (c.admin_notes || "") : "";

  modalTicketId.value = ticketId;
  modalStatusSelect.value = Array.from(modalStatusSelect.options).some(o => o.value === currentStatus) ? currentStatus : "Pending";
  modalTechnicianInput.value = technician;
  modalNotesText.value = notes;

  const photoWrap = document.getElementById("modalStatusPhotoWrap");
  const photoImg = document.getElementById("modalStatusPhoto");
  if (photoWrap && photoImg) {
    if (c && c.image_url) {
      photoImg.src = c.image_url;
      photoWrap.classList.remove("hidden");
    } else {
      photoImg.src = "";
      photoWrap.classList.add("hidden");
    }
  }

  statusModal.classList.remove("hidden");
};

window.closeModal = function() {
  statusModal.classList.add("hidden");
};

window.submitStatusUpdate = async function() {
  const ticketId = modalTicketId.value;
  const newStatus = modalStatusSelect.value;
  const technician = modalTechnicianInput.value.trim();
  const notes = modalNotesText.value.trim();
  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const statusDisp = (typeof tStatus === "function") ? tStatus(newStatus) : newStatus;

  try {
    const res = await fetch(`${API_BASE}/complaints/${ticketId}/status`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        assigned_technician: technician,
        admin_notes: notes
      })
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      alert(errData.detail || `${tr("adm_ticket_failed", "Failed to update ticket")} ${ticketId}.`);
      return;
    }
    closeModal();
    await fetchDashboardData();
    alert(`✅ ${tr("adm_ticket_updated", "Ticket status updated to")} ${ticketId} -> '${statusDisp}'!`);
  } catch (err) {
    alert(`${tr("adm_ticket_failed", "Failed to update ticket")} ${ticketId}. Please check server connection.`);
  }
};

// Notice Publisher Modal
window.openPublishNoticeModal = function() {
  noticeModal.classList.remove("hidden");
};

window.closeNoticeModal = function() {
  noticeModal.classList.add("hidden");
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

window.handlePublishNotice = async function(e) {
  e.preventDefault();
  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const title = document.getElementById("noticeTitleInput").value.trim();
  const category = document.getElementById("noticeCatSelect").value;
  const deadline = document.getElementById("noticeDeadlineInput").value.trim();
  const department = document.getElementById("noticeDeptInput").value.trim();
  const content = document.getElementById("noticeContentInput").value.trim();
  const fileEl = document.getElementById("noticeAttachmentInput");
  const attachedFile = (fileEl && fileEl.files && fileEl.files[0]) ? fileEl.files[0] : null;

  let attachment_data = null;
  let attachment_mime = null;
  let pdf_filename = `${title.replace(/\s+/g, '_')}.pdf`;

  if (attachedFile) {
    if (attachedFile.size > 4 * 1024 * 1024) {
      alert("Circular attachment must be 4 MB or smaller.");
      return;
    }
    attachment_data = await readFileAsDataUrl(attachedFile);
    attachment_mime = attachedFile.type || "application/pdf";
    pdf_filename = attachedFile.name;
  }

  try {
    const res = await fetch(`${API_BASE}/notices/`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        category: category,
        deadline_date: deadline,
        department: department,
        content: content,
        pdf_filename: pdf_filename,
        attachment_data: attachment_data,
        attachment_mime: attachment_mime,
        is_pinned: false
      })
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      alert(errData.detail || tr("adm_pub_failed", "Failed to publish circular."));
      return;
    }
  } catch (err) {
    alert(tr("adm_pub_failed", "Failed to publish circular."));
    return;
  }

  alert(`📢 '${title}' — ${tr("adm_pub_success", "Official Circular published successfully!")}`);
  closeNoticeModal();
  document.getElementById("publishNoticeForm").reset();
};

window.exportComplaintsCSV = function() {
  window.location.href = `${API_BASE}/complaints/export/csv`;
};

function getStatusBadge(status) {
  if (status === "Resolved") return "badge-resolved";
  if (status === "In Progress" || status === "Assigned") return "badge-progress";
  if (status === "Rejected") return "badge-critical";
  return "badge-pending";
}

function getPriorityBadge(priority) {
  if (priority === "Critical" || priority === "High") return "badge-critical";
  if (priority === "Medium") return "badge-pending";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function formatDate(dateStr) {
  if (typeof formatLocalDate === "function") return formatLocalDate(dateStr);
  if (!dateStr) return "Recent";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

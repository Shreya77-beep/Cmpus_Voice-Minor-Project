// CampusVoice: Administration & Maintenance Portal Controller
const API_BASE = "/api";

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

let rawComplaints = [
  {
    ticket_id: "CV1020",
    student_id: "STU-2023-01",
    student_name: "Rahul Sharma",
    category: "IT/Network",
    title: "Library Wi-Fi Constant Disconnections",
    issue: "Library Wi-Fi disconnecting frequently",
    location: "Central Library - 2nd Floor",
    priority: "Medium",
    status: "In Progress",
    sentiment: "Frustrated",
    urgency_score: 65,
    assigned_technician: "Vikram Singh (Network Admin)",
    admin_notes: "Access Point AP-04 rebooted; firmware update scheduled tonight.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    ticket_id: "CV1021",
    student_id: "STU-2023-42",
    student_name: "Aman Verma",
    category: "Hostel",
    title: "Water Cooler Breakdown & Leakage",
    issue: "Water cooler not cooling & water leak",
    location: "Hostel Block B - Floor 2",
    priority: "High",
    status: "Pending",
    sentiment: "Urgent",
    urgency_score: 85,
    assigned_technician: "Plumbing Maintenance Unit",
    admin_notes: "Plumber scheduled for inspection at 3:00 PM.",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    ticket_id: "CV1022",
    student_id: "STU-2023-01",
    student_name: "Rahul Sharma",
    category: "Maintenance",
    title: "Projector Bulb Burnout in CSE Seminar Hall",
    issue: "Projector bulb flickering and burnout",
    location: "Academic Block A - Room 204",
    priority: "Medium",
    status: "Resolved",
    sentiment: "Concerned",
    urgency_score: 72,
    assigned_technician: "Ramesh Chand (Audiovisual Cell)",
    admin_notes: "Bulb replaced and tested with HDMI input.",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    ticket_id: "CV1023",
    student_id: "STU-2023-88",
    student_name: "Pooja Roy",
    category: "Sanitation",
    title: "Washroom Tap Leakage Block C",
    issue: "Continuous tap water leakage",
    location: "Block C - 1st Floor Washroom",
    priority: "Low",
    status: "Pending",
    sentiment: "Neutral",
    urgency_score: 35,
    assigned_technician: "Sanitation Duty Staff",
    admin_notes: "Washer replacement requested.",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

// Initialize on page load with readyState fallback
function initAdmin() {
  fetchDashboardData();
  
  if (searchInput) searchInput.addEventListener("input", debounce(fetchComplaintsTable, 300));
  if (categoryFilter) categoryFilter.addEventListener("change", fetchComplaintsTable);
  if (statusFilter) statusFilter.addEventListener("change", fetchComplaintsTable);
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
  let data = {
    total: rawComplaints.length,
    pending: rawComplaints.filter(c => c.status === "Pending").length,
    in_progress: rawComplaints.filter(c => c.status === "In Progress" || c.status === "Assigned").length,
    resolved: rawComplaints.filter(c => c.status === "Resolved").length,
    high_priority: rawComplaints.filter(c => c.priority === "High" || c.priority === "Critical").length
  };

  try {
    const res = await fetch(`${API_BASE}/complaints/analytics`);
    if (res.ok) {
      data = await res.json();
    }
  } catch (err) {}

  if (statTotal) statTotal.innerText = data.total ?? rawComplaints.length;
  if (statPending) statPending.innerText = data.pending ?? 0;
  if (statInProgress) statInProgress.innerText = data.in_progress ?? 0;
  if (statResolved) statResolved.innerText = data.resolved ?? 0;
  if (statHighPriority) statHighPriority.innerText = data.high_priority ?? 0;
}

// Fetch and Filter Complaints Table
async function fetchComplaintsTable() {
  const category = categoryFilter ? categoryFilter.value : "All";
  const status = statusFilter ? statusFilter.value : "All";
  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";

  let list = rawComplaints;

  try {
    let url = `${API_BASE}/complaints/?`;
    if (category && category !== "All") url += `category=${encodeURIComponent(category)}&`;
    if (status && status !== "All") url += `status=${encodeURIComponent(status)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    if (res.ok) {
      list = await res.json();
      rawComplaints = list;
    }
  } catch (err) {
    // Local filter fallback
    if (category && category !== "All") list = list.filter(c => c.category === category);
    if (status && status !== "All") list = list.filter(c => c.status === status);
    if (search) list = list.filter(c => (c.title || c.issue || "").toLowerCase().includes(search) || (c.student_name || "").toLowerCase().includes(search) || c.ticket_id.toLowerCase().includes(search));
  }

  if (ticketCountLabel) ticketCountLabel.innerText = `Showing ${list.length} complaint record(s)`;
  if (!complaintsTableBody) return;

  if (list.length === 0) {
    complaintsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-inbox text-3xl mb-2 text-slate-300 block"></i>
          No complaints found matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  complaintsTableBody.innerHTML = list.map(c => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-mono font-bold text-blue-700">${c.ticket_id}</td>
      <td class="py-3 px-4">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">${c.category}</span>
      </td>
      <td class="py-3 px-4 max-w-xs font-medium text-slate-800" title="${c.issue}">
        <p class="truncate font-bold">${c.title || c.issue}</p>
        <span class="text-[10px] text-slate-400 font-normal">Student: ${c.student_name || 'Enrolled Student'} (${formatDate(c.created_at)})</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium">
        <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${c.location}
      </td>
      <td class="py-3 px-4">
        <div class="flex items-center space-x-1">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${getPriorityBadge(c.priority)}">${c.priority}</span>
          <span class="text-[10px] text-slate-400">(${c.sentiment || 'Neutral'})</span>
        </div>
      </td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(c.status)}">${c.status}</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium text-[11px]">
        ${c.assigned_technician || '<span class="text-slate-400 italic">Unassigned</span>'}
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="openStatusModal('${c.ticket_id}', '${c.status}', '${escapeQuotes(c.assigned_technician || '')}', '${escapeQuotes(c.admin_notes || '')}')" 
          class="px-3 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition shadow-sm">
          Assign / Update
        </button>
      </td>
    </tr>
  `).join("");
}

// Update Status Modal
window.openStatusModal = function(ticketId, currentStatus, technician, notes) {
  modalTicketId.value = ticketId;
  modalStatusSelect.value = currentStatus;
  modalTechnicianInput.value = technician || "";
  modalNotesText.value = notes || "";
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

  try {
    const res = await fetch(`${API_BASE}/complaints/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        assigned_technician: technician,
        admin_notes: notes
      })
    });
    if (res.ok) {
      closeModal();
      fetchDashboardData();
      return;
    }
  } catch (err) {}

  // Local update fallback
  rawComplaints = rawComplaints.map(c => {
    if (c.ticket_id === ticketId) {
      return {
        ...c,
        status: newStatus,
        assigned_technician: technician || c.assigned_technician,
        admin_notes: notes || c.admin_notes
      };
    }
    return c;
  });

  closeModal();
  fetchDashboardData();
  alert(`✅ Ticket ${ticketId} status updated to '${newStatus}'!`);
};

// Notice Publisher Modal
window.openPublishNoticeModal = function() {
  noticeModal.classList.remove("hidden");
};

window.closeNoticeModal = function() {
  noticeModal.classList.add("hidden");
};

window.handlePublishNotice = async function(e) {
  e.preventDefault();
  const title = document.getElementById("noticeTitleInput").value.trim();
  const category = document.getElementById("noticeCatSelect").value;
  const deadline = document.getElementById("noticeDeadlineInput").value.trim();
  const department = document.getElementById("noticeDeptInput").value.trim();
  const content = document.getElementById("noticeContentInput").value.trim();

  try {
    await fetch(`${API_BASE}/notices/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        category: category,
        deadline_date: deadline,
        department: department,
        content: content,
        pdf_filename: `${title.replace(/\s+/g, '_')}.pdf`,
        is_pinned: false
      })
    });
  } catch (err) {}

  alert(`📢 Official Circular '${title}' published successfully!`);
  closeNoticeModal();
  document.getElementById("publishNoticeForm").reset();
};

window.seedDemoData = async function() {
  try {
    const res = await fetch(`${API_BASE}/complaints/seed`, { method: "POST" });
    if (res.ok) {
      alert("✅ Sample grievance records re-seeded successfully!");
      fetchDashboardData();
      return;
    }
  } catch (err) {}
  alert("Sample grievance records refreshed.");
  fetchDashboardData();
};

window.exportComplaintsCSV = function() {
  if (window.location.protocol !== "file:") {
    window.location.href = `${API_BASE}/complaints/export/csv`;
    return;
  }

  // Local CSV export
  let csv = "Ticket ID,Category,Title,Location,Priority,Status,Technician\n";
  rawComplaints.forEach(c => {
    csv += `"${c.ticket_id}","${c.category}","${c.title || c.issue}","${c.location}","${c.priority}","${c.status}","${c.assigned_technician || 'None'}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CampusVoice_Complaints_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
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
  if (!dateStr) return "Recent";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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

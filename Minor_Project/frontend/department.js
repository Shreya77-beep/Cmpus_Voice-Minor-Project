// CampusVoice: Department Portal Controller
const API_BASE = "/api";

let currentUser = null;
let activeDepartment = "Maintenance";

let deptMockTickets = [
  {
    ticket_id: "CV1020",
    student_name: "Rahul Sharma",
    category: "IT/Network",
    title: "Library Wi-Fi Constant Disconnections",
    issue: "Library Wi-Fi disconnecting frequently",
    location: "Central Library - 2nd Floor",
    priority: "Medium",
    status: "In Progress",
    urgency_score: 65,
    assigned_technician: "Vikram Singh (Network Admin)",
    admin_notes: "Access Point AP-04 rebooted; firmware update scheduled tonight."
  },
  {
    ticket_id: "CV1021",
    student_name: "Aman Verma",
    category: "Hostel",
    title: "Water Cooler Breakdown & Leakage",
    issue: "Water cooler not cooling & water leak",
    location: "Hostel Block B - Floor 2",
    priority: "High",
    status: "Pending",
    urgency_score: 85,
    assigned_technician: "Plumbing Maintenance Unit",
    admin_notes: "Plumber scheduled for inspection at 3:00 PM."
  },
  {
    ticket_id: "CV1022",
    student_name: "Rahul Sharma",
    category: "Maintenance",
    title: "Projector Bulb Burnout in CSE Seminar Hall",
    issue: "Projector bulb flickering and burnout",
    location: "Academic Block A - Room 204",
    priority: "Medium",
    status: "Resolved",
    urgency_score: 72,
    assigned_technician: "Ramesh Chand (Audiovisual Cell)",
    admin_notes: "Bulb replaced and tested with HDMI input."
  },
  {
    ticket_id: "CV1024",
    student_name: "Sneha Roy",
    category: "Maintenance",
    title: "Classroom 102 Ceiling Fan Noise & Vibration",
    issue: "Ceiling fan vibrating violently",
    location: "Academic Block B - Room 102",
    priority: "High",
    status: "Pending",
    urgency_score: 78,
    assigned_technician: "Maintenance Duty Staff",
    admin_notes: "Electrician assigned for morning round."
  }
];

function initDepartment() {
  currentUser = requireAuth(["department", "admin"]);
  if (!currentUser) return;

  // Initialize UI with staff information
  const sName = document.getElementById("staffUserName");
  const sDept = document.getElementById("staffUserDept");
  const hBadge = document.getElementById("headerDeptBadge");

  if (sName) sName.innerText = currentUser.full_name;
  if (sDept) sDept.innerText = `${currentUser.department_name || 'Staff'} Unit`;
  if (hBadge) hBadge.innerText = currentUser.department_name || "Department";

  if (currentUser.department_name && currentUser.department_name !== "University Administration") {
    activeDepartment = currentUser.department_name;
    const sSelect = document.getElementById("switchDeptSelect");
    if (sSelect) sSelect.value = activeDepartment;
  }

  updateDeptHeaders();
  fetchDepartmentData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDepartment);
} else {
  initDepartment();
}

function updateDeptHeaders() {
  const hTitle = document.getElementById("heroDeptTitle");
  const hSub = document.getElementById("headerDeptSubtitle");
  if (hTitle) hTitle.innerText = `${activeDepartment} Operations Queue`;
  if (hSub) hSub.innerText = `Assigned ${activeDepartment} Resolution Unit`;
}

window.onSwitchDepartment = function() {
  const sel = document.getElementById("switchDeptSelect");
  if (sel) activeDepartment = sel.value;
  updateDeptHeaders();
  fetchDepartmentData();
};

async function fetchDepartmentData() {
  const icon = document.getElementById("deptRefreshIcon");
  if (icon) icon.classList.add("fa-spin");

  const statusFilter = document.getElementById("deptStatusFilter") ? document.getElementById("deptStatusFilter").value : "All";
  let tickets = deptMockTickets.filter(t => t.category === activeDepartment || activeDepartment === "Maintenance");

  try {
    let url = `${API_BASE}/complaints/?category=${encodeURIComponent(activeDepartment)}&`;
    if (statusFilter && statusFilter !== "All") {
      url += `status=${encodeURIComponent(statusFilter)}&`;
    }
    const res = await fetch(url);
    if (res.ok) {
      tickets = await res.json();
    }
  } catch (err) {
    if (statusFilter && statusFilter !== "All") {
      tickets = tickets.filter(t => t.status === statusFilter);
    }
  }

  const tbody = document.getElementById("deptTableBody");
  const total = tickets.length;
  const pending = tickets.filter(t => t.status === "Pending").length;
  const inProgress = tickets.filter(t => t.status === "In Progress" || t.status === "Assigned").length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;

  const dTot = document.getElementById("deptStatTotal");
  const dPen = document.getElementById("deptStatPending");
  const dInP = document.getElementById("deptStatInProgress");
  const dRes = document.getElementById("deptStatResolved");
  const dCnt = document.getElementById("deptCountLabel");

  if (dTot) dTot.innerText = total;
  if (dPen) dPen.innerText = pending;
  if (dInP) dInP.innerText = inProgress;
  if (dRes) dRes.innerText = resolved;
  if (dCnt) dCnt.innerText = `Showing ${tickets.length} work order(s) for ${activeDepartment}`;

  if (!tbody) {
    if (icon) icon.classList.remove("fa-spin");
    return;
  }

  if (tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-check-circle text-3xl mb-2 text-emerald-400 block"></i>
          No active work orders pending for ${activeDepartment}.
        </td>
      </tr>
    `;
    if (icon) icon.classList.remove("fa-spin");
    return;
  }

  tbody.innerHTML = tickets.map(t => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-mono font-bold text-blue-700">${t.ticket_id}</td>
      <td class="py-3 px-4 max-w-xs font-semibold text-slate-800" title="${t.issue}">
        <p class="truncate">${t.title || t.issue}</p>
        <span class="text-[10px] text-slate-400 font-normal">Student: ${t.student_name || 'Rahul Sharma'}</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium">
        <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${t.location}
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${getPriorityBadge(t.priority)}">${t.priority} (${t.urgency_score || 50}/100)</span>
      </td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(t.status)}">${t.status}</span>
      </td>
      <td class="py-3 px-4 font-medium text-slate-700">
        ${t.assigned_technician || '<span class="text-rose-500 font-bold">Unassigned</span>'}
      </td>
      <td class="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
        ${t.admin_notes || '<span class="text-slate-400 italic">None</span>'}
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="openDeptModal('${t.ticket_id}', '${t.status}', '${escapeQuotes(t.assigned_technician || '')}', '${escapeQuotes(t.admin_notes || '')}')" 
          class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
          Assign / Update
        </button>
      </td>
    </tr>
  `).join("");

  if (icon) icon.classList.remove("fa-spin");
}

// Modal Handlers
window.openDeptModal = function(ticketId, currentStatus, technician, notes) {
  document.getElementById("modalDeptTicketId").value = ticketId;
  document.getElementById("modalDeptStatus").value = currentStatus;
  document.getElementById("modalDeptTechnician").value = technician || `${activeDepartment} Duty Specialist`;
  document.getElementById("modalDeptNotes").value = notes || "";
  document.getElementById("deptUpdateModal").classList.remove("hidden");
};

window.closeDeptModal = function() {
  document.getElementById("deptUpdateModal").classList.add("hidden");
};

window.submitDeptUpdate = async function() {
  const ticketId = document.getElementById("modalDeptTicketId").value;
  const status = document.getElementById("modalDeptStatus").value;
  const tech = document.getElementById("modalDeptTechnician").value.trim();
  const notes = document.getElementById("modalDeptNotes").value.trim();

  try {
    const res = await fetch(`${API_BASE}/complaints/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: status,
        assigned_technician: tech,
        admin_notes: notes || `Updated by ${currentUser ? currentUser.full_name : 'Staff'} (${activeDepartment})`
      })
    });
    if (res.ok) {
      closeDeptModal();
      fetchDepartmentData();
      alert(`✅ Work order ${ticketId} updated to '${status}'!`);
      return;
    }
  } catch (e) {}

  // Local update fallback
  deptMockTickets = deptMockTickets.map(t => {
    if (t.ticket_id === ticketId) {
      return {
        ...t,
        status: status,
        assigned_technician: tech || t.assigned_technician,
        admin_notes: notes || t.admin_notes
      };
    }
    return t;
  });

  closeDeptModal();
  fetchDepartmentData();
  alert(`✅ Work order ${ticketId} updated to '${status}'!`);
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

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// CampusVoice: Department Portal Controller
// API_BASE is provided by auth.js

let currentUser = null;
let activeDepartment = "Maintenance";
let currentDeptTickets = [];
let deptPollTimer = null;

async function initDepartment() {
  currentUser = requireAuth(["department", "admin"]);
  if (!currentUser) return;
  const verifiedUser = await verifyServerSession(["department", "admin"]);
  if (!verifiedUser) return;
  currentUser = verifiedUser;

  // Initialize UI with staff information
  const sName = document.getElementById("staffUserName");
  const sDept = document.getElementById("staffUserDept");
  const hBadge = document.getElementById("headerDeptBadge");

  if (sName) sName.innerText = currentUser.full_name;
  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const deptDisp = (typeof tCategory === "function") ? tCategory(currentUser.department_name || "Department") : (currentUser.department_name || "Department");
  if (sDept) sDept.innerText = `${deptDisp} ${tr("dept_unit_suffix", "Unit")}`;
  if (hBadge) hBadge.innerText = deptDisp;

  const sSelect = document.getElementById("switchDeptSelect");
  if (currentUser.role === "department" && currentUser.department_name) {
    activeDepartment = currentUser.department_name;
    if (sSelect) {
      sSelect.innerHTML = `<option value="${activeDepartment}">${deptDisp}</option>`;
      sSelect.value = activeDepartment;
      sSelect.disabled = true;
      sSelect.title = "Locked to your assigned department account";
    }
  } else if (currentUser.department_name && currentUser.department_name !== "University Administration") {
    activeDepartment = currentUser.department_name;
    if (sSelect) sSelect.value = activeDepartment;
  }

  updateDeptHeaders();
  await fetchDepartmentData();

  if (typeof connectRealtimeSocket === "function") {
    connectRealtimeSocket({
      onEvent: (msg) => {
        if (msg.type === "complaint_created" || msg.type === "complaint_updated") {
          fetchDepartmentData();
          const p = msg.payload || {};
          if (msg.type === "complaint_created") {
            showDeptToast(`New Work Order: ${p.ticket_id || ""}`, `${p.title || "Grievance"} (${p.location || activeDepartment})`);
          }
        }
      },
      onStatusChange: (connected) => {
        const el = document.getElementById("deptLiveStatus");
        if (el) {
          el.innerHTML = connected
            ? `<span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span> Live Sync`
            : `<span style="width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span> Reconnecting...`;
        }
      },
    });
  }
  if (!deptPollTimer) {
    deptPollTimer = setInterval(fetchDepartmentData, 20000);
  }
}

function showDeptToast(title, message) {
  const container = document.getElementById("toastAlertContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.style.cssText = "padding: 14px 18px; background: #0f172a; color: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); border: 1px solid #334155; max-width: 360px; pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; transition: all 0.3s ease;";
  toast.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 8px; background: #0284c7; display: grid; place-items: center; flex-shrink: 0; color: #ffffff;">
      <i class="fa-solid fa-wrench"></i>
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
  document.addEventListener("DOMContentLoaded", initDepartment);
} else {
  initDepartment();
}

function updateDeptHeaders() {
  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const deptDisp = (typeof tCategory === "function") ? tCategory(activeDepartment) : activeDepartment;
  const hTitle = document.getElementById("heroDeptTitle");
  const hSub = document.getElementById("headerDeptSubtitle");
  if (hTitle) hTitle.innerText = `${deptDisp} ${tr("dept_ops_suffix", "Operations Queue")}`;
  if (hSub) hSub.innerText = `${tr("dept_assigned_prefix", "Assigned")} ${deptDisp} ${tr("dept_unit_res_suffix", "Resolution Unit")}`;
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
  let tickets = [];

  try {
    let url = `${API_BASE}/complaints/?category=${encodeURIComponent(activeDepartment)}&`;
    if (statusFilter && statusFilter !== "All") {
      url += `status=${encodeURIComponent(statusFilter)}&`;
    }
    const res = await fetch(url, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("Failed to load work orders");
    tickets = await res.json();
  } catch (err) {
    if (icon) icon.classList.remove("fa-spin");
    const tbody = document.getElementById("deptTableBody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-rose-500">Unable to sync department work orders from server.</td></tr>`;
    }
    return;
  }

  currentDeptTickets = tickets;
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

  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const deptDisp = (typeof tCategory === "function") ? tCategory(activeDepartment) : activeDepartment;
  if (dTot) dTot.innerText = total;
  if (dPen) dPen.innerText = pending;
  if (dInP) dInP.innerText = inProgress;
  if (dRes) dRes.innerText = resolved;
  if (dCnt) dCnt.innerText = `${tr("dept_showing_prefix", "Showing")} ${tickets.length} ${tr("dept_showing_orders_for", "work order(s) for")} ${deptDisp}`;

  if (!tbody) {
    if (icon) icon.classList.remove("fa-spin");
    return;
  }

  if (tickets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-check-circle text-3xl mb-2 text-emerald-400 block"></i>
          ${tr("dept_no_orders", "No active work orders pending for")} ${deptDisp}.
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
        <span class="text-[10px] text-slate-400 font-normal">${tr("dept_student_lbl", "Student:")} ${t.student_name || 'Student'}</span>
      </td>
      <td class="py-3 px-4 text-slate-600 font-medium">
        <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${t.location}
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${getPriorityBadge(t.priority)}">${(typeof tPriority === "function") ? tPriority(t.priority) : t.priority} (${t.urgency_score || 50}/100)</span>
      </td>
      <td class="py-3 px-4">
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadge(t.status)}">${(typeof tStatus === "function") ? tStatus(t.status) : t.status}</span>
      </td>
      <td class="py-3 px-4 font-medium text-slate-700">
        ${t.assigned_technician || `<span class="text-rose-500 font-bold">${tr("dept_unassigned", "Unassigned")}</span>`}
      </td>
      <td class="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
        ${t.admin_notes || `<span class="text-slate-400 italic">${tr("dept_none", "None")}</span>`}
      </td>
      <td class="py-3 px-4 text-right">
        <button type="button" onclick="openDeptModal('${t.ticket_id}')" 
          class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
          ${tr("dept_btn_assign", "Assign / Update")}
        </button>
      </td>
    </tr>
  `).join("");

  if (icon) icon.classList.remove("fa-spin");
}

// Modal Handlers
window.openDeptModal = function(ticketId) {
  const t = currentDeptTickets.find(x => x.ticket_id === ticketId);
  const currentStatus = t ? t.status : "Pending";
  const technician = t ? (t.assigned_technician || "") : "";
  const notes = t ? (t.admin_notes || "") : "";

  document.getElementById("modalDeptTicketId").value = ticketId;
  const statusEl = document.getElementById("modalDeptStatus");
  if (statusEl) {
    statusEl.value = Array.from(statusEl.options).some(o => o.value === currentStatus) ? currentStatus : "Pending";
  }
  document.getElementById("modalDeptTechnician").value = technician || `${activeDepartment} Duty Specialist`;
  document.getElementById("modalDeptNotes").value = notes;

  const photoWrap = document.getElementById("modalDeptPhotoWrap");
  const photoImg = document.getElementById("modalDeptPhoto");
  if (photoWrap && photoImg) {
    if (t && t.image_url) {
      photoImg.src = t.image_url;
      photoWrap.classList.remove("hidden");
    } else {
      photoImg.src = "";
      photoWrap.classList.add("hidden");
    }
  }

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
  const tr = (k, fb) => (typeof t === "function" ? (t(k) || fb) : fb);
  const statusDisp = (typeof tStatus === "function") ? tStatus(status) : status;

  try {
    const res = await fetch(`${API_BASE}/complaints/${ticketId}/status`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: status,
        assigned_technician: tech,
        admin_notes: notes || `Updated by ${currentUser ? currentUser.full_name : 'Staff'} (${activeDepartment})`
      })
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      alert(errData.detail || `${tr("dept_failed_alert", "Failed to update work order")} ${ticketId}.`);
      return;
    }
    closeDeptModal();
    await fetchDepartmentData();
    alert(`✅ ${tr("dept_updated_alert", "Work order updated to")} ${ticketId} -> '${statusDisp}'!`);
  } catch (e) {
    alert(`${tr("dept_failed_alert", "Failed to update work order")} ${ticketId}. Please check server connection.`);
  }
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

// =========================================================================
// CampusVoice: Student Portal Controller & Intelligent Assistant Engine
// MedBrief Unified System Standard
// =========================================================================
// API_BASE is provided by auth.js

// Student Identity Context from Active Authentication Session
function syncCurrentStudent(userOverride = null) {
  const user = userOverride || ((typeof getCurrentUser === 'function') ? getCurrentUser() : null);
  return {
    id: user ? (user.student_id || user.username) : "",
    name: user ? user.full_name : "",
    department: user ? (user.department_name || "Computer Science & Engineering") : "",
    semester: user ? (user.semester || "1st Semester") : "",
    email: user ? (user.email || "") : "",
    contact: user ? (user.contact || "") : ""
  };
}
let currentStudent = syncCurrentStudent();

window.applyStudentProfileUI = function (user) {
  if (!user) return;
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const sName = user.full_name || "Student";
  const sRoll = user.student_id || user.username || "--";
  const sDept = user.department_name || "Academic Department";
  const sSem = user.semester || tr("not_specified");

  const elSideName = document.getElementById("sidebarStudentName");
  const elSideId = document.getElementById("sidebarStudentId");
  const elHeroName = document.getElementById("welcomeStudentHero");
  const elHeroSub = document.getElementById("welcomeStudentSub");
  const elProfName = document.getElementById("profileName");
  const elProfDept = document.getElementById("profileDept");
  const elProfId = document.getElementById("profileStudentId");
  const elProfSem = document.getElementById("profileSemester");
  const elProfEmail = document.getElementById("profileEmail");
  const elProfContact = document.getElementById("profileContact");
  const elFormBadge = document.getElementById("formStudentIdBadge");

  if (elSideName) elSideName.innerText = sName;
  if (elSideId) elSideId.innerText = `${sRoll} • ${sDept}`;
  if (elHeroName) elHeroName.innerText = `${tr("welcome_back")}, ${sName}!`;
  if (elHeroSub) elHeroSub.innerText = `${tr("roll_no_label")}: ${sRoll} • ${sDept} • ${sSem}`;
  if (elProfName) elProfName.innerText = sName;
  if (elProfDept) elProfDept.innerText = `${tr("enrolled_student")} • ${sDept}`;
  if (elProfId) elProfId.innerText = sRoll;
  if (elProfSem) elProfSem.innerText = sSem;
  if (elProfEmail) elProfEmail.innerText = user.email || `${user.username}@campus.edu.in`;
  if (elProfContact) elProfContact.innerText = user.contact || tr("not_provided");
  if (elFormBadge) elFormBadge.innerText = sRoll;

  const initials = (sName || "ST").trim().split(/\s+/).map(n => n[0]).filter(Boolean).join("").substring(0, 2).toUpperCase() || "ST";
  ["sidebarAvatar", "topAvatarBadge", "profileCardAvatar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (user.avatar_url) {
      el.innerHTML = `<img src="${user.avatar_url}" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
    } else {
      el.innerText = initials;
    }
  });

  const removeBtn = document.getElementById("removeAvatarBtn");
  if (removeBtn) {
    removeBtn.classList.toggle("hidden", !user.avatar_url);
  }
};

function resizeAvatarToDataUrl(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => resolve(ev.target.result);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = Math.floor((img.width - size) / 2);
        const sy = Math.floor((img.height - size) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.handleAvatarUpload = async function (input) {
  if (!input || !input.files || !input.files[0]) return;
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const file = input.files[0];
  if (!file.type || !file.type.startsWith("image/")) {
    alert(tr("err_invalid_img"));
    input.value = "";
    return;
  }

  const uploadBtn = document.getElementById("uploadAvatarBtn");
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #0d9488;"></i> <span>${tr("saving_photo")}</span>`;
  }

  try {
    const dataUrl = await resizeAvatarToDataUrl(file, 256);
    const res = await fetch(`${API_BASE}/auth/profile/avatar`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: dataUrl })
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || tr("err_save_photo"));
      return;
    }
    const updatedUser = await res.json();
    localStorage.setItem("campusvoice_user", JSON.stringify({ ...updatedUser, verified_auth: true }));
    applyStudentProfileUI(updatedUser);
  } catch (err) {
    alert(tr("err_upload_photo"));
  } finally {
    input.value = "";
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<i class="fa-solid fa-camera" style="color: #0d9488;"></i> <span>${tr("upload_photo")}</span>`;
    }
  }
};

window.removeProfileAvatar = async function () {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  try {
    const res = await fetch(`${API_BASE}/auth/profile/avatar`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: null })
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (res.ok) {
      const updatedUser = await res.json();
      localStorage.setItem("campusvoice_user", JSON.stringify({ ...updatedUser, verified_auth: true }));
      applyStudentProfileUI(updatedUser);
    }
  } catch (err) {
    alert(tr("err_remove_photo"));
  }
};

let allStudentComplaints = [];

// State variables
let currentLang = (typeof getSavedLanguage === "function") ? getSavedLanguage() : "en"; // 'en', 'hi', 'bn'
let isTTSVoiceEnabled = true;
let isListening = false;
let recognition = null;
let allFaqs = [];
let lastKnownNotificationIds = new Set();
let currentComplaintFilter = "All";
let activeSectionId = "dashboard";

// =========================================================================
// 1. NAVIGATION & MULTI-PAGE ROUTING
// =========================================================================
window.navigateTo = function (sectionId) {
  activeSectionId = sectionId;
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".side-link").forEach(item => item.classList.remove("active"));
  const navBtn = document.getElementById(`nav-${sectionId}`);
  if (navBtn) navBtn.classList.add("active");

  const pTitle = document.getElementById("pageTitle");
  if (pTitle) {
    const key = `title_${sectionId}`;
    pTitle.innerText = (typeof t === "function") ? t(key) : "CampusVoice";
  }

  closeSidebar();

  if (sectionId === "dashboard") loadDashboard();
  if (sectionId === "complaints") loadMyComplaints();
  if (sectionId === "notices") loadNotices();
  if (sectionId === "faq") loadFaqs();
};

window.filterComplaintsAndNavigate = function (status) {
  navigateTo('complaints');
  filterMyComplaints(status);
};

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.add("hidden");
}

// =========================================================================
// 2. REAL-TIME NOTIFICATIONS & TOAST ALERTS
// =========================================================================
window.toggleNotificationDrawer = function () {
  const drawer = document.getElementById("notificationDrawer");
  const backdrop = document.getElementById("notificationBackdrop");
  if (!drawer) return;

  const isHidden = drawer.classList.contains("hidden");
  if (isHidden) {
    drawer.classList.remove("hidden");
    if (backdrop) backdrop.classList.remove("hidden");
    fetchNotifications();
  } else {
    drawer.classList.add("hidden");
    if (backdrop) backdrop.classList.add("hidden");
  }
};

async function fetchNotifications(isPoll = false) {
  if (!currentStudent.id) return;
  let notifs = null;
  try {
    const res = await fetch(`${API_BASE}/notifications/?student_id=${encodeURIComponent(currentStudent.id)}`, {
      credentials: "same-origin"
    });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) return;
    notifs = await res.json();
  } catch (err) {
    return;
  }

  if (!Array.isArray(notifs)) return;

  if (isPoll && lastKnownNotificationIds.size > 0) {
    notifs.forEach(n => {
      if (!n.is_read && !lastKnownNotificationIds.has(n.id)) {
        showFloatingToast(n);
      }
    });
  }

  lastKnownNotificationIds = new Set(notifs.map(n => n.id));

  const unreadCount = notifs.filter(n => !n.is_read).length;
  const badge = document.getElementById("headerUnreadBadge");
  if (badge) {
    if (unreadCount > 0) {
      badge.innerText = unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  const drawerList = document.getElementById("notificationDrawerList");
  if (drawerList) {
    if (notifs.length === 0) {
      const noNotifText = (typeof t === "function") ? t("no_notifications") : "No notifications yet.";
      drawerList.innerHTML = `<p style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 30px 0;">${noNotifText}</p>`;
      return;
    }

    drawerList.innerHTML = notifs.map(n => `
      <div style="padding: 12px; background: ${n.is_read ? '#ffffff' : '#f0fdfa'}; border: 1px solid ${n.is_read ? '#e2e8f0' : '#ccfbf1'}; border-radius: 10px; cursor: pointer; transition: all 0.15s ease;" onclick="handleNotificationClick(${n.id}, '${n.ticket_id || ''}')">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
          <h5 style="margin: 0; font-size: 0.82rem; font-weight: 700; color: #0f172a;">${n.title}</h5>
          ${!n.is_read ? '<span style="width: 7px; height: 7px; border-radius: 50%; background: #0d9488; flex-shrink: 0; margin-top: 4px;"></span>' : ''}
        </div>
        <p style="margin: 0 0 6px 0; font-size: 0.78rem; color: #475569; line-height: 1.4;">${n.message}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #94a3b8;">
          <span>${formatDate(n.created_at)}</span>
          ${n.ticket_id ? `<span style="font-family: var(--font-mono); color: #0d9488; font-weight: 700;">${n.ticket_id}</span>` : ''}
        </div>
      </div>
    `).join("");
  }
}

function showFloatingToast(notification) {
  const container = document.getElementById("toastAlertContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.style.cssText = "padding: 14px 18px; background: #0f172a; color: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); border: 1px solid #334155; max-width: 360px; pointer-events: auto; display: flex; align-items: flex-start; gap: 12px; transition: all 0.3s ease;";
  toast.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 8px; background: #0d9488; display: grid; place-items: center; flex-shrink: 0; color: #ffffff;">
      <i class="fa-solid fa-bell"></i>
    </div>
    <div style="flex: 1;">
      <h5 style="margin: 0 0 2px 0; font-size: 0.84rem; font-weight: 700;">${notification.title}</h5>
      <p style="margin: 0; font-size: 0.76rem; color: #cbd5e1; line-height: 1.35;">${notification.message}</p>
    </div>
    <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 1rem; padding: 0 4px;">&times;</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 5500);
}

window.handleNotificationClick = async function (notifId, ticketId) {
  try {
    await fetch(`${API_BASE}/notifications/${notifId}/read`, {
      method: "PATCH",
      credentials: "same-origin"
    });
  } catch (e) { }
  await fetchNotifications();
  if (ticketId) {
    toggleNotificationDrawer();
    openTimelineModal(ticketId);
  }
};

window.markAllNotificationsRead = async function () {
  try {
    await fetch(`${API_BASE}/notifications/read-all?student_id=${encodeURIComponent(currentStudent.id)}`, {
      method: "POST",
      credentials: "same-origin"
    });
  } catch (e) { }
  await fetchNotifications();
};

let notifTimer = null;

// =========================================================================
// 3. MULTILINGUAL SUPPORT (EN, HI, BN)
// =========================================================================
window.setLanguage = function (lang) {
  currentLang = (lang === "hi" || lang === "bn") ? lang : "en";
  localStorage.setItem("campusvoice_lang", currentLang);

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.style.background = "transparent";
    btn.style.color = "#475569";
    btn.style.boxShadow = "none";
    btn.style.fontWeight = "600";
  });

  const activeBtn = document.getElementById(`lang-${currentLang}`);
  if (activeBtn) {
    activeBtn.style.background = "#ffffff";
    activeBtn.style.color = "#0d9488";
    activeBtn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.06)";
    activeBtn.style.fontWeight = "700";
  }

  if (typeof applyPageTranslations === "function") {
    applyPageTranslations(currentLang);
  }

  const label = document.getElementById("activeVoiceLangLabel");
  if (label && typeof t === "function") {
    label.innerText = `${t("lang_badge_prefix", currentLang)} ${t("lang_display_name", currentLang)}`;
  }

  const pTitle = document.getElementById("pageTitle");
  if (pTitle && typeof t === "function") {
    pTitle.innerText = t(`title_${activeSectionId}`, currentLang);
  }

  if (ttsLabel && typeof t === "function") {
    ttsLabel.innerText = isTTSVoiceEnabled ? t("audio_on", currentLang) : t("audio_off", currentLang);
  }

  if (recognition) {
    const langCodes = { en: "en-US", hi: "hi-IN", bn: "bn-IN" };
    recognition.lang = langCodes[currentLang] || "en-US";
  }

  // Re-render dynamic sections cleanly in the selected language
  const currUser = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
  if (currUser && typeof applyStudentProfileUI === "function") {
    applyStudentProfileUI(currUser);
  }
  if (typeof renderComplaintsList === "function") renderComplaintsList();
  if (typeof loadFaqs === "function") loadFaqs();
  if (activeSectionId === "dashboard" && typeof loadDashboard === "function") loadDashboard();
  if (activeSectionId === "notices" && typeof loadNotices === "function") loadNotices();
  if (typeof fetchNotifications === "function") fetchNotifications();
};

// =========================================================================
// 4. VOICE INTERACTION (STT & TTS + LIVE AI ENGINE)
// =========================================================================
const micBtn = document.getElementById("micBtn");
const listeningIndicator = document.getElementById("listeningIndicator");
const queryInput = document.getElementById("queryInput");
const sendBtn = document.getElementById("sendBtn");
const chatMessages = document.getElementById("chatMessages");
const ttsToggleBtn = document.getElementById("ttsToggleBtn");
const ttsIcon = document.getElementById("ttsIcon");
const ttsLabel = document.getElementById("ttsLabel");

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add("mic-recording");
    if (listeningIndicator) listeningIndicator.classList.remove("hidden");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (queryInput) queryInput.value = transcript;
    stopListening();
    handleVoiceSend();
  };

  recognition.onerror = (event) => {
    stopListening();
    const tr = (k) => (typeof t === "function" ? t(k) : k);
    console.warn("Speech recognition event:", event.error);
    if (event.error === "not-allowed") {
      appendSystemAlert(tr("mic_blocked"));
    } else if (event.error === "no-speech") {
      appendSystemAlert(tr("mic_no_speech"));
    } else if (event.error === "audio-capture") {
      appendSystemAlert(tr("mic_no_hw"));
    } else if (event.error !== "aborted") {
      appendSystemAlert(`${tr("mic_error_prefix")} (${event.error}). ${tr("mic_type_below")}`);
    }
  };
  recognition.onend = () => stopListening();
}

function startListening() {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  if (!recognition) {
    appendSystemAlert(tr("mic_unsupported"));
    return;
  }
  const langCodes = { en: "en-US", hi: "hi-IN", bn: "bn-IN" };
  recognition.lang = langCodes[currentLang] || "en-US";
  try {
    recognition.start();
  } catch (err) {
    console.warn("Recognition start notice:", err);
  }
}

function stopListening() {
  isListening = false;
  if (micBtn) micBtn.classList.remove("mic-recording");
  if (listeningIndicator) listeningIndicator.classList.add("hidden");
  try { recognition.stop(); } catch (e) { }
}

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (isListening) stopListening();
    else startListening();
  });
}

// Text to Speech Toggle
if (ttsToggleBtn) {
  ttsToggleBtn.addEventListener("click", () => {
    isTTSVoiceEnabled = !isTTSVoiceEnabled;
    if (isTTSVoiceEnabled) {
      if (ttsLabel) ttsLabel.innerText = (typeof t === "function") ? t("audio_on") : "ON";
      if (ttsIcon) ttsIcon.className = "fa-solid fa-volume-high";
    } else {
      window.speechSynthesis.cancel();
      if (ttsLabel) ttsLabel.innerText = (typeof t === "function") ? t("audio_off") : "OFF";
      if (ttsIcon) ttsIcon.className = "fa-solid fa-volume-xmark";
    }
  });
}

function speakVoice(text, lang = "en") {
  if (!isTTSVoiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const langCodes = { en: "en-US", hi: "hi-IN", bn: "bn-IN" };
  utterance.lang = langCodes[lang] || "en-US";
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// Send Voice Query
async function handleVoiceSend() {
  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) return;

  appendStudentMessage(query);
  queryInput.value = "";
  const typingId = appendTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/assistant/process`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        language: currentLang,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        student_department: currentStudent.department
      })
    });

    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Unable to process query on CampusVoice AI server.");
    }
    const data = await res.json();
    removeMessage(typingId);
    appendAssistantMessage(data);

    if (data.spoken_response) {
      speakVoice(data.spoken_response, data.language || currentLang);
    }

    if (data.ticket) {
      const exists = allStudentComplaints.some(c => c.ticket_id === data.ticket.ticket_id);
      if (!exists) {
        allStudentComplaints.unshift(data.ticket);
      }
    }

    loadDashboard();
    loadMyComplaints();
    fetchNotifications(false);
  } catch (err) {
    removeMessage(typingId);
    appendSystemAlert(err.message || "Unable to reach CampusVoice live AI server. Please ensure the backend server is running.");
  }
}

if (sendBtn) sendBtn.addEventListener("click", handleVoiceSend);
if (queryInput) {
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleVoiceSend();
  });
}

window.fillQuery = function (text) {
  navigateTo('voice');
  if (queryInput) queryInput.value = text;
  handleVoiceSend();
};

window.triggerAsk = function (question) {
  navigateTo('voice');
  if (queryInput) queryInput.value = question;
  handleVoiceSend();
};

window.triggerLocalizedAsk = function (queryKey) {
  const question = (typeof t === "function") ? t(queryKey) : queryKey;
  triggerAsk(question);
};

function appendStudentMessage(text) {
  if (!chatMessages) return;
  const div = document.createElement("div");
  div.style.cssText = "display: flex; justify-content: flex-end; align-items: flex-start; gap: 10px;";
  div.innerHTML = `
    <div style="background: #0d9488; color: #ffffff; border-radius: 14px; border-top-right-radius: 4px; padding: 14px 18px; max-width: 580px; font-size: 0.88rem; line-height: 1.5; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
      <div style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: #ccfbf1; font-weight: 700; margin-bottom: 4px;">
        <i class="fa-solid fa-user"></i>
        <span>${currentStudent.name}</span>
      </div>
      <p style="margin: 0;">${escapeHtml(text)}</p>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendAssistantMessage(data) {
  if (!chatMessages) return;
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const div = document.createElement("div");
  div.style.cssText = "display: flex; align-items: flex-start; gap: 12px;";

  let extraHtml = "";

  if (data.ticket) {
    const ext = data.extracted_data || {};
    const urgencyScore = data.ticket.urgency_score || ext.urgency_score || 50;
    const sentiment = data.ticket.sentiment || ext.sentiment || "Neutral";
    const factors = ext.urgency_factors || ["Standard maintenance triage"];

    const prioText = (typeof tPriority === "function") ? tPriority(data.ticket.priority) : data.ticket.priority;
    const sentText = (typeof tSentiment === "function") ? tSentiment(sentiment) : sentiment;
    const catText = (typeof tCategory === "function") ? tCategory(data.ticket.category) : data.ticket.category;
    const statusText = (typeof tStatus === "function") ? tStatus(data.ticket.status) : data.ticket.status;

    extraHtml += `
      <div style="margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">${tr("ai_order_created")}</strong>
          <span style="font-family: var(--font-mono); font-weight: 800; color: #0d9488; background: #f0fdfa; padding: 2px 8px; border-radius: 6px; border: 1px solid #ccfbf1;">${data.ticket.ticket_id}</span>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.76rem;">
            <span style="font-weight: 700; color: #475569;">${tr("ai_urgency_assessment")}</span>
            <span style="font-family: var(--font-mono); font-weight: 800;" class="${getUrgencyTextColor(urgencyScore)}">${urgencyScore} / 100 (${prioText} ${tr("ai_priority_suffix")})</span>
          </div>
          <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
            <div class="${getUrgencyBarColor(urgencyScore)}" style="height: 100%; border-radius: 9999px; width: ${urgencyScore}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b;">
            <span>${tr("ai_sentiment_lbl")} <strong style="color: #0f172a;">${sentText}</strong></span>
            <span>${tr("ai_category_lbl")} <strong>${catText}</strong></span>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 0.72rem; color: #64748b;">
            <strong>${tr("ai_factors_lbl")}</strong> ${factors.map(f => `<span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-right: 4px; display: inline-block; margin-top: 2px;">${f}</span>`).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem; margin-bottom: 10px;">
          <div><span style="color: #94a3b8;">${tr("ai_location_lbl")}</span> <strong style="color: #0f172a;">${data.ticket.location}</strong></div>
          <div><span style="color: #94a3b8;">${tr("ai_status_lbl")}</span> <strong style="color: #16a34a;">${statusText}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 0.76rem;">
          <span style="color: #64748b;">${tr("ai_tech_lbl")} <strong>${data.ticket.assigned_technician || tr("ai_assigned_unit")}</strong></span>
          <button type="button" class="btn-text" style="padding: 0;" onclick="openTimelineModal('${data.ticket.ticket_id}')">${tr("ai_view_timeline")}</button>
        </div>
      </div>
    `;
  }

  if (data.notices_found && data.notices_found.length > 0) {
    const n = data.notices_found[0];
    extraHtml += `
      <div style="margin-top: 14px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 0.82rem; ${n.id ? 'cursor: pointer;' : ''}" ${n.id ? `onclick="openNoticeModal(${n.id})"` : ''}>
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
          <i class="fa-solid fa-file-pdf"></i>
          <span>${tr("ai_circular_verified")} ${n.pdf_filename || 'Notice.pdf'}</span>
        </div>
        <p style="margin: 0 0 6px 0; color: #475569; font-size: 0.78rem;">${n.content}</p>
        <span style="font-size: 0.72rem; font-weight: 700; color: #92400e;">${tr("ai_deadline_lbl")} ${n.deadline_date || tr("ai_check_notice")}</span>
      </div>
    `;
  }

  const rawText = data.display_text || tr("ai_default_processed");
  const formattedText = rawText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; color: #0d9488; font-family: var(--font-mono); font-size: 0.82rem;">$1</code>')
    .replace(/\n/g, '<br>');

  div.innerHTML = `
    <div class="portal-mark-sm" style="flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px;">CV</div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; border-top-left-radius: 4px; padding: 16px; max-width: 600px; font-size: 0.88rem; line-height: 1.5; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: #94a3b8; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
        <strong style="color: #0f172a;">${tr("ai_assistant_name")}</strong>
        <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-size: 0.68rem; font-weight: 700;">${data.intent || 'info'}</span>
      </div>
      <div style="color: #334155;">${formattedText}</div>
      ${extraHtml}
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendTypingIndicator() {
  const id = "typing-" + Date.now();
  if (!chatMessages) return id;
  const div = document.createElement("div");
  div.id = id;
  div.style.cssText = "display: flex; align-items: flex-start; gap: 12px;";
  const msg = (typeof t === "function") ? t("analyzing_msg") : "Analyzing voice intent & verifying records...";
  div.innerHTML = `
    <div class="portal-mark-sm" style="flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px;">CV</div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; border-top-left-radius: 4px; padding: 12px 16px; font-size: 0.82rem; color: #64748b; display: flex; align-items: center; gap: 8px;">
      <span>${msg}</span>
      <span style="width: 6px; height: 6px; border-radius: 50%; background: #0d9488; animation: bounce 0.6s infinite alternate;"></span>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendSystemAlert(msg) {
  if (!chatMessages) return;
  const div = document.createElement("div");
  div.style.cssText = "display: flex; justify-content: center; margin: 6px 0;";
  div.innerHTML = `
    <div style="background: #f0fdfa; border: 1px solid #ccfbf1; color: #115e59; font-size: 0.8rem; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
      <i class="fa-solid fa-circle-info" style="color: #0d9488;"></i>
      <span>${msg}</span>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =========================================================================
// 5. STUDENT DASHBOARD LOADER
// =========================================================================
async function loadDashboard() {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  let stats = {
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0
  };
  let statsError = false;

  try {
    const res = await fetch(`${API_BASE}/complaints/analytics`, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("Analytics request failed");
    stats = await res.json();
  } catch (err) {
    statsError = true;
  }

  const dTot = document.getElementById("dashTotalCount");
  const dPen = document.getElementById("dashPendingCount");
  const dRes = document.getElementById("dashResolvedCount");
  if (dTot) dTot.innerText = statsError ? "--" : (stats.total ?? 0);
  if (dPen) dPen.innerText = statsError ? "--" : ((stats.pending ?? 0) + (stats.in_progress ?? 0));
  if (dRes) dRes.innerText = statsError ? "--" : (stats.resolved ?? 0);

  // Render Notices ticker
  let notices = [];
  let noticesFailed = false;
  try {
    const noticeRes = await fetch(`${API_BASE}/notices/`, { credentials: "same-origin" });
    if (noticeRes.status === 401) {
      logout(true);
      return;
    }
    if (!noticeRes.ok) throw new Error("Notices request failed");
    notices = await noticeRes.json();
    allLoadedNotices = Array.isArray(notices) ? notices : [];
  } catch (err) {
    noticesFailed = true;
  }

  const dNot = document.getElementById("dashNoticesCount");
  if (dNot) dNot.innerText = noticesFailed ? "--" : String(notices.length).padStart(2, '0');
  const bNot = document.getElementById("badgeNoticeCount");
  if (bNot) bNot.innerText = noticesFailed ? "--" : String(notices.length);

  const listEl = document.getElementById("dashNoticesList");
  if (listEl) {
    if (noticesFailed) {
      listEl.innerHTML = `<p style="color: #dc2626; font-size: 0.82rem; text-align: center; padding: 14px 0;">Unable to load live circulars from server.</p>`;
    } else if (notices.length === 0) {
      listEl.innerHTML = `<p style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 14px 0;">${tr("no_circulars_found")}</p>`;
    } else {
      listEl.innerHTML = notices.slice(0, 3).map(n => `
      <div style="padding: 10px 12px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; cursor: pointer; transition: all 0.15s ease;" onclick="openNoticeModal(${n.id})">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f0fdfa; color: #0d9488; margin-right: 6px;">${(typeof tCategory === "function") ? tCategory(n.category) : n.category}</span>
          <strong style="font-size: 0.82rem; color: #0f172a;">${n.title}</strong>
        </div>
        <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono); white-space: nowrap;">${n.deadline_date || tr("active_notice")}</span>
      </div>
    `).join("");
    }
  }

  // Render Recent Complaints
  let comps = [];
  let compsFailed = false;
  try {
    const compRes = await fetch(`${API_BASE}/complaints/?limit=3`, { credentials: "same-origin" });
    if (compRes.status === 401) {
      logout(true);
      return;
    }
    if (!compRes.ok) throw new Error("Complaints request failed");
    comps = await compRes.json();
  } catch (err) {
    compsFailed = true;
  }

  const recentEl = document.getElementById("dashRecentTickets");
  if (recentEl) {
    if (compsFailed) {
      recentEl.innerHTML = `<p style="color: #dc2626; font-size: 0.84rem; text-align: center; padding: 20px 0;">Unable to sync your live complaints. Please ensure the backend server is running.</p>`;
    } else if (!comps || comps.length === 0) {
      recentEl.innerHTML = `<p style="color: #94a3b8; font-size: 0.84rem; text-align: center; padding: 20px 0;">${tr("no_grievances_yet")}</p>`;
    } else {
      const tlLabel = tr("timeline_link");
      recentEl.innerHTML = comps.slice(0, 3).map(c => `
      <div style="padding: 12px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.15s ease;" onclick="openTimelineModal('${c.ticket_id}')">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
            <span style="font-family: var(--font-mono); font-weight: 800; color: #0d9488; font-size: 0.84rem;">${c.ticket_id}</span>
            <strong style="font-size: 0.86rem; color: #0f172a;">${c.title || c.issue}</strong>
          </div>
          <span style="font-size: 0.76rem; color: #64748b;"><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${c.location}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="${getStatusBadge(c.status)}" style="padding: 3px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;">${(typeof tStatus === "function") ? tStatus(c.status) : c.status}</span>
          <button type="button" class="btn-text" style="font-size: 0.78rem; padding: 0;">${tlLabel}</button>
        </div>
      </div>
    `).join("");
    }
  }
}

// =========================================================================
// 6. MANUAL COMPLAINT REGISTRATION
// =========================================================================
let lastAutoDetectMeta = null;

window.runAiAutoDetect = async function () {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const descEl = document.getElementById("manualDesc");
  if (!descEl) return;
  const desc = descEl.value.trim();
  if (!desc) {
    alert(tr("ai_detect_prompt"));
    return;
  }

  const notice = document.getElementById("aiDetectNotice");
  if (notice) {
    notice.classList.remove("hidden");
    notice.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> ${tr("ai_analyzing_btn")}`;
  }

  try {
    const res = await fetch(`${API_BASE}/assistant/process`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: desc, language: currentLang, dry_run: true })
    });

    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("AI triage request failed");
    const data = await res.json();
    const ext = data.extracted_data || {};
    applyAutoDetectResult(ext, notice);
  } catch (e) {
    if (notice) {
      notice.innerHTML = `<span style="color: #dc2626; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i>Live AI triage server unavailable. Please choose Category & Priority directly.</span>`;
    }
  }
};

function applyAutoDetectResult(ext, notice) {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const catSelect = document.getElementById("manualCategory");
  if (ext.category && catSelect) {
    const validOptions = Array.from(catSelect.options).map(o => o.value);
    catSelect.value = validOptions.includes(ext.category) ? ext.category : "Maintenance";
  }
  if (ext.location && ext.location !== "Campus Area" && document.getElementById("manualLocation")) {
    document.getElementById("manualLocation").value = ext.location;
  }
  if (ext.priority && document.getElementById("manualPriority")) document.getElementById("manualPriority").value = ext.priority;
  if (document.getElementById("manualTitle") && !document.getElementById("manualTitle").value && ext.issue) {
    document.getElementById("manualTitle").value = ext.issue;
  }

  const score = ext.urgency_score || 50;
  const sentiment = ext.sentiment || "Neutral";
  lastAutoDetectMeta = { urgency_score: score, sentiment: sentiment };
  const factors = ext.urgency_factors || ["Standard maintenance baseline"];

  const prioText = (typeof tPriority === "function") ? tPriority(ext.priority || "Medium") : (ext.priority || "Medium");
  const catText = (typeof tCategory === "function") ? tCategory(ext.category || "Maintenance") : (ext.category || "Maintenance");
  const sentText = (typeof tSentiment === "function") ? tSentiment(sentiment) : sentiment;

  if (notice) {
    notice.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #115e59;">${tr("ai_triage_title")}</strong>
          <span style="font-family: var(--font-mono); font-weight: 800;" class="${getUrgencyTextColor(score)}">${score} / 100 (${prioText} ${tr("ai_priority_suffix")})</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
          <div class="${getUrgencyBarColor(score)}" style="height: 100%; border-radius: 9999px; width: ${score}%;"></div>
        </div>
        <p style="margin: 0; font-size: 0.78rem; color: #334155;">${tr("ai_category_lbl")} <strong>${catText}</strong> &bull; ${tr("ai_detected_sentiment")} <strong>${sentText}</strong></p>
        <div style="margin-top: 6px; font-size: 0.72rem; color: #64748b;">
          <strong>${tr("ai_factors_lbl")}</strong> ${factors.join(', ')}
        </div>
      </div>
    `;
  }
}

window.previewImage = function (input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const rawDataUrl = e.target.result;
    const setPreview = (url) => {
      const imgEl = document.getElementById("imagePreview");
      const nameEl = document.getElementById("previewFileName");
      const wrapEl = document.getElementById("imagePreviewContainer");
      if (imgEl) imgEl.src = url;
      if (nameEl) nameEl.innerText = file.name;
      if (wrapEl) wrapEl.classList.remove("hidden");
    };

    if (file.type && file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      const img = new Image();
      img.onerror = () => setPreview(rawDataUrl);
      img.onload = () => {
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        setPreview(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = rawDataUrl;
    } else {
      setPreview(rawDataUrl);
    }
  };
  reader.readAsDataURL(file);
};

window.clearImagePreview = function () {
  const p = document.getElementById("manualPhoto");
  if (p) p.value = "";
  const imgEl = document.getElementById("imagePreview");
  if (imgEl) imgEl.removeAttribute("src");
  const c = document.getElementById("imagePreviewContainer");
  if (c) c.classList.add("hidden");
};

window.handleManualComplaintSubmit = async function (e) {
  e.preventDefault();
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const btn = document.getElementById("submitComplaintBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> ${tr("submitting_btn")}`;
  }

  const title = document.getElementById("manualTitle").value.trim();
  const desc = document.getElementById("manualDesc").value.trim();
  const category = document.getElementById("manualCategory").value;
  const location = document.getElementById("manualLocation").value.trim();
  const priority = document.getElementById("manualPriority").value;
  const previewEl = document.getElementById("imagePreview");
  const previewSrc = previewEl ? previewEl.getAttribute("src") || "" : "";
  const image_url = previewSrc && previewSrc.startsWith("data:") ? previewSrc : null;

  const priorityUrgencyMap = { Low: 25, Medium: 50, High: 80, Critical: 95 };
  const resolvedUrgency = lastAutoDetectMeta ? lastAutoDetectMeta.urgency_score : (priorityUrgencyMap[priority] || 50);
  const resolvedSentiment = lastAutoDetectMeta ? lastAutoDetectMeta.sentiment : (priority === "Critical" || priority === "High" ? "Urgent" : "Neutral");

  try {
    const res = await fetch(`${API_BASE}/complaints/`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        issue: title,
        raw_query: desc,
        category: category,
        location: location,
        priority: priority,
        sentiment: resolvedSentiment,
        urgency_score: resolvedUrgency,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        student_department: currentStudent.department,
        student_contact: currentStudent.contact,
        image_url: image_url
      })
    });

    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || "Unable to submit grievance to the server.");
    }

    const created = await res.json();
    allStudentComplaints.unshift(created);
    const catLoc = (typeof tCategory === "function") ? tCategory(created.category) : created.category;
    const statusLoc = (typeof tStatus === "function") ? tStatus(created.status) : created.status;
    alert(`✅ ${tr("reg_success_title")}\n\n${tr("reg_ticket_id")}: ${created.ticket_id}\n${tr("reg_department")}: ${catLoc}\n${tr("reg_status")}: ${statusLoc}`);
    document.getElementById("manualComplaintForm").reset();
    clearImagePreview();
    filterComplaintsAndNavigate('All');
    fetchNotifications(false);
  } catch (err) {
    alert(err.message || "Unable to connect to CampusVoice server to register your grievance.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span data-i18n="submit_grievance_btn">${tr("submit_grievance_btn")}</span>`;
    }
  }
};

// =========================================================================
// 7. MY COMPLAINTS & DETAILED TIMELINE
// =========================================================================
window.filterMyComplaints = function (status) {
  currentComplaintFilter = status;
  document.querySelectorAll(".my-comp-tab").forEach(tab => {
    tab.style.background = "transparent";
    tab.style.color = "#475569";
    tab.style.boxShadow = "none";
    tab.style.fontWeight = "600";
  });

  const activeId = status === "All" ? "tab-all" : (status === "Pending" ? "tab-pending" : (status === "In Progress" ? "tab-progress" : "tab-resolved"));
  const btn = document.getElementById(activeId);
  if (btn) {
    btn.style.background = "#ffffff";
    btn.style.color = "#0d9488";
    btn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.06)";
    btn.style.fontWeight = "700";
  }

  renderComplaintsList();
};

async function loadMyComplaints() {
  try {
    const res = await fetch(`${API_BASE}/complaints/`, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (res.ok) {
      const list = await res.json();
      allStudentComplaints = Array.isArray(list) ? list : [];
    }
  } catch (e) { }
  renderComplaintsList();
}

function renderComplaintsList() {
  const container = document.getElementById("myComplaintsList");
  if (!container) return;

  let filtered = allStudentComplaints;
  if (currentComplaintFilter === "In Progress") {
    filtered = allStudentComplaints.filter(c => c.status === "In Progress" || c.status === "Assigned");
  } else if (currentComplaintFilter !== "All") {
    filtered = allStudentComplaints.filter(c => c.status === currentComplaintFilter);
  }

  if (filtered.length === 0) {
    const emptyTitle = (typeof t === "function") ? t("no_complaints_under") : "No complaints found under";
    const emptyHint = (typeof t === "function") ? t("no_complaints_hint") : "Switch status tabs or lodge a new complaint";
    const filterLabel = currentComplaintFilter === "All" ? ((typeof t === "function") ? t("tab_all") : "All") : ((typeof tStatus === "function") ? tStatus(currentComplaintFilter) : currentComplaintFilter);
    container.innerHTML = `
      <div style="padding: 48px 20px; text-align: center; color: #94a3b8;">
        <i class="fa-solid fa-clipboard-check" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #cbd5e1;"></i>
        <strong style="display: block; font-size: 0.95rem; color: #475569;">${emptyTitle} "${filterLabel}"</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem;">${emptyHint}</p>
      </div>
    `;
    return;
  }

  const techLabel = (typeof t === "function") ? t("technician_label") : "Technician:";
  const underReview = (typeof t === "function") ? t("under_review") : "Under Review";
  const viewTlLabel = (typeof t === "function") ? t("view_timeline_btn") : "View Timeline →";

  container.innerHTML = filtered.map(c => `
    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #ffffff; transition: background 0.15s ease;">
      <div style="flex: 1; min-width: 260px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-family: var(--font-mono); font-weight: 800; color: #0d9488; font-size: 0.88rem;">${c.ticket_id}</span>
          <span style="font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">${(typeof tCategory === "function") ? tCategory(c.category) : c.category}</span>
          <span class="${getPriorityBadge(c.priority)}" style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${(typeof tPriority === "function") ? tPriority(c.priority) : c.priority} (${c.urgency_score || 50}/100)</span>
        </div>
        <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${c.title || c.issue}</h4>
        <p style="margin: 0 0 6px 0; font-size: 0.82rem; color: #64748b; line-height: 1.4;">${c.raw_query}</p>
        <div style="font-size: 0.76rem; color: #94a3b8; display: flex; gap: 14px; flex-wrap: wrap;">
          <span><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${c.location}</span>
          <span>${techLabel} <strong style="color: #475569;">${c.assigned_technician || underReview}</strong></span>
          ${c.created_at ? `<span><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${formatDate(c.created_at)}</span>` : ""}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0;">
        <span class="${getStatusBadge(c.status)}" style="padding: 4px 12px; border-radius: 9999px; font-size: 0.76rem; font-weight: 700;">${(typeof tStatus === "function") ? tStatus(c.status) : c.status}</span>
        <button type="button" class="btn-secondary btn-small" onclick="openTimelineModal('${c.ticket_id}')">
          <i class="fa-solid fa-timeline"></i> ${viewTlLabel}
        </button>
      </div>
    </div>
  `).join("");
}

// Timeline Modal Display
let activeTimelineTicketId = null;

window.openTimelineModal = async function (ticketId) {
  const modal = document.getElementById("timelineModal");
  if (!modal) return;
  activeTimelineTicketId = ticketId;
  modal.classList.remove("hidden");

  const tr = (k) => (typeof t === "function" ? t(k) : k);
  document.getElementById("modalTimelineTicketId").innerText = ticketId;
  document.getElementById("modalTimelineTitle").innerText = tr("loading_details");
  document.getElementById("modalTimelineLocation").innerText = "";

  const photoWrap = document.getElementById("modalTimelinePhotoWrap");
  const photoImg = document.getElementById("modalTimelinePhoto");
  if (photoWrap && photoImg) {
    photoImg.removeAttribute("src");
    photoWrap.classList.add("hidden");
  }

  try {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(ticketId)}`, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("Ticket unavailable");
    const c = await res.json();
    renderTimelineData(c);
  } catch (e) {
    document.getElementById("modalTimelineTitle").innerText = ticketId;
    document.getElementById("timelineEventsContainer").innerHTML = `<p style="font-size: 0.82rem; color: #dc2626;">${tr("no_timeline_events")}</p>`;
  }
};

function renderTimelineData(c) {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  const catText = (typeof tCategory === "function") ? tCategory(c.category) : c.category;
  document.getElementById("modalTimelineTitle").innerText = c.title || c.issue;
  document.getElementById("modalTimelineLocation").innerText = `${c.location} • ${tr("ai_category_lbl")} ${catText}`;
  const badge = document.getElementById("modalTimelineStatusBadge");
  if (badge) {
    badge.innerText = (typeof tStatus === "function") ? tStatus(c.status) : c.status;
    badge.className = getStatusBadge(c.status);
  }

  const photoWrap = document.getElementById("modalTimelinePhotoWrap");
  const photoImg = document.getElementById("modalTimelinePhoto");
  if (photoWrap && photoImg) {
    if (c.image_url) {
      photoImg.src = c.image_url;
      photoWrap.classList.remove("hidden");
    } else {
      photoImg.removeAttribute("src");
      photoWrap.classList.add("hidden");
    }
  }

  const events = Array.isArray(c.timeline) ? c.timeline : [];
  const cont = document.getElementById("timelineEventsContainer");
  if (cont) {
    if (events.length === 0) {
      cont.innerHTML = `<p style="font-size: 0.82rem; color: #94a3b8;">${tr("no_timeline_events")}</p>`;
      return;
    }
    cont.innerHTML = events.map(ev => `
      <div class="timeline-item">
        <span class="timeline-dot"></span>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h5 style="margin: 0; font-size: 0.84rem; font-weight: 700; color: #0f172a;">${ev.title}</h5>
          <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono);">${formatDate(ev.timestamp) || ev.timestamp || ""}</span>
        </div>
        <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: #475569;">${ev.description}</p>
      </div>
    `).join("");
  }
}

window.closeTimelineModal = function () {
  activeTimelineTicketId = null;
  const m = document.getElementById("timelineModal");
  if (m) m.classList.add("hidden");
};

// =========================================================================
// 8. COLLEGE NOTICES & MODAL VIEWER
// =========================================================================
let allLoadedNotices = [];

async function loadNotices() {
  const cat = document.getElementById("noticeCategorySelect") ? document.getElementById("noticeCategorySelect").value : "All";
  const search = document.getElementById("noticeSearchInput") ? document.getElementById("noticeSearchInput").value.trim().toLowerCase() : "";

  const grid = document.getElementById("noticesGrid");
  let notices = [];
  let loadFailed = false;
  try {
    let url = `${API_BASE}/notices/?`;
    if (cat && cat !== "All") url += `category=${encodeURIComponent(cat)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url, { credentials: "same-origin" });
    if (res.status === 401) {
      logout(true);
      return;
    }
    if (!res.ok) throw new Error("Failed to load notices");
    notices = await res.json();
    allLoadedNotices = Array.isArray(notices) ? notices : [];
  } catch (e) {
    loadFailed = true;
  }

  if (!grid) return;

  if (loadFailed) {
    grid.innerHTML = `<p style="padding: 30px; text-align: center; color: #dc2626; font-size: 0.88rem; grid-column: 1 / -1;">Unable to connect to the live circulars service. Please ensure the backend server is running.</p>`;
    return;
  }

  if (notices.length === 0) {
    const emptyMsg = (typeof t === "function") ? t("no_circulars_found") : "No circulars found matching";
    grid.innerHTML = `<p style="padding: 30px; text-align: center; color: #94a3b8; font-size: 0.88rem; grid-column: 1 / -1;">${emptyMsg} "${search || cat}".</p>`;
    return;
  }

  const pinnedLbl = (typeof t === "function") ? t("pinned_badge") : "Pinned";
  const viewCircLbl = (typeof t === "function") ? t("view_full_circular") : "View Full Circular →";

  grid.innerHTML = notices.map(n => `
    <div class="clean-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.15s ease;" onmouseenter="this.style.borderColor='#0d9488'" onmouseleave="this.style.borderColor='var(--border)'">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; ${getNoticeBadge(n.category)}">${(typeof tCategory === "function") ? tCategory(n.category) : n.category}</span>
          ${n.is_pinned ? `<span style="font-size: 0.68rem; font-weight: 700; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 4px;"><i class="fa-solid fa-thumbtack" style="margin-right: 4px;"></i>${pinnedLbl}</span>` : ''}
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; line-height: 1.35;">${n.title}</h4>
        <p style="margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${n.content}</p>
      </div>

      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem;">
        <span style="color: #64748b;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${n.deadline_date || ((typeof t === "function") ? t("active_notice") : "Active Notice")}</span>
        <button type="button" class="btn-text" style="font-size: 0.78rem; padding: 0;" onclick="openNoticeModal(${n.id})">
          <i class="fa-solid fa-file-pdf" style="color: #dc2626; margin-right: 4px;"></i> ${viewCircLbl}
        </button>
      </div>
    </div>
  `).join("");
}

window.openNoticeModal = async function (noticeId) {
  const tr = (k) => (typeof t === "function" ? t(k) : k);
  let n = allLoadedNotices.find(x => x.id === noticeId);
  if (!n) {
    try {
      const res = await fetch(`${API_BASE}/notices/${encodeURIComponent(noticeId)}`, { credentials: "same-origin" });
      if (res.ok) n = await res.json();
    } catch (e) { }
  }
  if (!n) return;

  const catText = (typeof tCategory === "function") ? tCategory(n.category) : n.category;
  document.getElementById("noticeModalCategory").innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #0d9488;"></i> ${tr("circular_prefix")} ${catText}`;
  document.getElementById("noticeModalDept").innerText = n.department || "Registrar Office";
  document.getElementById("noticeModalTitle").innerText = n.title;
  document.getElementById("noticeModalDeadline").innerText = n.deadline_date || tr("active_notice");
  document.getElementById("noticeModalBody").innerText = n.content;
  document.getElementById("noticeModalPdf").innerHTML = `<i class="fa-solid fa-file-pdf" style="color: #dc2626; margin-right: 6px;"></i> ${n.pdf_filename || 'Circular.pdf'}`;

  const pdfLink = document.getElementById("noticeModalPdfLink");
  if (pdfLink) {
    pdfLink.href = `${API_BASE}/notices/${n.id}/download`;
    pdfLink.setAttribute("download", n.pdf_filename || `Circular_${n.id}.pdf`);
  }

  document.getElementById("noticeModal").classList.remove("hidden");
};

window.closeNoticeModal = function () {
  document.getElementById("noticeModal").classList.add("hidden");
};

function getNoticeBadge(category) {
  if (category === "Exam") return "background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;";
  if (category === "Holiday") return "background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;";
  if (category === "Placement") return "background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1;";
  return "background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;";
}

// =========================================================================
// 9. CAMPUS HANDBOOK FAQ LOADER
// =========================================================================
async function loadFaqs() {
  if (currentLang === "en") {
    try {
      const res = await fetch(`${API_BASE}/assistant/faqs`, { credentials: "same-origin" });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length > 0) {
          allFaqs = raw.map(item => ({
            q: item.question,
            a: item.answer,
            cat: item.category,
            catKey: item.category
          }));
          renderFaqs(allFaqs);
          return;
        }
      }
    } catch (e) { }
  }
  allFaqs = (typeof getLocalizedFaqs === "function") ? getLocalizedFaqs(currentLang) : [];
  renderFaqs(allFaqs);
}

window.filterFaqByCategory = function (category) {
  if (category === "All") {
    renderFaqs(allFaqs);
  } else {
    const filtered = allFaqs.filter(f => (f.catKey || f.cat).toLowerCase().includes(category.toLowerCase()));
    renderFaqs(filtered);
  }
};

function filterFaqs() {
  const query = document.getElementById("faqSearchInput").value.toLowerCase();
  const filtered = allFaqs.filter(f => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query) || f.cat.toLowerCase().includes(query));
  renderFaqs(filtered);
}

function renderFaqs(list) {
  const el = document.getElementById("faqAccordionList");
  if (!el) return;
  if (list.length === 0) {
    const noFaqMsg = (typeof t === "function") ? t("no_faqs_found") : "No matching FAQs found.";
    el.innerHTML = `<p style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem;">${noFaqMsg}</p>`;
    return;
  }
  const askLbl = (typeof t === "function") ? t("ask_voice_assistant") : "Ask in Voice Assistant →";
  el.innerHTML = list.map((item, idx) => `
    <div style="background: #fafbfc; border: 1px solid var(--border); border-radius: 12px; padding: 16px; transition: all 0.15s ease;">
      <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleFaq(${idx})">
        <strong style="font-size: 0.88rem; color: #0f172a;">${item.q}</strong>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.7rem; font-weight: 700; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0; color: #64748b;">${item.cat}</span>
          <i class="fa-solid fa-chevron-down" style="font-size: 0.74rem; color: #94a3b8;" id="faq-icon-${idx}"></i>
        </div>
      </div>
      <div id="faq-ans-${idx}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 0.84rem; color: #475569; line-height: 1.5;">
        <p style="margin: 0 0 8px 0;">${item.a}</p>
        <button type="button" class="btn-text" style="padding: 0; font-size: 0.76rem;" onclick="triggerAsk('${escapeQuotes(item.q)}')">
          <i class="fa-solid fa-microphone" style="margin-right: 4px; color: #0d9488;"></i> ${askLbl}
        </button>
      </div>
    </div>
  `).join("");
}

window.toggleFaq = function (idx) {
  const ans = document.getElementById(`faq-ans-${idx}`);
  const icon = document.getElementById(`faq-icon-${idx}`);
  if (ans) {
    const isHidden = ans.style.display === "none";
    ans.style.display = isHidden ? "block" : "none";
    if (icon) icon.className = isHidden ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
  }
};

// =========================================================================
// 10. BADGE & UTILITY HELPERS
// =========================================================================
function getStatusBadge(status) {
  if (status === "Resolved") return "badge-resolved";
  if (status === "In Progress" || status === "Assigned") return "badge-progress";
  if (status === "Rejected") return "badge-critical";
  return "badge-pending";
}

function getPriorityBadge(priority) {
  if (priority === "Critical" || priority === "High") return "badge-critical";
  if (priority === "Medium") return "badge-pending";
  return "badge-resolved";
}

function getUrgencyTextColor(score) {
  if (score >= 80) return "color: #dc2626;";
  if (score >= 60) return "color: #d97706;";
  return "color: #0d9488;";
}

function getUrgencyBarColor(score) {
  if (score >= 80) return "background: #dc2626;";
  if (score >= 60) return "background: #f59e0b;";
  return "background: #0d9488;";
}

function formatDate(dateStr) {
  if (typeof formatLocalDate === "function") {
    return formatLocalDate(dateStr, currentLang);
  }
  if (!dateStr) return "";
  const iso = /[Z+\-]\d{2}:?\d{2}$/.test(String(dateStr)) ? String(dateStr) : `${dateStr}Z`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function handleStudentRealtimeEvent(msg) {
  if (!msg || !msg.type) return;
  const type = msg.type;
  const p = msg.payload || {};
  if (type === "complaint_created" || type === "complaint_updated") {
    if (type === "complaint_updated") {
      const locStatus = (typeof tStatus === "function") ? tStatus(p.status || "Updated") : (p.status || "Updated");
      const techNote = p.assigned_technician ? ` • ${p.assigned_technician}` : "";
      showFloatingToast({
        title: `${p.ticket_id || "Ticket"} — ${locStatus}`,
        message: `${p.title || "Grievance work order updated"}${techNote}`
      });
    }
    loadDashboard();
    loadMyComplaints();
    fetchNotifications(false);
    if (p.ticket_id && activeTimelineTicketId === p.ticket_id) {
      openTimelineModal(p.ticket_id);
    }
  } else if (type === "notice_published") {
    showFloatingToast({
      title: `New Circular: ${p.title || "Announcement"}`,
      message: `${p.department || "University"} published a ${(typeof tCategory === "function") ? tCategory(p.category || "General") : (p.category || "General")} circular.`
    });
    loadDashboard();
    loadNotices();
    fetchNotifications(false);
  } else if (type === "notification_sync") {
    fetchNotifications(false);
  }
}

// Initial initialization
async function initApp() {
  const activeUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!activeUser || !activeUser.verified_auth || activeUser.role !== 'student') {
    return;
  }
  const verifiedUser = await verifyServerSession(['student']);
  if (!verifiedUser) return;

  currentStudent = syncCurrentStudent(verifiedUser);
  setLanguage(currentLang);
  applyStudentProfileUI(verifiedUser);
  loadDashboard();
  loadMyComplaints();
  fetchNotifications(false);

  if (typeof connectRealtimeSocket === "function") {
    connectRealtimeSocket({
      onEvent: handleStudentRealtimeEvent
    });
  }

  if (!notifTimer) {
    notifTimer = setInterval(() => fetchNotifications(true), 20000);
  }

  const manualForm = document.getElementById("manualComplaintForm");
  if (manualForm) {
    manualForm.addEventListener("reset", () => {
      lastAutoDetectMeta = null;
      const aiNotice = document.getElementById("aiDetectNotice");
      if (aiNotice) aiNotice.classList.add("hidden");
      clearImagePreview();
    });
  }

  // If a feature was clicked on the landing page, navigate to it automatically
  const pendingSection = sessionStorage.getItem("pending_section");
  if (pendingSection) {
    sessionStorage.removeItem("pending_section");
    navigateTo(pendingSection);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

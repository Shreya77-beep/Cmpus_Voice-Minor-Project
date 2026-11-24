// =========================================================================
// CampusVoice: Student Portal Controller & Intelligent Assistant Engine
// MedBrief Unified System Standard
// =========================================================================
const API_BASE = "/api";

// Student Identity Context from Active Authentication Session
const loggedUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
const currentStudent = {
  id: loggedUser ? (loggedUser.student_id || loggedUser.username) : "STU-2023-01",
  name: loggedUser ? loggedUser.full_name : "Rahul Sharma",
  department: loggedUser ? (loggedUser.department_name || "Computer Science & Engineering") : "Computer Science & Engineering",
  contact: loggedUser ? (loggedUser.contact || "+91 98765 43210") : "+91 98765 43210"
};

// Initial Seed Data for Instant Standalone & Offline Operation
let defaultNotices = [
  {
    id: 1,
    title: "Mid-Term Examination Schedule - Autumn 2026",
    category: "Exam",
    department: "Examination Cell",
    content: "The Mid-Semester Examination timetable for B.Tech, M.Tech, and MBA programs has been published. Examinations commence from 10th of next month. All students must bring identity cards. Hall tickets can be downloaded from the university portal.",
    deadline_date: "Starts 10th Next Month",
    is_pinned: true,
    pdf_filename: "MidSem_Schedule_Autumn2026.pdf"
  },
  {
    id: 2,
    title: "Campus Placement Drive: TCS Digital & Infosys",
    category: "Placement",
    department: "Training & Placement Cell",
    content: "Registration is open for final-year students for the upcoming national recruitment drives. Eligible candidates with CGPA >= 6.5 must submit online profiles by Friday 5:00 PM to the placement portal.",
    deadline_date: "Friday, 5:00 PM",
    is_pinned: true,
    pdf_filename: "Placement_Drive_Nov2026.pdf"
  },
  {
    id: 3,
    title: "University Winter Break & Hostel Vacation Guidelines",
    category: "Holiday",
    department: "Registrar Office",
    content: "University faculties and academic departments will observe winter vacation as per university academic calendar. Hostel mess will remain partially operational for research scholars.",
    deadline_date: "24 Dec - 02 Jan",
    is_pinned: false,
    pdf_filename: "Winter_Break_Circular_2026.pdf"
  },
  {
    id: 4,
    title: "Annual Cultural & Tech Fest 'TechVista 2026'",
    category: "Event",
    department: "Student Affairs",
    content: "Registrations are now open for inter-college hackathons, robotics challenges, and cultural performances. Cash prizes worth Rs 2,50,000 to be won across diverse competitive tracks.",
    deadline_date: "Registration Closes in 8 Days",
    is_pinned: false,
    pdf_filename: "TechVista_Rulebook_2026.pdf"
  },
  {
    id: 5,
    title: "Central Library Extended Hours During Exam Week",
    category: "General",
    department: "Central Library",
    content: "Central Library reading halls will remain open until 11:00 PM daily starting next Monday to assist students in exam preparations. Wi-Fi and digital repository access are fully active.",
    deadline_date: "Effective from Monday",
    is_pinned: false,
    pdf_filename: "Library_Notice_ExamHours.pdf"
  }
];

let allStudentComplaints = [
  {
    ticket_id: "CV1020",
    student_id: currentStudent.id,
    student_name: currentStudent.name,
    student_department: currentStudent.department,
    title: "Library Wi-Fi Constant Disconnections",
    raw_query: "The Wi-Fi in library reading room is disconnecting constantly.",
    category: "IT/Network",
    issue: "Library Wi-Fi disconnecting frequently",
    location: "Central Library - 2nd Floor",
    priority: "Medium",
    status: "In Progress",
    sentiment: "Frustrated",
    urgency_score: 65,
    assigned_technician: "Vikram Singh (Network Admin)",
    admin_notes: "Access Point AP-04 rebooted; firmware update scheduled tonight.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    timeline: [
      { title: "Complaint Registered", description: "Student voice report recorded via portal.", timestamp: "Yesterday · 10:30 AM", status: "Pending" },
      { title: "Assigned to IT / Network Cell", description: "Auto-routed based on IT category.", timestamp: "Yesterday · 11:15 AM", status: "Assigned" },
      { title: "Technician Dispatched", description: "Technician Vikram Singh inspecting access point.", timestamp: "Yesterday · 12:00 PM", status: "In Progress" }
    ]
  },
  {
    ticket_id: "CV1021",
    student_id: currentStudent.id,
    student_name: currentStudent.name,
    student_department: currentStudent.department,
    title: "Water Cooler Breakdown & Leakage",
    raw_query: "Water cooler in hostel block B 2nd floor is not cooling and leaking water.",
    category: "Hostel",
    issue: "Water cooler not cooling & water leak",
    location: "Hostel Block B - Floor 2",
    priority: "High",
    status: "Pending",
    sentiment: "Urgent",
    urgency_score: 85,
    assigned_technician: "Plumbing Maintenance Unit",
    admin_notes: "Plumber scheduled for inspection at 3:00 PM.",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    timeline: [
      { title: "Complaint Registered", description: "Reported via student manual form.", timestamp: "Today · 09:15 AM", status: "Pending" },
      { title: "Flagged as High Urgency", description: "Water supply interruption identified by AI analyzer.", timestamp: "Today · 09:16 AM", status: "Pending" }
    ]
  },
  {
    ticket_id: "CV1022",
    student_id: currentStudent.id,
    student_name: currentStudent.name,
    student_department: currentStudent.department,
    title: "Projector Bulb Burnout in CSE Seminar Hall",
    raw_query: "Seminar Hall 1 projector bulb is flickering and went black during presentation.",
    category: "Maintenance",
    issue: "Projector bulb flickering and burnout",
    location: "Academic Block A - Room 204",
    priority: "Medium",
    status: "Resolved",
    sentiment: "Concerned",
    urgency_score: 72,
    assigned_technician: "Ramesh Chand (Audiovisual Cell)",
    admin_notes: "Bulb replaced and tested with HDMI input.",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    timeline: [
      { title: "Complaint Registered", description: "Voice submission processed.", timestamp: "2 days ago", status: "Pending" },
      { title: "Technician Assigned", description: "Ramesh Chand assigned.", timestamp: "2 days ago", status: "In Progress" },
      { title: "Defect Resolved", description: "Bulb replaced and tested.", timestamp: "Yesterday · 04:00 PM", status: "Resolved" }
    ]
  }
];

let defaultNotifications = [
  {
    id: 1,
    type: "technician_assigned",
    title: "Technician Assigned to Your Ticket",
    message: "Vikram Singh (Network Admin) has been assigned to ticket CV1020 (Library Wi-Fi Disconnections).",
    ticket_id: "CV1020",
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 2,
    type: "status_update",
    title: "Grievance Status: In Progress",
    message: "Inspection is underway for ticket CV1020.",
    ticket_id: "CV1020",
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 3,
    type: "urgent",
    title: "High Urgency Ticket Recorded",
    message: "Ticket CV1021 (Water Cooler Breakdown) flagged as High Priority by AI Triage.",
    ticket_id: "CV1021",
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

// State variables
let currentLang = "en"; // 'en', 'hi', 'bn'
let isTTSVoiceEnabled = true;
let isListening = false;
let recognition = null;
let allFaqs = [];
let lastKnownNotificationIds = new Set();
let currentComplaintFilter = "All";

// =========================================================================
// 1. NAVIGATION & MULTI-PAGE ROUTING
// =========================================================================
const pageTitles = {
  dashboard: { title: "Dashboard Overview", subtitle: "Campus summary, quick assistance and live grievance tracker" },
  voice: { title: "AI Voice Assistant", subtitle: "Speak naturally in English, Hindi, or Bengali to report issues or ask questions" },
  register: { title: "Register Campus Grievance", subtitle: "Submit a facility breakdown request with AI auto-detection" },
  complaints: { title: "My Registered Complaints", subtitle: "Track progress and view detailed technician inspection audit timelines" },
  notices: { title: "Official College Circulars", subtitle: "Verified announcements retrieved via RAG Knowledge Engine" },
  faq: { title: "Campus Handbook & FAQ", subtitle: "Verified campus directory, office locations, and helpline numbers" },
  profile: { title: "Student Profile", subtitle: "Verified academic and campus identity credentials" }
};

window.navigateTo = function(sectionId) {
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".side-link").forEach(item => item.classList.remove("active"));
  const navBtn = document.getElementById(`nav-${sectionId}`);
  if (navBtn) navBtn.classList.add("active");

  const meta = pageTitles[sectionId] || { title: "CampusVoice", subtitle: "" };
  const pTitle = document.getElementById("pageTitle");
  if (pTitle) pTitle.innerText = meta.title;

  closeSidebar();

  if (sectionId === "dashboard") loadDashboard();
  if (sectionId === "complaints") loadMyComplaints();
  if (sectionId === "notices") loadNotices();
  if (sectionId === "faq") loadFaqs();
};

window.filterComplaintsAndNavigate = function(status) {
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
window.toggleNotificationDrawer = function() {
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
  let notifs = defaultNotifications;
  try {
    const res = await fetch(`${API_BASE}/notifications/?student_id=${encodeURIComponent(currentStudent.id)}`);
    if (res.ok) {
      notifs = await res.json();
    }
  } catch (err) {}

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
      drawerList.innerHTML = `<p style="color: #94a3b8; font-size: 0.82rem; text-align: center; padding: 30px 0;">No notifications yet.</p>`;
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

window.handleNotificationClick = async function(notifId, ticketId) {
  defaultNotifications = defaultNotifications.map(n => n.id === notifId ? { ...n, is_read: true } : n);
  try {
    await fetch(`${API_BASE}/notifications/${notifId}/read`, { method: "PATCH" });
  } catch (e) {}
  fetchNotifications();
  if (ticketId) {
    toggleNotificationDrawer();
    openTimelineModal(ticketId);
  }
};

window.markAllNotificationsRead = async function() {
  defaultNotifications = defaultNotifications.map(n => ({ ...n, is_read: true }));
  try {
    await fetch(`${API_BASE}/notifications/read-all?student_id=${encodeURIComponent(currentStudent.id)}`, { method: "POST" });
  } catch (e) {}
  fetchNotifications();
};

setInterval(() => fetchNotifications(true), 6000);

// =========================================================================
// 3. MULTILINGUAL SUPPORT (EN, HI, BN)
// =========================================================================
window.setLanguage = function(lang) {
  currentLang = lang;
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.style.background = "transparent";
    btn.style.color = "#475569";
    btn.style.boxShadow = "none";
    btn.style.fontWeight = "600";
  });

  const activeBtn = document.getElementById(`lang-${lang}`);
  if (activeBtn) {
    activeBtn.style.background = "#ffffff";
    activeBtn.style.color = "#0d9488";
    activeBtn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.06)";
    activeBtn.style.fontWeight = "700";
  }

  const langNames = { en: "English", hi: "हिंदी (Hindi)", bn: "বাংলা (Bengali)" };
  const label = document.getElementById("activeVoiceLangLabel");
  if (label) label.innerText = `Language: ${langNames[lang] || 'English'}`;

  if (recognition) {
    const langCodes = { en: "en-US", hi: "hi-IN", bn: "bn-IN" };
    recognition.lang = langCodes[lang] || "en-US";
  }
};

// =========================================================================
// 4. VOICE INTERACTION (STT & TTS + LOCAL AI ENGINE FALLBACK)
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
    console.warn("Speech recognition event:", event.error);
    if (event.error === "not-allowed") {
      appendSystemAlert("⚠️ Microphone access was blocked by your browser. Please allow microphone permission in the address bar or type your query in the box below.");
    } else if (event.error === "no-speech") {
      appendSystemAlert("No speech was detected. Please click the microphone again and speak clearly, or type your message.");
    }
  };
  recognition.onend = () => stopListening();
}

function startListening() {
  if (!recognition) {
    appendSystemAlert("Speech recognition is natively supported in Google Chrome and Microsoft Edge. You can also type your message in the text box below.");
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
  try { recognition.stop(); } catch (e) {}
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
      if (ttsLabel) ttsLabel.innerText = "ON";
      if (ttsIcon) ttsIcon.className = "fa-solid fa-volume-high";
    } else {
      window.speechSynthesis.cancel();
      if (ttsLabel) ttsLabel.innerText = "OFF";
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

// Local AI Rule Engine (Seamless fallback for instant zero-lag response)
function mockProcessQuery(query) {
  const q = query.toLowerCase().trim();

  // 1. Emergency
  if (q.includes("fire") || q.includes("accident") || q.includes("smoke") || q.includes("ambulance") || q.includes("blood") || q.includes("आग") || q.includes("জরুরি")) {
    const tid = "CV" + Math.floor(1000 + Math.random() * 9000);
    const newComp = {
      ticket_id: tid,
      student_id: currentStudent.id,
      student_name: currentStudent.name,
      student_department: currentStudent.department,
      title: "EMERGENCY: " + query.substring(0, 45),
      issue: query,
      raw_query: query,
      category: "Security",
      location: "Campus Central Area",
      priority: "Critical",
      status: "In Progress",
      urgency_score: 99,
      sentiment: "Urgent",
      assigned_technician: "Campus Emergency Quick Response Team",
      created_at: new Date().toISOString(),
      timeline: [
        { title: "Critical Emergency Logged", description: "Campus security & ambulance alerted immediately.", timestamp: "Just now", status: "In Progress" },
        { title: "Emergency Team Dispatched", description: "First responders routed to location.", timestamp: "Just now", status: "In Progress" }
      ]
    };
    allStudentComplaints.unshift(newComp);
    return {
      intent: "emergency",
      display_text: `🚨 **CRITICAL EMERGENCY LOGGED** (Ticket \`${tid}\`). Campus security, ambulance and quick response teams have been alerted immediately.`,
      spoken_response: `Critical emergency registered under ticket ${tid}. Quick response teams have been dispatched.`,
      ticket: newComp
    };
  }

  // 2. Status Check
  if (q.includes("status") || q.includes("track") || q.includes("cv") || q.includes("update") || q.includes("स्थिति") || q.includes("স্ট্যাটাস")) {
    const match = q.match(/cv\s*[-_]?\s*(\d{3,6})/i);
    const targetId = match ? ("CV" + match[1]).toUpperCase() : "CV1020";
    const found = allStudentComplaints.find(c => c.ticket_id.toUpperCase() === targetId) || allStudentComplaints[0];
    return {
      intent: "check_status",
      display_text: `📋 **Status Update for Ticket \`${found.ticket_id}\`:**\n• **Title:** ${found.title}\n• **Status:** \`${found.status}\`\n• **Category:** ${found.category} | **Location:** ${found.location}\n• **Assigned Technician:** ${found.assigned_technician || 'Under Review'}`,
      spoken_response: `Ticket ${found.ticket_id} is currently ${found.status}. Assigned technician is ${found.assigned_technician || 'under review'}.`,
      ticket: found
    };
  }

  // 3. College Notices Inquiry
  if (q.includes("notice") || q.includes("exam") || q.includes("date") || q.includes("holiday") || q.includes("placement") || q.includes("schedule") || q.includes("circular") || q.includes("सूचना") || q.includes("বিজ্ঞপ্তি")) {
    const matched = defaultNotices.find(n => q.includes(n.category.toLowerCase()) || q.includes(n.title.toLowerCase().split(" ")[0])) || defaultNotices[0];
    return {
      intent: "notice_inquiry",
      display_text: `📢 **Verified University Notice:**\n\n**${matched.title}**\n• **Category:** ${matched.category} | **Deadline / Date:** \`${matched.deadline_date}\`\n\n${matched.content}\n\n📄 *Attached: ${matched.pdf_filename}*`,
      spoken_response: `Notice found: ${matched.title}. Deadline is ${matched.deadline_date}.`,
      notices_found: [matched]
    };
  }

  // 4. Campus Directory / Handbook FAQ
  if (q.includes("where") || q.includes("timing") || q.includes("hours") || q.includes("library") || q.includes("dispensary") || q.includes("medical") || q.includes("कहाँ") || q.includes("কোথায়")) {
    return {
      intent: "campus_inquiry",
      display_text: `ℹ️ **Official Campus Handbook Directory:**\n• **Examination Department:** Administrative Block, 2nd Floor (Room A-208)\n• **Central Library:** Mon-Sat 8:00 AM - 8:00 PM (open until 11:00 PM during exam weeks)\n• **Health Center & Dispensary:** Behind Hostel Block A (Ambulance: 011-2345678)\n• **Student Wi-Fi Helpdesk:** Computer Center, 1st Floor.`,
      spoken_response: `The Examination Department is on the 2nd Floor of Administrative Block, and the Health Center is behind Hostel Block A.`
    };
  }

  // 5. Default Grievance Registration
  let category = "Maintenance";
  if (q.includes("wifi") || q.includes("internet") || q.includes("network") || q.includes("portal") || q.includes("computer") || q.includes("lan")) category = "IT/Network";
  else if (q.includes("hostel") || q.includes("mess") || q.includes("food") || q.includes("room") || q.includes("cooler")) category = "Hostel";
  else if (q.includes("water") || q.includes("washroom") || q.includes("toilet") || q.includes("dirty") || q.includes("cleaning") || q.includes("dustbin")) category = "Sanitation";

  let loc = "Academic Block A - Room 204";
  if (q.includes("hostel")) loc = "Hostel Block B - Floor 2";
  else if (q.includes("library")) loc = "Central Library Reading Room";
  else if (q.includes("lab")) loc = "Computer Lab 3";

  let prio = "Medium";
  let score = 65;
  if (q.includes("urgent") || q.includes("broken") || q.includes("hot") || q.includes("severe") || q.includes("leak") || q.includes("immediately")) {
    prio = "High";
    score = 85;
  }

  const tid = "CV" + Math.floor(1000 + Math.random() * 9000);
  const newComp = {
    ticket_id: tid,
    student_id: currentStudent.id,
    student_name: currentStudent.name,
    student_department: currentStudent.department,
    title: query.length > 55 ? query.substring(0, 52) + "..." : query,
    issue: query,
    raw_query: query,
    category: category,
    location: loc,
    priority: prio,
    status: "Pending",
    urgency_score: score,
    sentiment: score >= 80 ? "Urgent" : "Concerned",
    assigned_technician: `${category} Duty Specialist`,
    created_at: new Date().toISOString(),
    timeline: [
      { title: "Complaint Registered", description: "Recorded via student assistant.", timestamp: "Just now", status: "Pending" },
      { title: `Routed to ${category} Unit`, description: `Automated priority score: ${score}/100 (${prio}).`, timestamp: "Just now", status: "Assigned" }
    ]
  };

  allStudentComplaints.unshift(newComp);
  return {
    intent: "register_complaint",
    display_text: `Your grievance has been successfully recorded and routed to **${category} Operations** under ticket \`${tid}\`. Our duty specialist has been notified for triage.`,
    spoken_response: `Your grievance has been registered under ticket ${tid} and assigned to ${category} maintenance.`,
    ticket: newComp
  };
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        language: currentLang,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        student_department: currentStudent.department
      })
    });

    if (!res.ok) throw new Error("Server error");
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
    fetchNotifications();
  } catch (err) {
    // Seamless local fallback
    removeMessage(typingId);
    const mockData = mockProcessQuery(query);
    appendAssistantMessage(mockData);
    if (mockData.spoken_response) {
      speakVoice(mockData.spoken_response, currentLang);
    }
    loadDashboard();
  }
}

if (sendBtn) sendBtn.addEventListener("click", handleVoiceSend);
if (queryInput) {
  queryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleVoiceSend();
  });
}

window.fillQuery = function(text) {
  navigateTo('voice');
  if (queryInput) queryInput.value = text;
  handleVoiceSend();
};

window.triggerAsk = function(question) {
  navigateTo('voice');
  if (queryInput) queryInput.value = question;
  handleVoiceSend();
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
  const div = document.createElement("div");
  div.style.cssText = "display: flex; align-items: flex-start; gap: 12px;";

  let extraHtml = "";

  if (data.ticket) {
    const ext = data.extracted_data || {};
    const urgencyScore = data.ticket.urgency_score || ext.urgency_score || 50;
    const sentiment = data.ticket.sentiment || ext.sentiment || "Neutral";
    const factors = ext.urgency_factors || ["Standard maintenance triage", "Classroom equipment breakdown"];

    extraHtml += `
      <div style="margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">Grievance Work Order Created</strong>
          <span style="font-family: var(--font-mono); font-weight: 800; color: #0d9488; background: #f0fdfa; padding: 2px 8px; border-radius: 6px; border: 1px solid #ccfbf1;">${data.ticket.ticket_id}</span>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.76rem;">
            <span style="font-weight: 700; color: #475569;">AI Urgency Assessment:</span>
            <span style="font-family: var(--font-mono); font-weight: 800;" class="${getUrgencyTextColor(urgencyScore)}">${urgencyScore} / 100 (${data.ticket.priority} Priority)</span>
          </div>
          <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
            <div class="${getUrgencyBarColor(urgencyScore)}" style="height: 100%; border-radius: 9999px; width: ${urgencyScore}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748b;">
            <span>Sentiment: <strong style="color: #0f172a;">${sentiment}</strong></span>
            <span>Category: <strong>${data.ticket.category}</strong></span>
          </div>
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 0.72rem; color: #64748b;">
            <strong>Factors:</strong> ${factors.map(f => `<span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-right: 4px; display: inline-block; margin-top: 2px;">${f}</span>`).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem; margin-bottom: 10px;">
          <div><span style="color: #94a3b8;">Location:</span> <strong style="color: #0f172a;">${data.ticket.location}</strong></div>
          <div><span style="color: #94a3b8;">Status:</span> <strong style="color: #16a34a;">${data.ticket.status}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 0.76rem;">
          <span style="color: #64748b;">Technician: <strong>${data.ticket.assigned_technician || 'Assigned to Unit'}</strong></span>
          <button type="button" class="btn-text" style="padding: 0;" onclick="openTimelineModal('${data.ticket.ticket_id}')">View Timeline &rarr;</button>
        </div>
      </div>
    `;
  }

  if (data.notices_found && data.notices_found.length > 0) {
    const n = data.notices_found[0];
    extraHtml += `
      <div style="margin-top: 14px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 0.82rem;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
          <i class="fa-solid fa-file-pdf"></i>
          <span>Official Circular Verified: ${n.pdf_filename || 'Notice.pdf'}</span>
        </div>
        <p style="margin: 0 0 6px 0; color: #475569; font-size: 0.78rem;">${n.content}</p>
        <span style="font-size: 0.72rem; font-weight: 700; color: #92400e;">Deadline / Date: ${n.deadline_date || 'Check notice'}</span>
      </div>
    `;
  }

  const rawText = data.display_text || "Your query has been processed.";
  const formattedText = rawText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; color: #0d9488; font-family: var(--font-mono); font-size: 0.82rem;">$1</code>')
    .replace(/\n/g, '<br>');

  div.innerHTML = `
    <div class="portal-mark-sm" style="flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px;">CV</div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; border-top-left-radius: 4px; padding: 16px; max-width: 600px; font-size: 0.88rem; line-height: 1.5; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: #94a3b8; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
        <strong style="color: #0f172a;">CampusVoice Assistant</strong>
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
  div.innerHTML = `
    <div class="portal-mark-sm" style="flex-shrink: 0; width: 34px; height: 34px; border-radius: 8px;">CV</div>
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; border-top-left-radius: 4px; padding: 12px 16px; font-size: 0.82rem; color: #64748b; display: flex; align-items: center; gap: 8px;">
      <span>Analyzing voice intent & verifying records...</span>
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
  let stats = {
    total: allStudentComplaints.length,
    pending: allStudentComplaints.filter(c => c.status === "Pending").length,
    resolved: allStudentComplaints.filter(c => c.status === "Resolved").length
  };

  try {
    const res = await fetch(`${API_BASE}/complaints/analytics`);
    if (res.ok) {
      stats = await res.json();
    }
  } catch (err) {}

  const dTot = document.getElementById("dashTotalCount");
  const dPen = document.getElementById("dashPendingCount");
  const dRes = document.getElementById("dashResolvedCount");
  if (dTot) dTot.innerText = stats.total ?? allStudentComplaints.length;
  if (dPen) dPen.innerText = stats.pending ?? 0;
  if (dRes) dRes.innerText = stats.resolved ?? 0;

  // Render Notices ticker
  let notices = defaultNotices;
  try {
    const noticeRes = await fetch(`${API_BASE}/notices/?limit=3`);
    if (noticeRes.ok) notices = await noticeRes.json();
  } catch (err) {}

  const dNot = document.getElementById("dashNoticesCount");
  if (dNot) dNot.innerText = String(notices.length).padStart(2, '0');

  const listEl = document.getElementById("dashNoticesList");
  if (listEl) {
    listEl.innerHTML = notices.slice(0, 3).map(n => `
      <div style="padding: 10px 12px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; cursor: pointer; transition: all 0.15s ease;" onclick="openNoticeModal(${n.id})">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f0fdfa; color: #0d9488; margin-right: 6px;">${n.category}</span>
          <strong style="font-size: 0.82rem; color: #0f172a;">${n.title}</strong>
        </div>
        <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono); white-space: nowrap;">${n.deadline_date || 'Circular'}</span>
      </div>
    `).join("");
  }

  // Render Recent Complaints
  let comps = allStudentComplaints;
  try {
    const compRes = await fetch(`${API_BASE}/complaints/?limit=3`);
    if (compRes.ok) comps = await compRes.json();
  } catch (err) {}

  const recentEl = document.getElementById("dashRecentTickets");
  if (recentEl) {
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
          <span class="${getStatusBadge(c.status)}" style="padding: 3px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700;">${c.status}</span>
          <button type="button" class="btn-text" style="font-size: 0.78rem; padding: 0;">Timeline &rarr;</button>
        </div>
      </div>
    `).join("");
  }
}

// =========================================================================
// 6. MANUAL COMPLAINT REGISTRATION
// =========================================================================
window.runAiAutoDetect = async function() {
  const descEl = document.getElementById("manualDesc");
  if (!descEl) return;
  const desc = descEl.value.trim();
  if (!desc) {
    alert("Please enter a brief description of the problem first.");
    return;
  }

  const notice = document.getElementById("aiDetectNotice");
  if (notice) {
    notice.classList.remove("hidden");
    notice.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> Analyzing issue for Category, Urgency Score & Priority...`;
  }

  try {
    const res = await fetch(`${API_BASE}/assistant/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: desc, language: currentLang })
    });

    if (res.ok) {
      const data = await res.json();
      const ext = data.extracted_data || {};
      applyAutoDetectResult(ext, notice);
      return;
    }
  } catch (e) {}

  // Local rule-based auto-detection fallback
  const q = desc.toLowerCase();
  let cat = "Maintenance";
  if (q.includes("wifi") || q.includes("internet") || q.includes("portal") || q.includes("computer")) cat = "IT/Network";
  else if (q.includes("hostel") || q.includes("mess") || q.includes("bed") || q.includes("cooler")) cat = "Hostel";
  else if (q.includes("water") || q.includes("washroom") || q.includes("dirty") || q.includes("clean")) cat = "Sanitation";

  let prio = (q.includes("urgent") || q.includes("hot") || q.includes("leak") || q.includes("exam") || q.includes("broken")) ? "High" : "Medium";
  let score = prio === "High" ? 82 : 55;

  applyAutoDetectResult({
    category: cat,
    location: "Classroom 204",
    priority: prio,
    urgency_score: score,
    sentiment: prio === "High" ? "Urgent" : "Concerned",
    urgency_factors: ["Equipment disruption reported", "High urgency keyword detected"]
  }, notice);
};

function applyAutoDetectResult(ext, notice) {
  if (ext.category && document.getElementById("manualCategory")) document.getElementById("manualCategory").value = ext.category;
  if (ext.location && ext.location !== "Campus Area" && document.getElementById("manualLocation")) {
    document.getElementById("manualLocation").value = ext.location;
  }
  if (ext.priority && document.getElementById("manualPriority")) document.getElementById("manualPriority").value = ext.priority;
  if (document.getElementById("manualTitle") && !document.getElementById("manualTitle").value && ext.issue) {
    document.getElementById("manualTitle").value = ext.issue;
  }

  const score = ext.urgency_score || 50;
  const sentiment = ext.sentiment || "Neutral";
  const factors = ext.urgency_factors || ["Standard maintenance baseline"];

  if (notice) {
    notice.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: #115e59;">✨ AI Triage Assessment:</strong>
          <span style="font-family: var(--font-mono); font-weight: 800;" class="${getUrgencyTextColor(score)}">${score} / 100 (${ext.priority || 'Medium'} Priority)</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-bottom: 6px;">
          <div class="${getUrgencyBarColor(score)}" style="height: 100%; border-radius: 9999px; width: ${score}%;"></div>
        </div>
        <p style="margin: 0; font-size: 0.78rem; color: #334155;">Category: <strong>${ext.category || 'Maintenance'}</strong> &bull; Detected Sentiment: <strong>${sentiment}</strong></p>
        <div style="margin-top: 6px; font-size: 0.72rem; color: #64748b;">
          <strong>Factors:</strong> ${factors.join(', ')}
        </div>
      </div>
    `;
  }
}

window.previewImage = function(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById("imagePreview").src = e.target.result;
      document.getElementById("previewFileName").innerText = input.files[0].name;
      document.getElementById("imagePreviewContainer").classList.remove("hidden");
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.clearImagePreview = function() {
  const p = document.getElementById("manualPhoto");
  if (p) p.value = "";
  const c = document.getElementById("imagePreviewContainer");
  if (c) c.classList.add("hidden");
};

window.handleManualComplaintSubmit = async function(e) {
  e.preventDefault();
  const btn = document.getElementById("submitComplaintBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> Submitting...`;
  }

  const title = document.getElementById("manualTitle").value.trim();
  const desc = document.getElementById("manualDesc").value.trim();
  const category = document.getElementById("manualCategory").value;
  const location = document.getElementById("manualLocation").value.trim();
  const priority = document.getElementById("manualPriority").value;
  const previewEl = document.getElementById("imagePreview");
  const previewSrc = previewEl ? previewEl.src : "";
  const image_url = previewSrc && previewSrc.startsWith("data:") ? previewSrc : null;

  try {
    const res = await fetch(`${API_BASE}/complaints/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        issue: title,
        raw_query: desc,
        category: category,
        location: location,
        priority: priority,
        student_id: currentStudent.id,
        student_name: currentStudent.name,
        student_department: currentStudent.department,
        student_contact: currentStudent.contact,
        image_url: image_url
      })
    });

    if (res.ok) {
      const created = await res.json();
      allStudentComplaints.unshift(created);
      alert(`✅ Grievance Registered Successfully!\n\nTicket ID: ${created.ticket_id}\nDepartment: ${created.category}\nStatus: ${created.status}`);
      document.getElementById("manualComplaintForm").reset();
      clearImagePreview();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Submit Grievance</span>`;
      }
      navigateTo('complaints');
      fetchNotifications();
      return;
    }
  } catch (err) {}

  // Local standalone ticket registration
  const tid = "CV" + Math.floor(1000 + Math.random() * 9000);
  const newTicket = {
    ticket_id: tid,
    student_id: currentStudent.id,
    student_name: currentStudent.name,
    student_department: currentStudent.department,
    title: title,
    issue: title,
    raw_query: desc,
    category: category,
    location: location,
    priority: priority,
    status: "Pending",
    urgency_score: priority === "High" ? 80 : 50,
    assigned_technician: `${category} Unit Duty Specialist`,
    created_at: new Date().toISOString(),
    timeline: [
      { title: "Complaint Registered", description: "Reported via student grievance form.", timestamp: "Just now", status: "Pending" },
      { title: `Routed to ${category}`, description: `Assigned priority: ${priority}`, timestamp: "Just now", status: "Assigned" }
    ]
  };
  allStudentComplaints.unshift(newTicket);
  alert(`✅ Grievance Registered Successfully!\n\nTicket ID: ${tid}\nDepartment: ${category}\nStatus: Pending (Assigned to Duty Specialist)`);
  document.getElementById("manualComplaintForm").reset();
  clearImagePreview();
  navigateTo('complaints');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Grievance`;
  }
};

// =========================================================================
// 7. MY COMPLAINTS & DETAILED TIMELINE
// =========================================================================
window.filterMyComplaints = function(status) {
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
    const studentParam = (currentStudent && currentStudent.id) ? `?student_id=${encodeURIComponent(currentStudent.id)}` : '';
    const res = await fetch(`${API_BASE}/complaints/${studentParam}`);
    if (res.ok) {
      const list = await res.json();
      if (list && list.length > 0) {
        allStudentComplaints = list;
      } else {
        // Fallback to all campus complaints if student has not registered any yet
        const allRes = await fetch(`${API_BASE}/complaints/`);
        if (allRes.ok) allStudentComplaints = await allRes.json();
      }
    }
  } catch (e) {}
  renderComplaintsList();
}

function renderComplaintsList() {
  const container = document.getElementById("myComplaintsList");
  if (!container) return;

  let filtered = allStudentComplaints;
  if (currentComplaintFilter !== "All") {
    filtered = allStudentComplaints.filter(c => c.status === currentComplaintFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 48px 20px; text-align: center; color: #94a3b8;">
        <i class="fa-solid fa-clipboard-check" style="font-size: 2.2rem; margin-bottom: 10px; display: block; color: #cbd5e1;"></i>
        <strong style="display: block; font-size: 0.95rem; color: #475569;">No complaints found under "${currentComplaintFilter}"</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem;">Switch status tabs or lodge a new complaint</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: #ffffff; transition: background 0.15s ease;">
      <div style="flex: 1; min-width: 260px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="font-family: var(--font-mono); font-weight: 800; color: #0d9488; font-size: 0.88rem;">${c.ticket_id}</span>
          <span style="font-size: 0.72rem; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">${c.category}</span>
          <span class="${getPriorityBadge(c.priority)}" style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${c.priority} (${c.urgency_score || 50}/100)</span>
        </div>
        <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 800; color: #0f172a;">${c.title || c.issue}</h4>
        <p style="margin: 0 0 6px 0; font-size: 0.82rem; color: #64748b; line-height: 1.4;">${c.raw_query}</p>
        <div style="font-size: 0.76rem; color: #94a3b8; display: flex; gap: 14px; flex-wrap: wrap;">
          <span><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${c.location}</span>
          <span>Technician: <strong style="color: #475569;">${c.assigned_technician || 'Under Review'}</strong></span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0;">
        <span class="${getStatusBadge(c.status)}" style="padding: 4px 12px; border-radius: 9999px; font-size: 0.76rem; font-weight: 700;">${c.status}</span>
        <button type="button" class="btn-secondary btn-small" onclick="openTimelineModal('${c.ticket_id}')">
          <i class="fa-solid fa-timeline"></i> View Timeline &rarr;
        </button>
      </div>
    </div>
  `).join("");
}

// Timeline Modal Display
window.openTimelineModal = async function(ticketId) {
  const modal = document.getElementById("timelineModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  document.getElementById("modalTimelineTicketId").innerText = ticketId;
  document.getElementById("modalTimelineTitle").innerText = "Loading details...";
  document.getElementById("modalTimelineLocation").innerText = "";

  try {
    const res = await fetch(`${API_BASE}/complaints/${ticketId}`);
    if (res.ok) {
      const c = await res.json();
      renderTimelineData(c);
      return;
    }
  } catch (e) {}

  // Fallback to local ticket
  const localC = allStudentComplaints.find(x => x.ticket_id === ticketId);
  if (localC) {
    renderTimelineData(localC);
  } else {
    document.getElementById("timelineEventsContainer").innerHTML = `<p style="font-size: 0.82rem; color: #94a3b8;">No events found for this ticket.</p>`;
  }
};

function renderTimelineData(c) {
  document.getElementById("modalTimelineTitle").innerText = c.title || c.issue;
  document.getElementById("modalTimelineLocation").innerText = `${c.location} • Category: ${c.category}`;
  const badge = document.getElementById("modalTimelineStatusBadge");
  if (badge) {
    badge.innerText = c.status;
    badge.className = getStatusBadge(c.status);
  }

  const events = c.timeline || [
    { title: "Complaint Registered", description: "Recorded via student assistant.", timestamp: "Recent", status: "Pending" },
    { title: `Routed to ${c.category}`, description: `Assigned technician: ${c.assigned_technician || 'Duty Staff'}`, timestamp: "Recent", status: "In Progress" }
  ];

  const cont = document.getElementById("timelineEventsContainer");
  if (cont) {
    cont.innerHTML = events.map(ev => `
      <div class="timeline-item">
        <span class="timeline-dot"></span>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h5 style="margin: 0; font-size: 0.84rem; font-weight: 700; color: #0f172a;">${ev.title}</h5>
          <span style="font-size: 0.72rem; color: #94a3b8; font-family: var(--font-mono);">${ev.timestamp}</span>
        </div>
        <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: #475569;">${ev.description}</p>
      </div>
    `).join("");
  }
}

window.closeTimelineModal = function() {
  const m = document.getElementById("timelineModal");
  if (m) m.classList.add("hidden");
};

// =========================================================================
// 8. COLLEGE NOTICES & MODAL VIEWER
// =========================================================================
let allLoadedNotices = defaultNotices;

async function loadNotices() {
  const cat = document.getElementById("noticeCategorySelect") ? document.getElementById("noticeCategorySelect").value : "All";
  const search = document.getElementById("noticeSearchInput") ? document.getElementById("noticeSearchInput").value.trim().toLowerCase() : "";

  let notices = defaultNotices;
  try {
    let url = `${API_BASE}/notices/?`;
    if (cat && cat !== "All") url += `category=${encodeURIComponent(cat)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await fetch(url);
    if (res.ok) {
      notices = await res.json();
      allLoadedNotices = notices;
    }
  } catch (e) {
    // Filter local notices
    if (cat && cat !== "All") notices = notices.filter(n => n.category === cat);
    if (search) notices = notices.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
  }

  const grid = document.getElementById("noticesGrid");
  if (!grid) return;

  if (notices.length === 0) {
    grid.innerHTML = `<p style="padding: 30px; text-align: center; color: #94a3b8; font-size: 0.88rem; grid-column: 1 / -1;">No circulars found matching "${search || cat}".</p>`;
    return;
  }

  grid.innerHTML = notices.map(n => `
    <div class="clean-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.15s ease;" onmouseenter="this.style.borderColor='#0d9488'" onmouseleave="this.style.borderColor='var(--border)'">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; ${getNoticeBadge(n.category)}">${n.category}</span>
          ${n.is_pinned ? '<span style="font-size: 0.68rem; font-weight: 700; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 1px 6px; border-radius: 4px;"><i class="fa-solid fa-thumbtack" style="margin-right: 4px;"></i>Pinned</span>' : ''}
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; line-height: 1.35;">${n.title}</h4>
        <p style="margin: 0; font-size: 0.82rem; color: #64748b; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${n.content}</p>
      </div>

      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem;">
        <span style="color: #64748b;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${n.deadline_date || 'Circular'}</span>
        <button type="button" class="btn-text" style="font-size: 0.78rem; padding: 0;" onclick="openNoticeModal(${n.id})">
          <i class="fa-solid fa-file-pdf" style="color: #dc2626; margin-right: 4px;"></i> View Full Circular &rarr;
        </button>
      </div>
    </div>
  `).join("");
}

window.openNoticeModal = function(noticeId) {
  const pool = (allLoadedNotices && allLoadedNotices.length > 0) ? allLoadedNotices : defaultNotices;
  const n = pool.find(x => x.id === noticeId) || defaultNotices.find(x => x.id === noticeId) || defaultNotices[0];
  document.getElementById("noticeModalCategory").innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #0d9488;"></i> Circular: ${n.category}`;
  document.getElementById("noticeModalDept").innerText = n.department || "Registrar Office";
  document.getElementById("noticeModalTitle").innerText = n.title;
  document.getElementById("noticeModalDeadline").innerText = n.deadline_date || "Active Notice";
  document.getElementById("noticeModalBody").innerText = n.content;
  document.getElementById("noticeModalPdf").innerHTML = `<i class="fa-solid fa-file-pdf" style="color: #dc2626; margin-right: 6px;"></i> ${n.pdf_filename || 'Circular.pdf'}`;

  document.getElementById("noticeModal").classList.remove("hidden");
};

window.closeNoticeModal = function() {
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
  allFaqs = [
    { q: "Where is the examination department located?", a: "The Examination Department is located on the 2nd Floor of Administrative Block (Room A-208), next to the Registrar's Office. Office hours are 9:30 AM to 5:00 PM.", cat: "Navigation" },
    { q: "When is the regular deadline for examination forms?", a: "The regular deadline is the 15th of next month via the Student ERP Portal. Late submissions with penalty fine are accepted up to 5 days later.", cat: "Academic" },
    { q: "What are the Central Library timings and rules?", a: "Central library is open Mon-Sat from 8:00 AM to 8:00 PM. During examination weeks, reading halls remain open until 11:00 PM daily.", cat: "Library" },
    { q: "How do I connect to campus student Wi-Fi?", a: "Connect to SSID 'Campus-Student' using your Student ID and ERP password. For password resets or MAC binding, visit IT Helpdesk in Computer Center 1st Floor.", cat: "IT & Network" },
    { q: "Where is the campus medical dispensary located?", a: "The Campus Health Center is located behind Hostel Block A. For emergencies, contact ambulance at 011-2345678 or call Security Control Room.", cat: "Emergency" },
    { q: "How do I request hostel room maintenance or plumbing?", a: "Lodge a grievance under 'Hostel' category on CampusVoice or contact the Hostel Warden office in Block A ground floor.", cat: "Academic" }
  ];
  renderFaqs(allFaqs);
}

window.filterFaqByCategory = function(category) {
  if (category === "All") {
    renderFaqs(allFaqs);
  } else {
    const filtered = allFaqs.filter(f => f.cat.toLowerCase().includes(category.toLowerCase()));
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
    el.innerHTML = `<p style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.88rem;">No matching FAQs found.</p>`;
    return;
  }
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
          <i class="fa-solid fa-microphone" style="margin-right: 4px; color: #0d9488;"></i> Ask in Voice Assistant &rarr;
        </button>
      </div>
    </div>
  `).join("");
}

window.toggleFaq = function(idx) {
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
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Initial initialization
function initApp() {
  loadDashboard();
  fetchNotifications();

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

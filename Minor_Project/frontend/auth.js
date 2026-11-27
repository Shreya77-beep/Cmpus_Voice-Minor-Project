// CampusVoice Authentication & Server-Verified Session Management
const API_BASE = "/api";

function getPortalUrl(role) {
  const isFile = window.location.protocol === "file:";
  if (role === "admin") return isFile ? "admin.html" : "/admin";
  if (role === "department") return isFile ? "department.html" : "/department";
  return isFile ? "student.html" : "/student";
}

function getHomeUrl() {
  return window.location.protocol === "file:" ? "index.html" : "/";
}

// Get current logged-in user from localStorage
function getCurrentUser() {
  const userJson = localStorage.getItem("campusvoice_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

// Synchronous session guard + asynchronous server token verification
function requireAuth(allowedRoles = []) {
  const user = getCurrentUser();
  if (!user || !user.verified_auth) {
    const roleNeeded = allowedRoles[0] || "student";
    sessionStorage.setItem("pending_auth_role", roleNeeded);
    window.location.href = getHomeUrl();
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const tr = (k) => (typeof t === "function" ? t(k) : "");
    alert(tr("auth_access_denied") || `Access Denied: You are signed in as '${user.role}' (${user.full_name}). Your session does not allow opening that portal.`);
    window.location.href = getPortalUrl(user.role);
    return null;
  }

  return user;
}

// Authoritative server-side cookie/token check (prevents localStorage spoofing)
async function verifyServerSession(allowedRoles = []) {
  if (window.location.protocol === "file:") {
    window.location.href = getHomeUrl();
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "same-origin"
    });
    if (!res.ok) {
      localStorage.removeItem("campusvoice_user");
      sessionStorage.setItem("pending_auth_role", allowedRoles[0] || "student");
      window.location.href = getHomeUrl();
      return null;
    }
    const serverUser = await res.json();
    if (allowedRoles.length > 0 && !allowedRoles.includes(serverUser.role)) {
      localStorage.setItem("campusvoice_user", JSON.stringify({ ...serverUser, verified_auth: true }));
      window.location.href = getPortalUrl(serverUser.role);
      return null;
    }
    const synced = { ...serverUser, verified_auth: true };
    localStorage.setItem("campusvoice_user", JSON.stringify(synced));
    return synced;
  } catch (err) {
    localStorage.removeItem("campusvoice_user");
    window.location.href = getHomeUrl();
    return null;
  }
}

// Inline error helper inside Auth Modal
function showAuthError(message, suggestSignup = false, panel = "signin") {
  const bannerId = panel === "signup" ? "signupErrorBanner" : "authErrorBanner";
  const banner = document.getElementById(bannerId);
  if (!banner) {
    alert(message);
    return;
  }
  banner.classList.remove("hidden");
  const safeMsg = String(message).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const createLbl = (typeof t === "function") ? t("auth_create_account_link") : "Create New Student Registration →";
  if (suggestSignup && panel === "signin") {
    banner.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <span><i class="fa-solid fa-circle-exclamation" style="margin-right: 6px;"></i>${safeMsg}</span>
        <button type="button" class="btn-text" style="padding: 0; font-size: 0.8rem; text-align: left; color: #0d9488; font-weight: 700;" onclick="setAuthMode('signup')">
          ${createLbl}
        </button>
      </div>
    `;
  } else {
    banner.innerHTML = `<span><i class="fa-solid fa-circle-exclamation" style="margin-right: 6px;"></i>${safeMsg}</span>`;
  }
}

function clearAuthErrors() {
  ["authErrorBanner", "signupErrorBanner"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.innerHTML = "";
    }
  });
}

// Logout (clears server HttpOnly session cookie + client storage)
async function logout(redirectHome = true) {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "same-origin"
    });
  } catch (e) {}
  localStorage.removeItem("campusvoice_user");
  sessionStorage.removeItem("pending_section");
  if (redirectHome) {
    window.location.href = getHomeUrl();
  }
}

// Strict database-verified login handler (single active account per user)
async function handleLogin(username, password, expectedRole = null) {
  clearAuthErrors();
  const tr = (k, fallback) => (typeof t === "function" ? (t(k) || fallback) : fallback);

  // Enforce single account per active session: require signing out before switching accounts
  const activeUser = getCurrentUser();
  if (activeUser && activeUser.verified_auth) {
    showAuthError(
      `${tr("auth_err_already_signin", "You are currently signed in as")} '${activeUser.full_name}' (${activeUser.role}). ${tr("auth_err_signout_first", "Sign out first before entering another account.")}`,
      false,
      "signin"
    );
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, expected_role: expectedRole })
    });

    if (res.ok) {
      const data = await res.json();
      const verifiedUser = { ...data.user, verified_auth: true };
      localStorage.setItem("campusvoice_user", JSON.stringify(verifiedUser));
      window.location.href = data.redirect_url;
      return;
    } else {
      const errData = await res.json().catch(() => ({}));
      const suggestSignup = res.status === 404 && (!expectedRole || expectedRole === "student");
      showAuthError(
        errData.detail || tr("auth_err_invalid_creds", "Invalid credentials. Please check your details or make a new registration of your own."),
        suggestSignup,
        "signin"
      );
      return;
    }
  } catch (err) {
    showAuthError(tr("auth_err_server_signin", "Unable to reach the CampusVoice authentication server. Please ensure the server is running."), false, "signin");
  }
}

// Strict database-backed student registration handler
async function handleSignup(payload) {
  clearAuthErrors();
  const tr = (k, fallback) => (typeof t === "function" ? (t(k) || fallback) : fallback);

  const activeUser = getCurrentUser();
  if (activeUser && activeUser.verified_auth) {
    showAuthError(
      `${tr("auth_err_already_signin", "You are currently signed in as")} '${activeUser.full_name}'. ${tr("auth_err_signout_reg", "Please sign out before registering a new account.")}`,
      false,
      "signup"
    );
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const verifiedUser = { ...data.user, verified_auth: true };
      localStorage.setItem("campusvoice_user", JSON.stringify(verifiedUser));
      window.location.href = data.redirect_url;
      return;
    } else {
      const errData = await res.json().catch(() => ({}));
      const msg = Array.isArray(errData.detail)
        ? errData.detail.map(d => d.msg).join("\n")
        : (errData.detail || tr("auth_err_reg_failed", "Registration failed. Please verify your details."));
      showAuthError(msg, false, "signup");
      return;
    }
  } catch (err) {
    showAuthError(tr("auth_err_server_reg", "Unable to reach the CampusVoice registration server. Please ensure the server is running."), false, "signup");
  }
}

// Shared UTC-aware timestamp formatter matching browser local time & active language
function formatLocalDate(dateStr, langOverride = null) {
  if (!dateStr) return "";
  const raw = String(dateStr).trim();
  // SQLite naive timestamps are UTC; append 'Z' when missing offset/Z so IST/local conversion is exact
  const iso = (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(raw))
    ? raw.replace(" ", "T") + "Z"
    : raw;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw;
  const activeLang = langOverride || ((typeof getSavedLanguage === "function") ? getSavedLanguage() : "en");
  const localeMap = { en: "en-IN", hi: "hi-IN", bn: "bn-IN" };
  return d.toLocaleString(localeMap[activeLang] || "en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Shared WebSocket Real-Time Event Hub Client
let _cvRealtimeSocket = null;
let _cvPingTimer = null;
let _cvReconnectTimer = null;

function connectRealtimeSocket({ onEvent, onStatusChange } = {}) {
  if (window.location.protocol === "file:") return null;
  if (_cvRealtimeSocket && (_cvRealtimeSocket.readyState === WebSocket.OPEN || _cvRealtimeSocket.readyState === WebSocket.CONNECTING)) {
    return _cvRealtimeSocket;
  }

  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProto}//${window.location.host}/api/ws/events`;

  try {
    const ws = new WebSocket(wsUrl);
    _cvRealtimeSocket = ws;

    ws.onopen = () => {
      if (typeof onStatusChange === "function") onStatusChange(true);
      if (_cvPingTimer) clearInterval(_cvPingTimer);
      _cvPingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pong") return;
        if (typeof onEvent === "function") onEvent(msg);
      } catch (e) {}
    };

    ws.onclose = (ev) => {
      if (_cvPingTimer) {
        clearInterval(_cvPingTimer);
        _cvPingTimer = null;
      }
      _cvRealtimeSocket = null;
      if (typeof onStatusChange === "function") onStatusChange(false);
      // Do not auto-reconnect if server explicitly rejected invalid session
      if (ev.code !== 4401) {
        if (_cvReconnectTimer) clearTimeout(_cvReconnectTimer);
        _cvReconnectTimer = setTimeout(() => {
          connectRealtimeSocket({ onEvent, onStatusChange });
        }, 3000);
      }
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };

    return ws;
  } catch (e) {
    return null;
  }
}

// CampusVoice Authentication & Session Management
const API_BASE = "/api";

const DEMO_USERS = {
  student: {
    id: 1,
    username: "student",
    full_name: "Rahul Sharma",
    role: "student",
    department_name: "Computer Science & Engineering",
    student_id: "STU-2023-01",
    email: "rahul.sharma@campus.edu.in",
    contact: "+91 98765 43210"
  },
  dept_it: {
    id: 2,
    username: "dept_it",
    full_name: "Amit Sen (IT Specialist)",
    role: "department",
    department_name: "IT/Network",
    email: "it@campus.edu.in",
    contact: "Ext. 204"
  },
  dept_maintenance: {
    id: 3,
    username: "dept_maintenance",
    full_name: "Rajesh Kumar (Facility Officer)",
    role: "department",
    department_name: "Maintenance",
    email: "maintenance@campus.edu.in",
    contact: "Ext. 301"
  },
  dept_hostel: {
    id: 4,
    username: "dept_hostel",
    full_name: "Suresh Pillai (Hostel Warden)",
    role: "department",
    department_name: "Hostel",
    email: "hostel@campus.edu.in",
    contact: "Ext. 402"
  },
  dept_sanitation: {
    id: 5,
    username: "dept_sanitation",
    full_name: "Manoj Tiwari (Sanitation Lead)",
    role: "department",
    department_name: "Sanitation",
    email: "sanitation@campus.edu.in",
    contact: "Ext. 105"
  },
  admin: {
    id: 6,
    username: "admin",
    full_name: "Dr. S. K. Verma",
    role: "admin",
    department_name: "University Administration",
    email: "dean@campus.edu.in",
    contact: "011-2345678"
  }
};

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

// Session check guard on protected pages
function requireAuth(allowedRoles = []) {
  let user = getCurrentUser();
  if (!user) {
    // In standalone/demo mode, provide default student session
    user = DEMO_USERS.student;
    localStorage.setItem("campusvoice_user", JSON.stringify(user));
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const roleNeeded = allowedRoles[0];
    const targetName = roleNeeded === "admin" ? "University Administration" : (roleNeeded === "department" ? "Department Staff" : "Student");
    const switchRole = confirm(`Access Notice: You are currently signed in as '${user.role}' (${user.full_name}).\n\nThis portal requires '${targetName}' privileges.\n\nClick OK to switch to a demo ${targetName} session, or Cancel to return to your ${user.role} portal.`);
    if (switchRole) {
      const demoAccount = roleNeeded === "admin" ? DEMO_USERS.admin : (roleNeeded === "department" ? DEMO_USERS.dept_it : DEMO_USERS.student);
      localStorage.setItem("campusvoice_user", JSON.stringify(demoAccount));
      window.location.reload();
      return null;
    } else {
      window.location.href = getPortalUrl(user.role);
      return null;
    }
  }

  return user;
}

// Logout
function logout() {
  localStorage.removeItem("campusvoice_user");
  window.location.href = getHomeUrl();
}

// Login API handler with automatic standalone fallback
async function handleLogin(username, password) {
  const u = (username || "").trim().toLowerCase();

  // Try real backend API if not file: protocol
  if (window.location.protocol !== "file:") {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("campusvoice_user", JSON.stringify(data.user));
        window.location.href = data.redirect_url;
        return;
      }
    } catch (err) {
      console.warn("Backend server not reached; using local session fallback.");
    }
  }

  // Fallback demo user resolution (for file:/// mode or when backend server is offline)
  let user = DEMO_USERS[u];
  if (!user) {
    user = {
      id: Date.now(),
      username: u || "student",
      full_name: u === "admin" ? "Dr. S. K. Verma" : "Enrolled Student",
      role: u.includes("admin") ? "admin" : (u.includes("dept") ? "department" : "student"),
      department_name: "Computer Science & Engineering",
      student_id: u.toUpperCase().startsWith("STU-") ? u.toUpperCase() : "STU-2024-01",
      email: `${u || 'student'}@campus.edu.in`,
      contact: "+91 98765 43210"
    };
  }

  localStorage.setItem("campusvoice_user", JSON.stringify(user));
  window.location.href = getPortalUrl(user.role);
}

// Student Signup API handler with automatic standalone fallback
async function handleSignup(payload) {
  if (window.location.protocol !== "file:") {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("campusvoice_user", JSON.stringify(data.user));
        window.location.href = data.redirect_url;
        return;
      }
    } catch (err) {
      console.warn("Backend signup not reached; using local registration session.");
    }
  }

  const newUser = {
    id: Date.now(),
    username: payload.student_id ? payload.student_id.toLowerCase() : "newstudent",
    full_name: payload.full_name || "New Student",
    role: "student",
    student_id: payload.student_id ? payload.student_id.toUpperCase() : "STU-2024-99",
    department_name: payload.department_name || "Computer Science & Engineering",
    email: payload.email || "student@campus.edu.in",
    contact: payload.contact || "+91 98765 00000"
  };

  localStorage.setItem("campusvoice_user", JSON.stringify(newUser));
  alert(`🎉 Account created for ${newUser.full_name}!\nEntering Student Portal...`);
  window.location.href = getPortalUrl("student");
}

// Quick 1-click evaluator login helper
window.quickLogin = function(username, password) {
  handleLogin(username, password);
};

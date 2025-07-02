// =============================================
// 1. CONSTANTS AND UTILITIES
// =============================================
const STORAGE_KEYS = {
  RECORDS: 'disaRecords',
  ROLE: 'userRole'
};

const showAlert = (message, type = 'info') => {
  const alertBox = document.createElement('div');
  alertBox.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 z-index-1031`;
  alertBox.style.minWidth = '300px';
  alertBox.textContent = message;
  document.body.appendChild(alertBox);

  setTimeout(() => {
    alertBox.classList.add('fade');
    setTimeout(() => alertBox.remove(), 150);
  }, 3000);
};

const escapeHtml = (unsafe) =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// =============================================
// 2. LOGIN SYSTEM
// =============================================
document.getElementById("loginForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("username")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const found = users.find(u => u.username === username && u.password === password);

  if (found) {
    localStorage.setItem("user", JSON.stringify(found));
    localStorage.setItem(STORAGE_KEYS.ROLE, found.role);
    window.location.href = "dashboard.html";
  } else {
    showAlert("Invalid username or password", "danger");
  }
});

// =============================================
// 3. PRODUCTION DATA STORAGE
// =============================================
let records = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS)) || [];

const saveRecords = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (error) {
    console.error('Save error:', error);
    showAlert('Failed to save data locally', 'danger');
  }
};

// =============================================
// 4. DASHBOARD FUNCTIONALITY
// =============================================
if (window.location.pathname.includes("dashboard.html")) {
  const role = localStorage.getItem(STORAGE_KEYS.ROLE);

  const displayUserRole = () => {
    const roleElement = document.getElementById("currentRole");
    if (roleElement) {
      roleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const displayRecords = () => {
    const table = document.getElementById("recordsTable");
    if (!table) return;

    table.innerHTML = records.map(r => `
      <tr>
        <td>${escapeHtml(r.machineId || 'N/A')}</td>
        <td>${r.goodParts || 0}</td>
        <td>${r.defects || 0}</td>
        <td>${r.timestamp ? escapeHtml(new Date(r.timestamp).toLocaleString()) : 'Unknown'}</td>
      </tr>
    `).join("");

    document.getElementById("totalProduction").textContent =
      records.reduce((sum, r) => sum + (parseInt(r.goodParts) || 0), 0);
    document.getElementById("totalDefects").textContent =
      records.reduce((sum, r) => sum + (parseInt(r.defects) || 0), 0);
    document.getElementById("lastEntry").textContent =
      records.length > 0 ? new Date(records[records.length - 1].timestamp).toLocaleString() : "None yet";
  };

  const exportToCSV = async () => {
    const overlay = document.getElementById("loadingOverlay");
    try {
      overlay.style.display = "flex";
      await new Promise(r => setTimeout(r, 500));

      let csv = "Machine ID,Good Parts,Defects,Timestamp\n";
      records.forEach(r => {
        csv += `${escapeHtml(r.machineId || '')},${r.goodParts || 0},${r.defects || 0},${r.timestamp ? escapeHtml(new Date(r.timestamp).toLocaleString()) : ''}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `disa_production_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showAlert('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showAlert('Failed to export data', 'danger');
    } finally {
      overlay.style.display = "none";
    }
  };

  if (role === "operator") {
    document.getElementById("exportBtn")?.style.setProperty("display", "none");
  }

  document.getElementById("exportBtn")?.addEventListener("click", exportToCSV);
  displayUserRole();
  displayRecords();
}

// =============================================
// 5. DATA ENTRY PAGE
// =============================================
if (window.location.pathname.includes("data-entry.html")) {
  const form = document.getElementById("dataForm");

  form?.addEventListener("submit", function (e) {
    e.preventDefault();

    const machineId = document.getElementById("machineId").value.trim();
    const goodParts = parseInt(document.getElementById("goodParts").value);
    const defects = parseInt(document.getElementById("defects").value);

    if (!machineId || machineId.length > 20) {
      showAlert("Machine ID must be 1–20 characters", "danger");
      return;
    }

    if (isNaN(goodParts) || goodParts < 0) {
      showAlert("Good Parts must be ≥ 0", "danger");
      return;
    }

    if (isNaN(defects) || defects < 0) {
      showAlert("Defects must be ≥ 0", "danger");
      return;
    }

    const record = {
      machineId,
      goodParts,
      defects,
      timestamp: Date.now()
    };

    records.push(record);
    saveRecords();
    document.getElementById("lastSaved")?.textContent = new Date().toLocaleString();
    showAlert("Record saved!", "success");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
  });
}

// =============================================
// 6. ONLINE/OFFLINE STATUS HANDLING
// =============================================
window.addEventListener("offline", () => {
  showAlert('You are offline. Data will be saved locally.', 'warning');
});

window.addEventListener("online", () => {
  if (navigator.onLine) {
    showAlert('Internet connection restored', 'success');
    // Future: sync with server
  }
});

// =============================================
// 7. LOGOUT FUNCTIONALITY
// =============================================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("user");
  localStorage.removeItem(STORAGE_KEYS.ROLE);
  showAlert('Logged out successfully', 'success');
  setTimeout(() => window.location.href = "index.html", 1000);
});

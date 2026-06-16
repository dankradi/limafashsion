// ═══════════════════════════════════════════
//  Lima Fashion — Super Admin JS
// ═══════════════════════════════════════════
const API = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.origin === "null" || window.location.protocol === "file:") ? "http://localhost:5000/api" : window.location.origin + "/api";

// ── State ──
let saToken = sessionStorage.getItem("sa_token") || "";
let saUser  = sessionStorage.getItem("sa_user")  || "";

// ── DOM refs ──
const loginScreen   = document.getElementById("loginScreen");
const dashboard     = document.getElementById("dashboard");
const loginForm     = document.getElementById("loginForm");
const loginError    = document.getElementById("loginError");
const loginBtn      = document.getElementById("loginBtn");
const loginBtnText  = document.getElementById("loginBtnText");
const loginSpinner  = document.getElementById("loginSpinner");
const sidebarUser   = document.getElementById("sidebarUsername");

// ══════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════
async function boot() {
  // If logged in with a local token (offline mode), go straight to dashboard
  if (saToken && saToken.startsWith("local-")) {
    showDashboard();
    return;
  }
  if (!saToken) { showLogin(); return; }
  try {
    const r = await apiFetch("GET", "/superadmin/verify");
    if (r.valid) {
      showDashboard();
    } else {
      clearSession(); showLogin();
    }
  } catch (e) {
    // If server is offline but we have a token, show dashboard anyway
    if (saToken) showDashboard();
    else { clearSession(); showLogin(); }
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboard.classList.add("hidden");
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  if (sidebarUser) sidebarUser.textContent = saUser || "superadmin";
  loadOverview();
}

// ══════════════════════════════════════════════
//  API HELPER  (with offline fallback)
// ══════════════════════════════════════════════
async function apiFetch(method, path, body) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Super-Admin-Token": saToken,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Simple hash for offline credential storage ──
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ── Seed default super-admin credentials if not set ──
(function seedDefaultCredentials() {
  const creds = JSON.parse(localStorage.getItem("lime_sa_creds") || "{}");
  if (!creds.superadmin) {
    // Pre-hash of "admin1234" — default offline password
    hashPassword("admin1234").then(hash => {
      creds.superadmin = hash;
      localStorage.setItem("lime_sa_creds", JSON.stringify(creds));
    });
  }
})();

// ══════════════════════════════════════════════
//  LOGIN  (tries API first, falls back to local)
// ══════════════════════════════════════════════
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  setLoginLoading(true);
  loginError.classList.add("hidden");
  try {
    const data = await apiFetch("POST", "/auth/login", { username, password });
    if (data.role === "superadmin") {
      saToken = data.token;
      saUser  = data.username;
      sessionStorage.setItem("sa_token", saToken);
      sessionStorage.setItem("sa_user", saUser);
      showDashboard();
    } else if (data.role === "ho" || data.role === "accra") {
      const session = {
        username:  data.username,
        account:   data.account,
        full_name: data.full_name,
        region:    data.account === "ho" ? "Ho" : "Accra",
      };
      sessionStorage.setItem("admin_session", JSON.stringify(session));
      window.location.href = "/admin/yourlimadash.html";
    }
  } catch (err) {
    if (err.message === "Failed to fetch") {
      loginError.textContent = "Could not connect to the backend server. Please run start.bat to start the server.";
    } else {
      loginError.textContent = err.message;
    }
    loginError.classList.remove("hidden");
  } finally {
    setLoginLoading(false);
  }
});

function setLoginLoading(on) {
  loginBtn.disabled = on;
  loginBtnText.classList.toggle("hidden", on);
  loginSpinner.classList.toggle("hidden", !on);
}

// ── Logout ──
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await apiFetch("POST", "/superadmin/logout").catch(() => {});
  clearSession();
  showLogin();
});

function clearSession() {
  saToken = ""; saUser = "";
  sessionStorage.removeItem("sa_token");
  sessionStorage.removeItem("sa_user");
}

// ══════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════
const tabTitles = {
  overview: ["Overview", "All regions combined"],
  ho:       ["Ho Account", "Ho region orders & stats"],
  accra:    ["Accra Account", "Accra region orders & stats"],
  admins:   ["Admin Users", "Manage Ho & Accra admin accounts"],
  activity: ["Activity Log", "All system events across both regions"],

  products: ["Products", "Manage store products"],
  plugins:  ["Plugins", "Manage integrations"],
  templates:["Templates", "Storefront themes"],
  settings: ["Settings", "Global store configuration"],

};

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + tab).classList.add("active");
    document.getElementById("tabTitle").textContent    = tabTitles[tab][0];
    document.getElementById("tabSubtitle").textContent = tabTitles[tab][1];
    if (tab === "ho")       loadRegionOrders("Ho");
    if (tab === "accra")    loadRegionOrders("Accra");
    if (tab === "admins")   loadAdminUsers();
    if (tab === "activity") loadActivityLog();
    if (tab === "overview") loadOverview();
    if (tab === "products") loadAdminProducts();
  });
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  const active = document.querySelector(".nav-item.active");
  if (active) active.click();
});

// ══════════════════════════════════════════════
//  OVERVIEW
// ══════════════════════════════════════════════
async function loadOverview() {
  try {
    const d = await apiFetch("GET", "/dashboard/stats/combined");
    document.getElementById("totalRevenue").textContent   = "GH₵ " + ((d.ho.revenue || 0) + (d.accra.revenue || 0)).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById("totalOrders").textContent    = ((d.ho.orders || 0) + (d.accra.orders || 0)).toLocaleString();
    document.getElementById("totalCustomers").textContent = (d.total_customers || 0).toLocaleString();
    document.getElementById("activeAdmins").textContent   = (d.active_admins || 0);
    renderRegionMini("hoMini",    d.ho,    "Ho");
    renderRegionMini("accraMini", d.accra, "Accra");
  } catch (err) {
    console.error("Overview error:", err);
  }
}

function renderRegionMini(id, data, label) {
  const el = document.getElementById(id);
  const breakdown = data.breakdown || {};
  el.innerHTML = `
    <div class="region-stat">
      <span class="region-stat-label">💰 Revenue</span>
      <span class="region-stat-value">GH₵ ${(data.revenue||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
    </div>
    <div class="region-stat">
      <span class="region-stat-label">📦 Total Orders</span>
      <span class="region-stat-value">${(data.orders||0).toLocaleString()}</span>
    </div>
    <div class="region-stat">
      <span class="region-stat-label">⏳ Pending</span>
      <span class="region-stat-value">${breakdown.Pending||0}</span>
    </div>
    <div class="region-stat">
      <span class="region-stat-label">🛍️ Walk in Sale</span>
      <span class="region-stat-value">${breakdown['Walk in Sale']||0}</span>
    </div>
    <div class="region-stat">
      <span class="region-stat-label">✅ Delivered</span>
      <span class="region-stat-value">${breakdown.Delivered||0}</span>
    </div>
    <div class="region-stat">
      <span class="region-stat-label">❌ Canceled</span>
      <span class="region-stat-value">${breakdown.Canceled||0}</span>
    </div>
  `;
}

// ══════════════════════════════════════════════
//  REGION ORDERS
// ══════════════════════════════════════════════
async function loadRegionOrders(region) {
  const tableId = region === "Ho" ? "hoOrdersTable" : "accraOrdersTable";
  const el = document.getElementById(tableId);
  el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Loading…</div>`;
  try {
    const orders = await apiFetch("GET", `/orders?region=${region}`);
    if (!orders.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No orders found for ${region}</p></div>`;
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr>
          <th>Order ID</th><th>Customer</th><th>Items</th>
          <th>Total</th><th>Status</th><th>Date</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => {
            const customer = o.customer || {};
            const name = [customer.fname, customer.lname].filter(Boolean).join(" ") || "—";
            const items = Array.isArray(o.items) ? o.items.length : "?";
            const date  = o.date ? new Date(o.date).toLocaleDateString() : "—";
            return `<tr>
              <td><code style="font-size:11px;color:var(--muted)">${o.id}</code></td>
              <td>${esc(name)}</td>
              <td>${items} item${items!=1?"s":""}</td>
              <td>GH₵ ${parseFloat(o.total||0).toFixed(2)}</td>
              <td><span class="badge badge-${(o.status||"").toLowerCase().replace(/ /g, '-')}">${o.status||"—"}</span></td>
              <td>${date}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(err.message)}</p></div>`;
  }
}

// ══════════════════════════════════════════════
//  ADMIN USERS
// ══════════════════════════════════════════════
async function loadAdminUsers() {
  const el = document.getElementById("adminUsersTable");
  el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Loading…</div>`;
  try {
    const users = await apiFetch("GET", "/admin-users");
    if (!users.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>No admin users yet. Create one above.</p></div>`;
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr>
          <th>Username</th><th>Full Name</th><th>Account</th>
          <th>Email</th><th>Status</th><th>Last Login</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${users.map(u => {
            const login = u.last_login ? new Date(u.last_login).toLocaleString() : "Never";
            return `<tr>
              <td><strong>${esc(u.username)}</strong></td>
              <td>${esc(u.full_name||"—")}</td>
              <td><span class="badge badge-${u.account}">${u.account.toUpperCase()}</span></td>
              <td>${esc(u.email||"—")}</td>
              <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active?"Active":"Disabled"}</span></td>
              <td style="color:var(--muted);font-size:12px">${login}</td>
              <td>
                <div class="action-btns">
                  <button class="${u.is_active?'btn-danger':'btn-success'} btn-sm"
                    onclick="toggleAdmin(${u.id}, ${u.is_active})">
                    ${u.is_active?"Disable":"Enable"}
                  </button>
                  <button class="btn-sm" onclick="openResetPass(${u.id})">Reset PW</button>
                  <button class="btn-danger btn-sm" onclick="deleteAdmin(${u.id}, '${esc(u.username)}')">Delete</button>
                </div>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(err.message)}</p></div>`;
  }
}

async function toggleAdmin(id, currentStatus) {
  try {
    await apiFetch("PUT", `/admin-users/${id}/toggle`);
    loadAdminUsers();
  } catch (err) { alert("Error: " + err.message); }
}

async function deleteAdmin(id, username) {
  if (!confirm(`Delete admin user "${username}"? This cannot be undone.`)) return;
  try {
    await apiFetch("DELETE", `/admin-users/${id}`);
    loadAdminUsers();
  } catch (err) { alert("Error: " + err.message); }
}

// ── Add Admin Modal ──
const addAdminModal = document.getElementById("addAdminModal");
const addAdminForm  = document.getElementById("addAdminForm");
const addAdminError = document.getElementById("addAdminError");

document.getElementById("openAddAdminBtn").addEventListener("click", () => {
  addAdminModal.classList.remove("hidden");
  addAdminForm.reset();
  addAdminError.classList.add("hidden");
});
document.getElementById("closeAddAdminModal").addEventListener("click", () => addAdminModal.classList.add("hidden"));
document.getElementById("cancelAddAdmin").addEventListener("click",    () => addAdminModal.classList.add("hidden"));

addAdminForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addAdminError.classList.add("hidden");
  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value;
  const confirm  = document.getElementById("newPasswordConfirm").value;
  const account  = document.getElementById("newAccount").value;
  const fullName = document.getElementById("newFullName").value.trim();
  const email    = document.getElementById("newEmail").value.trim();

  if (!username || !password || !account) {
    showModalError(addAdminError, "Username, password, and account are required.");
    return;
  }
  if (password !== confirm) {
    showModalError(addAdminError, "Passwords do not match.");
    return;
  }
  if (password.length < 6) {
    showModalError(addAdminError, "Password must be at least 6 characters.");
    return;
  }
  try {
    await apiFetch("POST", "/admin-users", { username, password, account, full_name: fullName, email });
    addAdminModal.classList.add("hidden");
    loadAdminUsers();
    // Switch to admins tab if not already
    document.querySelector('[data-tab="admins"]').click();
  } catch (err) {
    showModalError(addAdminError, err.message);
  }
});

function showModalError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Reset Password Modal ──
const resetPassModal = document.getElementById("resetPassModal");

function openResetPass(id) {
  document.getElementById("resetUserId").value = id;
  document.getElementById("resetPassword").value = "";
  document.getElementById("resetError").classList.add("hidden");
  resetPassModal.classList.remove("hidden");
}

document.getElementById("closeResetModal").addEventListener("click",  () => resetPassModal.classList.add("hidden"));
document.getElementById("cancelResetModal").addEventListener("click", () => resetPassModal.classList.add("hidden"));

document.getElementById("confirmResetBtn").addEventListener("click", async () => {
  const id  = document.getElementById("resetUserId").value;
  const pw  = document.getElementById("resetPassword").value;
  const err = document.getElementById("resetError");
  if (!pw || pw.length < 6) { showModalError(err, "Min. 6 characters required."); return; }
  try {
    await apiFetch("PUT", `/admin-users/${id}/reset-password`, { password: pw });
    resetPassModal.classList.add("hidden");
    alert("Password updated successfully.");
  } catch (e) { showModalError(err, e.message); }
});

// ══════════════════════════════════════════════
//  ACTIVITY LOG
// ══════════════════════════════════════════════
async function loadActivityLog() {
  const el     = document.getElementById("activityTable");
  const region = document.getElementById("activityFilter").value;
  el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Loading…</div>`;
  try {
    const path = region ? `/activity-log?region=${region}` : "/activity-log";
    const logs = await apiFetch("GET", path);
    if (!logs.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No activity recorded yet.</p></div>`;
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr>
          <th>#</th><th>Region</th><th>Action</th>
          <th>Description</th><th>Actor</th><th>Ref</th><th>Time</th>
        </tr></thead>
        <tbody>
          ${logs.map(l => {
            const time = l.created_at ? new Date(l.created_at).toLocaleString() : "—";
            const regionBadge = l.region
              ? `<span class="badge badge-${l.region}">${l.region.toUpperCase()}</span>`
              : `<span style="color:var(--muted)">Global</span>`;
            return `<tr>
              <td style="color:var(--muted)">${l.id}</td>
              <td>${regionBadge}</td>
              <td><code style="font-size:11px;color:var(--gold)">${esc(l.action_type||"")}</code></td>
              <td>${esc(l.description||"—")}</td>
              <td style="color:var(--muted)">${esc(l.actor||"—")}</td>
              <td style="color:var(--muted);font-size:11px">${esc(l.reference||"—")}</td>
              <td style="color:var(--muted);font-size:12px">${time}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(err.message)}</p></div>`;
  }
}

document.getElementById("activityFilter").addEventListener("change", loadActivityLog);

// ══════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════
function esc(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
boot();

// --- PORTED PRODUCTS LOGIC ---
// 3. Admin Products Logic (LocalStorage sync)
        var defaultProducts = [
            { id: 1, name: "Floral Maxi Dress", price: 280, emoji: "👗", cat: "WOMEN · DRESSES", badge: "NEW" },
            { id: 2, name: "Strappy Heels", price: 220, emoji: "👠", cat: "WOMEN · SHOES", badge: "HOT" },
            { id: 3, name: "Oxford Dress Shirt", price: 190, emoji: "👔", cat: "MEN · TOPS", badge: "NEW" },
            { id: 4, name: "Leather Sneakers", price: 350, emoji: "👟", cat: "MEN · SHOES", badge: "HOT" },
            { id: 5, name: "Knit Sweater", price: 150, emoji: "🧶", cat: "WOMEN · TOPS", badge: "" },
            { id: 6, name: "Denim Jacket", price: 260, emoji: "🧥", cat: "MEN · OUTERWEAR", badge: "" },
            { id: 7, name: "Kids T-Shirt", price: 80, emoji: "👕", cat: "CHILDREN · TOPS", badge: "" },
            { id: 8, name: "School Backpack", price: 120, emoji: "🎒", cat: "CHILDREN · ACCESSORIES", badge: "NEW" }
        ];

        let adminProducts = [];

        async function loadAdminProducts() {
            try {
                const res = await apiFetch("GET", "/products");
                adminProducts = res;
                renderAdminProducts();
            } catch (err) {
                console.error("Failed to load products from API", err);
            }
        }
        
        function calcUnassigned() {
            const total = parseInt(document.getElementById('pStockTotal').value) || 0;
            const ho = parseInt(document.getElementById('pStockHo').value) || 0;
            const accra = parseInt(document.getElementById('pStockAccra').value) || 0;
            const unassigned = total - ho - accra;
            document.getElementById('pStockUnassignedTxt').innerText = unassigned;
            return unassigned;
        }

        function renderAdminProducts() {
            const tbody = document.getElementById('adminProductsTable');
            if(!tbody) return;
            tbody.innerHTML = adminProducts.map(p => {
                const visual = p.images && p.images.length > 0
                    ? `<img src="${p.images[0]}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; border:1px solid var(--border);">`
                    : `<span style="font-size:2rem;">${p.emoji || '🛍️'}</span>`;
                
                return `
                <tr>
                    <td style="padding: 10px 0;">${visual}</td>
                    <td style="font-weight:600;">${p.name}</td>
                    <td style="color:var(--grey2);">${p.category || p.cat || ''}</td>
                    <td style="color:var(--lime); font-weight:700;">GH₵ ${p.price}</td>
                    <td>${p.stock_total || 0}</td>
                    <td style="color:var(--lime);">${p.stock_unassigned || 0}</td>
                    <td>${p.stock_ho || 0}</td>
                    <td>${p.stock_accra || 0}</td>
                    <td>${p.badge ? `<span class="diff-up">${p.badge}</span>` : '—'}</td>
                    <td>
                        <button style="background:transparent; color:var(--error); border:1px solid var(--error); padding:6px 12px; border-radius:6px; cursor:pointer; font-weight: 600;" onclick="deleteProduct(${p.id})">Delete</button>
                    </td>
                </tr>
                `;
            }).join('');
        }

        async function deleteProduct(id) {
            if(!confirm("Delete this product?")) return;
            try {
                await apiFetch("DELETE", `/products/${id}`);
                loadAdminProducts(); // Refresh table
            } catch (err) {
                alert("Failed to delete product");
            }
        }

        let uploadedImages = [];

        async function handleImageSelection(e) {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            for (let file of files) {
                const previewId = 'prev_' + Math.random().toString(36).substr(2, 9);
                const previewDiv = document.createElement('div');
                previewDiv.id = previewId;
                previewDiv.style.cssText = 'position:relative; width:68px; height:68px; border-radius:10px; overflow:hidden; border:1px solid var(--border); background:#1e1e1e; cursor:pointer;';
                previewDiv.title = "Click to remove";

                const img = document.createElement('img');
                img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
                previewDiv.appendChild(img);

                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;';
                overlay.innerHTML = `
                    <svg class="progress-ring" width="36" height="36" style="transform: rotate(-90deg);">
                        <circle class="progress-ring__circle-bg" stroke="rgba(255,255,255,0.2)" stroke-width="3" fill="transparent" r="14" cx="18" cy="18" />
                        <circle class="progress-ring__circle" stroke="#10B981" stroke-dasharray="87.96" stroke-dashoffset="87.96" stroke-width="3" fill="transparent" r="14" cx="18" cy="18" />
                    </svg>
                    <div class="checkmark-icon" style="display:none; position:absolute; bottom:4px; right:4px; width:18px; height:18px; background:#10B981; color:white; border-radius:50%; align-items:center; justify-content:center; font-size:10px; font-weight:bold; border:1.5px solid #1a1a1a;">✓</div>
                `;
                previewDiv.appendChild(overlay);
                document.getElementById('imagePreviewContainer').appendChild(previewDiv);

                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgObj = new Image();
                    imgObj.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = imgObj.width;
                        let height = imgObj.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(imgObj, 0, 0, width, height);
                        const base64 = canvas.toDataURL('image/jpeg', 0.8);

                        img.src = base64;
                        uploadedImages.push({ id: previewId, data: base64 });

                        const circle = overlay.querySelector('.progress-ring__circle');
                        const checkmark = overlay.querySelector('.checkmark-icon');
                        const totalLength = 87.96;
                        
                        let progress = 0;
                        const interval = setInterval(() => {
                            progress += 10;
                            if (progress >= 100) {
                                progress = 100;
                                clearInterval(interval);
                                circle.style.strokeDashoffset = 0;
                                overlay.querySelector('.progress-ring').style.display = 'none';
                                checkmark.style.display = 'flex';
                                overlay.style.background = 'rgba(0,0,0,0.1)';
                            } else {
                                const offset = totalLength - (progress / 100) * totalLength;
                                circle.style.strokeDashoffset = offset;
                            }
                        }, 40);
                    };
                    imgObj.src = event.target.result;
                };
                reader.readAsDataURL(file);

                previewDiv.addEventListener('click', () => {
                    previewDiv.remove();
                    uploadedImages = uploadedImages.filter(img => img.id !== previewId);
                });
            }
            e.target.value = '';
        }

        function openAddProductModal() {
            document.getElementById('addProductModal').style.display = 'flex';
            uploadedImages = [];
            const container = document.getElementById('imagePreviewContainer');
            if (container) container.innerHTML = '';
        }
        function closeAddProductModal() {
            document.getElementById('addProductModal').style.display = 'none';
            uploadedImages = [];
            const container = document.getElementById('imagePreviewContainer');
            if (container) container.innerHTML = '';
        }

        async function saveNewProduct() {
            const name = document.getElementById('pName').value;
            const cat = document.getElementById('pCat').value;
            const size_type = document.getElementById('pSizeType').value;
            const price = parseFloat(document.getElementById('pPrice').value) || 0;
            const badge = document.getElementById('pBadge').value;
            
            const stock_total = parseInt(document.getElementById('pStockTotal').value) || 0;
            const stock_ho = parseInt(document.getElementById('pStockHo').value) || 0;
            const stock_accra = parseInt(document.getElementById('pStockAccra').value) || 0;
            const stock_unassigned = calcUnassigned();

            if(!name || !cat) return alert("Product name and category are required!");

            const images = uploadedImages.map(img => img.data);
            
            const payload = {
                name, category: cat, cat, price, badge, size_type, images,
                stock_total, stock_ho, stock_accra, stock_unassigned
            };
            
            try {
                await apiFetch("POST", "/products", payload);
                closeAddProductModal();
                loadAdminProducts(); // Refresh table
                
                document.getElementById('pName').value = '';
                document.getElementById('pCat').value = '';
                document.getElementById('pSizeType').value = 'none';
                document.getElementById('pPrice').value = '';
                document.getElementById('pBadge').value = '';
                document.getElementById('pImage').value = '';
                document.getElementById('pStockTotal').value = '';
                document.getElementById('pStockHo').value = '';
                document.getElementById('pStockAccra').value = '';
                document.getElementById('pStockUnassignedTxt').innerText = '0';
            } catch (err) {
                alert("Failed to save product: " + err.message);
                console.error(err);
            }
        }

        
// --- PORTED SETTINGS LOGIC ---
// =============================================
        //  PLUGINS DATA & LOGIC
        // =============================================
        const defaultPlugins = [
            { id:'p1', name:'MTN MoMo Pay', desc:'Accept MTN Mobile Money payments directly on your storefront with instant confirmation.', icon:'💳', cat:'payment', status:'active', version:'2.4.1',
              configFields:[
                {label:'Merchant Name', key:'merchant_name', type:'text', placeholder:'e.g. Lime Fashion Ghana', value:'Lime Fashion Ghana'},
                {label:'MTN MoMo Number', key:'momo_number', type:'tel', placeholder:'e.g. 024 000 0000', value:'024 000 0000'},
                {label:'API Key', key:'api_key', type:'password', placeholder:'Enter your MoMo API key', value:''},
                {label:'Environment', key:'env', type:'select', options:['Sandbox (Testing)','Production (Live)'], value:'Production (Live)'}
              ]},
            { id:'p2', name:'Telecel Cash', desc:'Integrate Telecel Cash payments for seamless mobile checkout across Ghana.', icon:'📱', cat:'payment', status:'inactive', version:'1.8.0',
              configFields:[
                {label:'Merchant Account Name', key:'merchant_name', type:'text', placeholder:'e.g. Lime Fashion', value:''},
                {label:'Telecel Number', key:'telecel_number', type:'tel', placeholder:'e.g. 027 000 0000', value:''},
                {label:'API Secret', key:'api_secret', type:'password', placeholder:'Enter your Telecel API secret', value:''},
                {label:'Auto-confirm Payments', key:'auto_confirm', type:'select', options:['Yes — Auto-confirm','No — Manual review'], value:'Yes — Auto-confirm'}
              ]},
            { id:'p3', name:'WhatsApp Notify', desc:'Send automatic order confirmations and shipping updates via WhatsApp Business API.', icon:'💬', cat:'marketing', status:'active', version:'3.1.0',
              configFields:[
                {label:'WhatsApp Business Number', key:'wa_number', type:'tel', placeholder:'e.g. +233 24 000 0000', value:'+233 24 000 0000'},
                {label:'Meta App ID', key:'app_id', type:'text', placeholder:'Enter your Meta App ID', value:''},
                {label:'Access Token', key:'access_token', type:'password', placeholder:'Enter your permanent access token', value:''},
                {label:'Notify on Order Placed', key:'notify_placed', type:'select', options:['Yes','No'], value:'Yes'},
                {label:'Notify on Walk in Sale', key:'notify_shipped', type:'select', options:['Yes','No'], value:'Yes'}
              ]},
            { id:'p4', name:'Instagram Shop Sync', desc:'Sync your product catalog with Instagram Shopping for social commerce.', icon:'📸', cat:'social', status:'inactive', version:'1.2.4',
              configFields:[
                {label:'Instagram Business Handle', key:'ig_handle', type:'text', placeholder:'e.g. @limefashion.gh', value:''},
                {label:'Meta Catalog ID', key:'catalog_id', type:'text', placeholder:'Enter your product catalog ID', value:''},
                {label:'Sync Frequency', key:'sync_freq', type:'select', options:['Every hour','Every 6 hours','Every 24 hours'], value:'Every 6 hours'}
              ]},
            { id:'p5', name:'Ghana Post Tracker', desc:'Real-time delivery tracking integration with Ghana Post nationwide network.', icon:'📦', cat:'shipping', status:'active', version:'2.0.3',
              configFields:[
                {label:'Ghana Post API Key', key:'gp_api_key', type:'password', placeholder:'Enter your Ghana Post API key', value:''},
                {label:'Sender Name', key:'sender_name', type:'text', placeholder:'e.g. Lime Fashion', value:'Lime Fashion'},
                {label:'Default Service Type', key:'service_type', type:'select', options:['Standard Delivery','Express Delivery','Economy'], value:'Standard Delivery'},
                {label:'Auto-generate Tracking', key:'auto_track', type:'select', options:['Yes','No'], value:'Yes'}
              ]},
            { id:'p6', name:'Google Analytics 4', desc:'Advanced e-commerce analytics with conversion tracking and audience insights.', icon:'📊', cat:'analytics', status:'active', version:'4.2.0',
              configFields:[
                {label:'Measurement ID', key:'ga_id', type:'text', placeholder:'e.g. G-XXXXXXXXXX', value:'G-XXXXXXXXXX'},
                {label:'Enable E-commerce Tracking', key:'ecommerce', type:'select', options:['Yes — Enhanced','Yes — Standard','No'], value:'Yes — Enhanced'},
                {label:'Anonymize IP', key:'anon_ip', type:'select', options:['Yes (GDPR)','No'], value:'Yes (GDPR)'}
              ]},
            { id:'p7', name:'SMS Campaigns', desc:'Bulk SMS marketing campaigns with scheduled sends and delivery reports.', icon:'📣', cat:'marketing', status:'inactive', version:'1.5.2',
              configFields:[
                {label:'SMS Provider API Key', key:'sms_api', type:'password', placeholder:'Enter your SMS provider key', value:''},
                {label:'Sender ID', key:'sender_id', type:'text', placeholder:'e.g. LIMEFASH', value:''},
                {label:'Default Campaign Name', key:'campaign_name', type:'text', placeholder:'e.g. Lime Fashion Promo', value:''},
                {label:'Opt-out Keyword', key:'optout_keyword', type:'text', placeholder:'e.g. STOP', value:'STOP'}
              ]},
            { id:'p8', name:'Paystack Gateway', desc:'Full-featured payment gateway supporting cards, bank transfers, and USSD payments.', icon:'🏦', cat:'payment', status:'inactive', version:'3.0.1',
              configFields:[
                {label:'Public Key', key:'ps_public', type:'text', placeholder:'pk_live_...', value:''},
                {label:'Secret Key', key:'ps_secret', type:'password', placeholder:'sk_live_...', value:''},
                {label:'Currency', key:'currency', type:'select', options:['GHS — Ghana Cedi','USD — US Dollar','NGN — Naira'], value:'GHS — Ghana Cedi'},
                {label:'Environment', key:'ps_env', type:'select', options:['Live','Test'], value:'Live'}
              ]},
            { id:'p9', name:'TikTok Pixel', desc:'Track conversions and retarget customers from TikTok ad campaigns.', icon:'🎵', cat:'social', status:'inactive', version:'1.0.8',
              configFields:[
                {label:'Pixel ID', key:'tt_pixel_id', type:'text', placeholder:'e.g. C8A1B2C3D4E5F6G7', value:''},
                {label:'Access Token', key:'tt_token', type:'password', placeholder:'Enter your TikTok access token', value:''},
                {label:'Track Add to Cart', key:'track_cart', type:'select', options:['Yes','No'], value:'Yes'},
                {label:'Track Purchases', key:'track_purchase', type:'select', options:['Yes','No'], value:'Yes'}
              ]},
            { id:'p10', name:'Bolt Delivery', desc:'On-demand same-day courier service integration for local deliveries.', icon:'🚀', cat:'shipping', status:'inactive', version:'2.1.0',
              configFields:[
                {label:'Bolt Business API Key', key:'bolt_api', type:'password', placeholder:'Enter your Bolt for Business key', value:''},
                {label:'Pickup Address', key:'pickup_address', type:'text', placeholder:'e.g. 12 Independence Ave, Accra', value:''},
                {label:'Max Delivery Radius (km)', key:'radius', type:'text', placeholder:'e.g. 20', value:'20'},
                {label:'Delivery Fee Policy', key:'fee_policy', type:'select', options:['Store covers fee','Customer pays fee','Split 50/50'], value:'Customer pays fee'}
              ]},
            { id:'p11', name:'Hotjar Heatmaps', desc:'Visualize user behavior with heatmaps, session recordings, and surveys.', icon:'🔥', cat:'analytics', status:'inactive', version:'1.4.5',
              configFields:[
                {label:'Hotjar Site ID', key:'hj_id', type:'text', placeholder:'e.g. 1234567', value:''},
                {label:'Record Sessions', key:'record', type:'select', options:['Yes — All visitors','Yes — 50% sample','No'], value:'Yes — 50% sample'},
                {label:'Enable Heatmaps', key:'heatmaps', type:'select', options:['Yes','No'], value:'Yes'}
              ]},
            { id:'p12', name:'Facebook Pixel', desc:'Track customer journeys and optimize Facebook & Instagram ad performance.', icon:'🌐', cat:'social', status:'active', version:'2.7.3',
              configFields:[
                {label:'Pixel ID', key:'fb_pixel_id', type:'text', placeholder:'e.g. 123456789012345', value:'123456789012345'},
                {label:'Access Token (Conversions API)', key:'fb_token', type:'password', placeholder:'Enter your CAPI access token', value:''},
                {label:'Track ViewContent', key:'track_view', type:'select', options:['Yes','No'], value:'Yes'},
                {label:'Track Add to Cart', key:'track_cart', type:'select', options:['Yes','No'], value:'Yes'},
                {label:'Track Purchases', key:'track_purchase', type:'select', options:['Yes','No'], value:'Yes'}
              ]},
            { id:'p13', name:'ExpressPay Gateway', desc:'Integrate ExpressPay Ghana to accept visa/mastercard and all mobile money networks in one checkout.', icon:'💳', cat:'payment', status:'inactive', version:'1.0.0',
              configFields:[
                {label:'Merchant ID', key:'exp_merchant_id', type:'text', placeholder:'Enter your ExpressPay Merchant ID', value:''},
                {label:'API Key', key:'exp_api_key', type:'password', placeholder:'Enter your ExpressPay API key', value:''},
                {label:'Environment', key:'exp_env', type:'select', options:['Sandbox (Testing)','Production (Live)'], value:'Production (Live)'}
              ]},
            { id:'p14', name:'Hubtel Pay', desc:'Accept payments via Hubtel API. Supports MTN MoMo, Telecel Cash, AT Money, and cards.', icon:'🔌', cat:'payment', status:'inactive', version:'2.0.1',
              configFields:[
                {label:'Merchant Account Number', key:'hubtel_acc', type:'text', placeholder:'e.g. HM123456', value:''},
                {label:'Client ID', key:'hubtel_client_id', type:'text', placeholder:'Enter Hubtel Client ID', value:''},
                {label:'Client Secret', key:'hubtel_client_secret', type:'password', placeholder:'Enter Hubtel Client Secret', value:''},
                {label:'Environment', key:'hubtel_env', type:'select', options:['Sandbox (Testing)','Production (Live)'], value:'Production (Live)'}
              ]},
            { id:'p15', name:'Slydepay Integration', desc:'Accept payments on your storefront via Slydepay by Stanbic Bank Ghana.', icon:'📈', cat:'payment', status:'inactive', version:'1.3.0',
              configFields:[
                {label:'Merchant Email', key:'slydepay_email', type:'text', placeholder:'e.g. finance@brand.com', value:''},
                {label:'API Secret Key', key:'slydepay_secret', type:'password', placeholder:'Enter Slydepay API secret key', value:''},
                {label:'Order Description prefix', key:'slydepay_desc', type:'text', placeholder:'e.g. Lime Fashion Order', value:'Lime Fashion Order'}
              ]}
        ];

        let pluginsData = JSON.parse(localStorage.getItem('lime_plugins'));
        if (!pluginsData) {
            pluginsData = defaultPlugins;
            localStorage.setItem('lime_plugins', JSON.stringify(pluginsData));
        } else {
            // Merge any missing default plugins
            defaultPlugins.forEach(dp => {
                const exists = pluginsData.find(p => p.id === dp.id);
                if (!exists) {
                    pluginsData.push(dp);
                }
            });
            localStorage.setItem('lime_plugins', JSON.stringify(pluginsData));
        }

        function renderPlugins(filter = 'all', search = '') {
            const grid = document.getElementById('pluginsGrid');
            if(!grid) return;
            let list = pluginsData;
            if(filter !== 'all') list = list.filter(p => p.cat === filter);
            if(search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

            grid.innerHTML = list.map(p => {
                const isActive = p.status === 'active';
                return `
                <div class="panel plugin-card" data-cat="${p.cat}" style="padding:24px; transition:var(--transition); cursor:default; border-color:${isActive ? 'var(--lime-border)' : 'var(--border)'}; position:relative; overflow:hidden;">
                    ${isActive ? '<div style="position:absolute; top:0; left:0; right:0; height:3px; background:var(--lime);"></div>' : ''}
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <div style="width:48px; height:48px; background:${isActive ? 'var(--lime-muted)' : 'var(--dark3)'}; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">${p.icon}</div>
                            <div>
                                <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:2px;">${p.name}</h4>
                                <span style="font-size:0.75rem; color:var(--grey);">v${p.version}</span>
                            </div>
                        </div>
                        <label style="position:relative; width:44px; height:24px; cursor:pointer;">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="togglePlugin('${p.id}')" style="opacity:0; width:0; height:0;">
                            <span style="position:absolute; inset:0; background:${isActive ? 'var(--lime)' : 'var(--dark4)'}; border-radius:12px; transition:0.3s;"></span>
                            <span style="position:absolute; top:3px; ${isActive ? 'left:23px' : 'left:3px'}; width:18px; height:18px; background:${isActive ? 'var(--black)' : 'var(--grey)'}; border-radius:50%; transition:0.3s;"></span>
                        </label>
                    </div>
                    <p style="color:var(--grey2); font-size:0.88rem; line-height:1.5; margin-bottom:18px;">${p.desc}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; color:${isActive ? 'var(--lime)' : 'var(--grey)'}; font-weight:600;">${isActive ? '● Active' : '○ Inactive'}</span>
                        <button onclick="openPluginConfig('${p.id}')" style="background:var(--dark3); color:var(--white); border:1px solid var(--border); padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600; font-family:var(--font-body); transition:var(--transition);" onmouseover="this.style.borderColor='var(--lime)'" onmouseout="this.style.borderColor='var(--border)'">⚙ Configure</button>
                    </div>
                </div>`;
            }).join('');
        }

        let currentPluginFilter = 'all';
        function filterPluginCat(cat, btn) {
            currentPluginFilter = cat;
            document.querySelectorAll('.plugin-filter').forEach(b => {
                b.style.background = 'var(--dark2)'; b.style.color = 'var(--grey2)'; b.style.border = '1px solid var(--border)';
            });
            btn.style.background = 'var(--lime)'; btn.style.color = 'var(--black)'; btn.style.border = 'none';
            renderPlugins(cat);
        }
        function filterPlugins(val) { renderPlugins(currentPluginFilter, val); }

        function togglePlugin(id) {
            const p = pluginsData.find(x => x.id === id);
            if(p) { 
                p.status = p.status === 'active' ? 'inactive' : 'active'; 
                localStorage.setItem('lime_plugins', JSON.stringify(pluginsData));
            }
            renderPlugins(currentPluginFilter);
        }

        // --- Plugin Configure Modal ---
        let currentConfigPluginId = null;

        function openPluginConfig(id) {
            const p = pluginsData.find(x => x.id === id);
            if(!p) return;
            currentConfigPluginId = id;

            document.getElementById('pluginConfigIcon').innerText = p.icon;
            document.getElementById('pluginConfigName').innerText = p.name;
            document.getElementById('pluginConfigVersion').innerText = 'Version ' + p.version + ' · ' + p.cat.charAt(0).toUpperCase() + p.cat.slice(1);
            document.getElementById('pluginConfigDesc').innerText = p.desc;

            // Render fields
            const fieldsEl = document.getElementById('pluginConfigFields');
            fieldsEl.innerHTML = p.configFields.map(f => {
                const inputStyle = 'width:100%; padding:11px 14px; background:var(--dark3); color:var(--white); border:1px solid var(--border); border-radius:10px; font-family:var(--font-body); font-size:0.95rem; outline:none; transition:border-color 0.2s;';
                let inputHtml = '';
                if(f.type === 'select') {
                    inputHtml = `<select id="pcf_${f.key}" style="${inputStyle} cursor:pointer;" onfocus="this.style.borderColor='var(--lime)'" onblur="this.style.borderColor='var(--border)'">${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
                } else {
                    inputHtml = `<input id="pcf_${f.key}" type="${f.type}" value="${f.value}" placeholder="${f.placeholder}" style="${inputStyle}" onfocus="this.style.borderColor='var(--lime)'" onblur="this.style.borderColor='var(--border)'">`;
                }
                return `<div><label style="display:block; font-size:0.8rem; color:var(--grey2); margin-bottom:7px; font-weight:600; text-transform:uppercase; letter-spacing:0.4px;">${f.label}</label>${inputHtml}</div>`;
            }).join('');

            document.getElementById('pluginConfigModal').style.display = 'flex';
        }

        function closePluginConfig() {
            document.getElementById('pluginConfigModal').style.display = 'none';
            currentConfigPluginId = null;
        }

        function savePluginConfig() {
            const p = pluginsData.find(x => x.id === currentConfigPluginId);
            if(!p) return;
            p.configFields.forEach(f => {
                const el = document.getElementById('pcf_' + f.key);
                if(el) f.value = el.value;
            });
            localStorage.setItem('lime_plugins', JSON.stringify(pluginsData));
            closePluginConfig();
            // Show a brief success toast
            const toast = document.createElement('div');
            toast.innerText = '✓ ' + p.name + ' settings saved!';
            toast.style.cssText = 'position:fixed; bottom:30px; right:30px; background:var(--dark2); color:var(--lime); border:1px solid var(--lime-border); border-radius:12px; padding:14px 22px; font-weight:600; z-index:9999; box-shadow:0 8px 30px rgba(0,0,0,0.5); animation:fadeIn 0.3s ease;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // Close modal on backdrop click
        document.getElementById('pluginConfigModal').addEventListener('click', function(e) {
            if(e.target === this) closePluginConfig();
        });

        // =============================================
        //  TEMPLATES DATA & LOGIC
        // =============================================
        const templatesData = [
            { id:'t1', name:'Midnight Luxe', desc:'Dark premium theme with lime accents. Ideal for high-end fashion brands.', cat:'fashion', preview:'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)', accent:'#C5F135', active:true },
            { id:'t2', name:'Clean Slate', desc:'Ultra-minimal white theme with sharp typography and generous white space.', cat:'minimal', preview:'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)', accent:'#212529', active:false },
            { id:'t3', name:'Neon Runway', desc:'Bold neon gradients with energetic animations. Perfect for streetwear.', cat:'bold', preview:'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', accent:'#ff006e', active:false },
            { id:'t4', name:'Sahara Gold', desc:'Warm earth tones with golden accents. Elegant and timeless aesthetic.', cat:'fashion', preview:'linear-gradient(135deg, #1a1a0a 0%, #2d2b1f 50%, #3d3b2f 100%)', accent:'#d4a574', active:false },
            { id:'t5', name:'Arctic Frost', desc:'Cool blue-white minimalism with frosted glass effects and subtle animations.', cat:'minimal', preview:'linear-gradient(135deg, #e8f4f8 0%, #d1ecf1 50%, #bee5eb 100%)', accent:'#0077b6', active:false },
            { id:'t6', name:'Blaze', desc:'Fiery red-orange theme with aggressive typography. For bold brands that demand attention.', cat:'bold', preview:'linear-gradient(135deg, #1a0000 0%, #3d0000 50%, #5c1010 100%)', accent:'#ff4500', active:false },
            { id:'t7', name:'Ivory Couture', desc:'Soft cream palette with serif elegance. Designed for luxury boutique aesthetics.', cat:'fashion', preview:'linear-gradient(135deg, #faf8f0 0%, #f5f0e1 50%, #ebe5d5 100%)', accent:'#8b7355', active:false },
            { id:'t8', name:'Cyber Pulse', desc:'Futuristic cyberpunk-inspired design with glitch effects and vivid purples.', cat:'bold', preview:'linear-gradient(135deg, #0d001a 0%, #1a0033 50%, #2d004d 100%)', accent:'#bf00ff', active:false }
        ];

        function renderTemplates(filter = 'all') {
            const grid = document.getElementById('templatesGrid');
            if(!grid) return;
            let list = templatesData;
            if(filter !== 'all') list = list.filter(t => t.cat === filter);

            grid.innerHTML = list.map(t => `
                <div class="panel" style="padding:0; overflow:hidden; transition:var(--transition); border-color:${t.active ? 'var(--lime-border)' : 'var(--border)'}; position:relative;">
                    ${t.active ? '<div style="position:absolute; top:14px; right:14px; z-index:2;"><span class="status-pill status-delivered" style="font-size:0.7rem; padding:4px 10px;">ACTIVE</span></div>' : ''}
                    <!-- Preview Area (clickable) -->
                    <div style="height:180px; background:${t.preview}; position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="previewTemplate('${t.id}')" title="Click to preview">
                        <div style="text-align:center;">
                            <div style="font-family:var(--font-display); font-size:1.6rem; font-weight:900; color:${t.accent}; letter-spacing:1px; text-shadow:0 2px 20px rgba(0,0,0,0.5);">Lime.</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); margin-top:4px; letter-spacing:3px; text-transform:uppercase;">Fashion</div>
                        </div>
                        <div style="position:absolute; inset:0; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.35)'" onmouseout="this.style.background='rgba(0,0,0,0)'">
                            <span style="color:white; font-weight:700; font-size:0.85rem; opacity:0; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">👁 Preview</span>
                        </div>
                    </div>
                    <!-- Info Area -->
                    <div style="padding:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <h4 style="font-size:1.1rem; font-weight:700;">${t.name}</h4>
                            <div style="width:18px; height:18px; border-radius:50%; background:${t.accent}; border:2px solid var(--border);"></div>
                        </div>
                        <p style="color:var(--grey2); font-size:0.85rem; line-height:1.5; margin-bottom:18px;">${t.desc}</p>
                        <div style="display:flex; gap:10px;">
                            ${t.active 
                                ? '<button style="flex:1; background:var(--dark3); color:var(--grey2); border:1px solid var(--border); padding:10px; border-radius:var(--radius-pill); font-weight:600; cursor:default; font-family:var(--font-body);">Currently Active</button><button style="flex:0.5; background:var(--dark3); color:white; border:1px solid var(--lime-border); border-radius:var(--radius-pill); font-weight:600; cursor:pointer; font-family:var(--font-body); transition:var(--transition);" onclick="previewTemplate(\'' + t.id + '\')" onmouseover="this.style.borderColor=\'var(--lime)\'" onmouseout="this.style.borderColor=\'var(--lime-border)\'">Preview</button>'
                                : '<button class="btn-lime" style="flex:1; padding:10px; font-size:0.9rem;" onclick="activateTemplate(\'' + t.id + '\')">Activate</button><button style="flex:0.5; background:var(--dark3); color:white; border:1px solid var(--border); border-radius:var(--radius-pill); font-weight:600; cursor:pointer; font-family:var(--font-body); transition:var(--transition);" onclick="previewTemplate(\'' + t.id + '\')" onmouseover="this.style.borderColor=\'var(--lime)\'" onmouseout="this.style.borderColor=\'var(--border)\'">Preview</button>'
                            }
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function filterTemplateCat(cat, btn) {
            document.querySelectorAll('.template-filter').forEach(b => {
                b.style.background = 'var(--dark2)'; b.style.color = 'var(--grey2)'; b.style.border = '1px solid var(--border)';
            });
            btn.style.background = 'var(--lime)'; btn.style.color = 'var(--black)'; btn.style.border = 'none';
            renderTemplates(cat);
        }

        function activateTemplate(id) {
            templatesData.forEach(t => t.active = (t.id === id));
            renderTemplates();

            // Update the active banner at the top of the Templates tab
            const active = templatesData.find(t => t.active);
            if(active) {
                const banner = document.querySelector('#tab-templates .panel:first-of-type h3');
                if(banner) banner.innerText = active.name;
                const bannerSub = document.querySelector('#tab-templates .panel:first-of-type p');
                if(bannerSub) bannerSub.innerText = 'Currently active · ' + active.desc.split('.')[0];
            }

            // ✅ Persist selection so mainpage.html can apply it
            localStorage.setItem('lime_active_template', JSON.stringify({
                id: active.id,
                name: active.name,
                accent: active.accent,
                preview: active.preview
            }));

            // ✅ Persist in settings database table
            apiFetch("POST", "/settings", { active_template: id }).catch(err => {
                console.error("Failed to sync template to DB settings:", err);
            });

            // Show toast
            const toast = document.createElement('div');
            toast.innerHTML = '✓ <strong>' + active.name + '</strong> is now the active template!';
            toast.style.cssText = 'position:fixed; bottom:30px; right:30px; background:var(--dark2); color:var(--lime); border:1px solid var(--lime-border); border-radius:12px; padding:14px 22px; font-weight:600; z-index:9999; box-shadow:0 8px 30px rgba(0,0,0,0.5); animation:fadeIn 0.3s ease;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // Preview modal
        function previewTemplate(id) {
            const t = templatesData.find(x => x.id === id);
            if(!t) return;

            // Create overlay
            const overlay = document.createElement('div');
            overlay.id = 'templatePreviewOverlay';
            overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(8px); animation:fadeIn 0.3s ease;';
            overlay.innerHTML = `
                <div style="width:900px; max-width:95%; max-height:90vh; overflow:hidden; border-radius:16px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 30px 100px rgba(0,0,0,0.8); display:flex; flex-direction:column;">
                    <!-- Preview header bar -->
                    <div style="background:#1a1a1a; padding:12px 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.07);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="display:flex; gap:6px;">
                                <div style="width:12px; height:12px; background:#ff5f57; border-radius:50%;"></div>
                                <div style="width:12px; height:12px; background:#ffbd2e; border-radius:50%;"></div>
                                <div style="width:12px; height:12px; background:#28c840; border-radius:50%;"></div>
                            </div>
                            <span style="color:#888; font-size:0.8rem;">Preview — ${t.name}</span>
                        </div>
                        <button onclick="document.getElementById('templatePreviewOverlay').remove()" style="background:transparent; border:none; color:#888; font-size:1.6rem; cursor:pointer; line-height:1;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#888'">&times;</button>
                    </div>
                    <!-- Simulated store page -->
                    <div style="flex:1; overflow-y:auto; background:${t.preview};">
                        <!-- Simulated Navbar -->
                        <div style="padding:18px 5%; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(0,0,0,0.3); backdrop-filter:blur(10px);">
                            <div style="font-family:'Playfair Display',serif; font-size:1.5rem; font-weight:900; color:${t.accent};">Lime<span style="color:${t.accent};">.</span>Fashion</div>
                            <div style="display:flex; gap:20px;">
                                <span style="color:rgba(255,255,255,0.6); font-size:0.9rem;">Home</span>
                                <span style="color:rgba(255,255,255,0.6); font-size:0.9rem;">Shop</span>
                                <span style="color:rgba(255,255,255,0.6); font-size:0.9rem;">Women</span>
                                <span style="color:rgba(255,255,255,0.6); font-size:0.9rem;">Men</span>
                            </div>
                            <div style="background:${t.accent}; color:#000; padding:8px 20px; border-radius:999px; font-weight:700; font-size:0.9rem;">🛍 Cart (0)</div>
                        </div>
                        <!-- Hero -->
                        <div style="padding:60px 5%; display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:center;">
                            <div>
                                <div style="display:inline-block; border:1px solid ${t.accent}40; color:${t.accent}; padding:5px 14px; border-radius:999px; font-size:0.75rem; font-weight:700; letter-spacing:0.05em; margin-bottom:25px;">✦ NEW COLLECTION 2025</div>
                                <div style="font-family:'Playfair Display',serif; font-size:3.5rem; font-weight:900; color:white; line-height:1; margin-bottom:20px;">Style That<br><em style="color:${t.accent};">Speaks</em><br>For You</div>
                                <p style="color:rgba(255,255,255,0.55); line-height:1.7; margin-bottom:30px; max-width:400px;">Discover premium fashion for men, women and children.</p>
                                <div style="display:flex; gap:12px;">
                                    <div style="background:${t.accent}; color:#000; padding:12px 28px; border-radius:999px; font-weight:700; font-size:0.9rem;">Shop Now →</div>
                                    <div style="border:1px solid rgba(255,255,255,0.2); color:white; padding:12px 28px; border-radius:999px; font-size:0.9rem;">Browse Categories</div>
                                </div>
                            </div>
                            <div style="display:flex; gap:16px; justify-content:center;">
                                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; width:160px;">
                                    <div style="font-size:3.5rem; text-align:center; margin:15px 0;">👗</div>
                                    <div style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-transform:uppercase;">WOMEN'S</div>
                                    <div style="color:white; font-weight:600; font-size:0.9rem;">Floral Maxi Dress</div>
                                    <div style="color:${t.accent}; font-weight:800; margin-top:5px;">GH₵ 280</div>
                                </div>
                                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; width:160px; margin-top:40px;">
                                    <div style="font-size:3.5rem; text-align:center; margin:15px 0;">👟</div>
                                    <div style="color:rgba(255,255,255,0.5); font-size:0.7rem; text-transform:uppercase;">MEN'S</div>
                                    <div style="color:white; font-weight:600; font-size:0.9rem;">Leather Sneakers</div>
                                    <div style="color:${t.accent}; font-weight:800; margin-top:5px;">GH₵ 350</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Action bar -->
                    <div style="background:#111; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.07);">
                        <span style="color:#888; font-size:0.85rem;">Preview of <strong style="color:white;">${t.name}</strong></span>
                        <div style="display:flex; gap:10px;">
                            <button onclick="document.getElementById('templatePreviewOverlay').remove()" style="background:transparent; color:white; border:1px solid rgba(255,255,255,0.2); padding:9px 20px; border-radius:999px; font-weight:600; cursor:pointer; font-family:var(--font-body);">Close</button>
                            ${t.active ? '<span style="color:var(--lime); font-weight:600; font-size:0.9rem;">✓ Already Active</span>' : '<button onclick="document.getElementById(\'templatePreviewOverlay\').remove(); activateTemplate(\'' + t.id + '\');" style="background:' + t.accent + '; color:#000; border:none; padding:9px 24px; border-radius:999px; font-weight:700; cursor:pointer; font-family:var(--font-body);">Activate This Template</button>'}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
        }

        // Initialize Plugins & Templates on load
        async function initPluginsTemplates() {
            // Load from localStorage first for immediate display
            const saved = localStorage.getItem('lime_active_template');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.id) {
                        templatesData.forEach(t => t.active = (t.id === parsed.id));
                    }
                } catch(e) {}
            }
            renderPlugins();
            renderTemplates();

            // Update active banner on templates tab
            const active = templatesData.find(t => t.active);
            if(active) {
                const banner = document.querySelector('#tab-templates .panel:first-of-type h3');
                if(banner) banner.innerText = active.name;
                const bannerSub = document.querySelector('#tab-templates .panel:first-of-type p');
                if(bannerSub) bannerSub.innerText = 'Currently active · ' + active.desc.split('.')[0];
            }

            // Sync from backend /api/settings as well
            try {
                const settings = await apiFetch("GET", "/settings");
                if (settings && settings.active_template) {
                    let tplId = settings.active_template;
                    if (tplId === 'midnight-luxe') tplId = 't1';
                    templatesData.forEach(t => t.active = (t.id === tplId));
                    renderTemplates();
                    
                    const activeDb = templatesData.find(t => t.active);
                    if (activeDb) {
                        const banner = document.querySelector('#tab-templates .panel:first-of-type h3');
                        if(banner) banner.innerText = activeDb.name;
                        const bannerSub = document.querySelector('#tab-templates .panel:first-of-type p');
                        if(bannerSub) bannerSub.innerText = 'Currently active · ' + activeDb.desc.split('.')[0];
                        
                        // Sync back to localstorage
                        localStorage.setItem('lime_active_template', JSON.stringify({
                            id: activeDb.id,
                            name: activeDb.name,
                            accent: activeDb.accent,
                            preview: activeDb.preview
                        }));
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch settings from DB:", err);
            }
        }


        
setTimeout(() => { if(typeof loadAdminProducts === 'function') loadAdminProducts(); if(typeof initPluginsTemplates === 'function') initPluginsTemplates(); }, 500);


function showSettingsSection(id, btn) {
    document.querySelectorAll('.s-pill').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.s-section').forEach(s => s.style.display = 'none');
    btn.classList.add('active');
    document.getElementById('ss-' + id).style.display = 'block';
}

// ─── Helper: read a field value safely ───
function gv(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function gc(id) { const el = document.getElementById(id); return el ? el.checked : false; }

// ─── Load saved settings into the form fields ───
async function loadSavedSettings() {
    try {
        const res = await apiFetch('GET', '/settings');

      if (!res.store_settings) return;

        const s = res.store_settings;

        // General
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.checked = val; };

        setVal('cfg_store_name', s.store_name);
        setVal('cfg_tagline', s.tagline);
        setVal('cfg_email', s.email);
        setVal('cfg_phone', s.phone);
        setVal('cfg_whatsapp', s.whatsapp);
        setVal('cfg_currency', s.currency);
        setVal('cfg_city', s.city);
        setVal('cfg_country', s.country);
        setVal('cfg_tz', s.timezone);
        setVal('cfg_datefmt', s.date_format);

        // Brand
        if (s.accent) {
            const accentEl = document.getElementById('cfg_accent');
            if (accentEl) { accentEl.value = s.accent; }
            const hexEl = document.getElementById('accentHex');
            if (hexEl) hexEl.innerText = s.accent;
        }
        setVal('cfg_secondary', s.secondary_color);
        setVal('cfg_font', s.body_font);
        setVal('cfg_hfont', s.heading_font);
        setVal('cfg_hero_h', s.hero_headline);
        setVal('cfg_hero_sub', s.hero_subtext);
        setVal('cfg_per_page', s.products_per_page);
        setVal('cfg_featured', s.featured_count);
        setChk('cfg_marquee', s.show_marquee);
        setChk('cfg_wa_bubble', s.show_wa_bubble);

        // Delivery
        setVal('cfg_std_fee', s.std_fee);
        setVal('cfg_exp_fee', s.exp_fee);
        setVal('cfg_free_thresh', s.free_thresh);
        setVal('cfg_eta_accra', s.eta_accra);
        setVal('cfg_eta_other', s.eta_other);
        setVal('cfg_hub', s.hub);
        setVal('cfg_wh_accra', s.wh_accra);
        setVal('cfg_wh_ho', s.wh_ho);
        setChk('cfg_cod', s.cod);
        setChk('cfg_pickup', s.pickup);
        setChk('cfg_tracker', s.tracker);

        // Orders
        setVal('cfg_min_order', s.min_order);
        setVal('cfg_max_items', s.max_items);
        setVal('cfg_auto_cancel', s.auto_cancel);
        setChk('cfg_allow_cancel', s.allow_cancel);
        setChk('cfg_auto_assign', s.auto_assign);
        setChk('cfg_phone_req', s.phone_req);
        setVal('cfg_ret_window', s.ret_window);
        setVal('cfg_ref_days', s.ref_days);
        setVal('cfg_ref_method', s.ref_method);
        setChk('cfg_sale_ret', s.sale_ret);
        setChk('cfg_ret_photo', s.ret_photo);
        setVal('cfg_vat', s.vat);
        setVal('cfg_tax_disp', s.tax_display);

        // Social
        setVal('cfg_ig', s.instagram);
        setVal('cfg_fb', s.facebook);
        setVal('cfg_tt', s.tiktok);
        setVal('cfg_tw', s.twitter);
        setVal('cfg_pin', s.pinterest);
        setVal('cfg_yt', s.youtube);
        setChk('cfg_share_btn', s.share_btn);
        setChk('cfg_wa_widget', s.wa_widget);
        setVal('cfg_wa_msg', s.wa_msg);
        setChk('cfg_ig_feed', s.ig_feed);
        setVal('cfg_og_img', s.og_img);

        // SEO
        setVal('cfg_meta_title', s.meta_title);
        setVal('cfg_meta_desc', s.meta_desc);
        setVal('cfg_ga_id', s.ga_id);

        // Security
        setVal('cfg_admin_timeout', s.admin_timeout);
        setChk('cfg_2fa', s.twofa);
        setChk('cfg_audit', s.audit_log);

    } catch(e) { console.warn('loadSavedSettings error:', e); }
}

// ─── Collect every setting and persist ───
function saveAllSettings() {
    const settings = {
        // General
        store_name:    gv('cfg_store_name'),
        tagline:       gv('cfg_tagline'),
        email:         gv('cfg_email'),
        phone:         gv('cfg_phone'),
        whatsapp:      gv('cfg_whatsapp'),
        currency:      gv('cfg_currency'),
        city:          gv('cfg_city'),
        country:       gv('cfg_country'),
        timezone:      gv('cfg_tz'),
        date_format:   gv('cfg_datefmt'),

        // Brand
        accent:           gv('cfg_accent'),
        secondary_color:  gv('cfg_secondary'),
        body_font:        gv('cfg_font'),
        heading_font:     gv('cfg_hfont'),
        hero_headline:    gv('cfg_hero_h'),
        hero_subtext:     gv('cfg_hero_sub'),
        products_per_page: gv('cfg_per_page'),
        featured_count:   gv('cfg_featured'),
        show_marquee:     gc('cfg_marquee'),
        show_wa_bubble:   gc('cfg_wa_bubble'),

        // Delivery
        std_fee:     gv('cfg_std_fee'),
        exp_fee:     gv('cfg_exp_fee'),
        free_thresh: gv('cfg_free_thresh'),
        eta_accra:   gv('cfg_eta_accra'),
        eta_other:   gv('cfg_eta_other'),
        hub:         gv('cfg_hub'),
        wh_accra:    gv('cfg_wh_accra'),
        wh_ho:       gv('cfg_wh_ho'),
        cod:         gc('cfg_cod'),
        pickup:      gc('cfg_pickup'),
        tracker:     gc('cfg_tracker'),

        // Orders
        min_order:    gv('cfg_min_order'),
        max_items:    gv('cfg_max_items'),
        auto_cancel:  gv('cfg_auto_cancel'),
        allow_cancel: gc('cfg_allow_cancel'),
        auto_assign:  gc('cfg_auto_assign'),
        phone_req:    gc('cfg_phone_req'),
        ret_window:   gv('cfg_ret_window'),
        ref_days:     gv('cfg_ref_days'),
        ref_method:   gv('cfg_ref_method'),
        sale_ret:     gc('cfg_sale_ret'),
        ret_photo:    gc('cfg_ret_photo'),
        vat:          gv('cfg_vat'),
        tax_display:  gv('cfg_tax_disp'),

        // Social
        instagram: gv('cfg_ig'),
        facebook:  gv('cfg_fb'),
        tiktok:    gv('cfg_tt'),
        twitter:   gv('cfg_tw'),
        pinterest: gv('cfg_pin'),
        youtube:   gv('cfg_yt'),
        share_btn: gc('cfg_share_btn'),
        wa_widget: gc('cfg_wa_widget'),
        wa_msg:    gv('cfg_wa_msg'),
        ig_feed:   gc('cfg_ig_feed'),
        og_img:    gv('cfg_og_img'),

        // SEO
        meta_title: gv('cfg_meta_title'),
        meta_desc:  gv('cfg_meta_desc'),
        ga_id:      gv('cfg_ga_id'),

        // Security
        admin_timeout: gv('cfg_admin_timeout'),
        twofa:      gc('cfg_2fa'),
        audit_log:  gc('cfg_audit'),
    };

    // Persist to localStorage so mainpage.html picks it up immediately
    localStorage.setItem('lime_store_settings', JSON.stringify(settings));

    // Also try to persist to backend
   await apiFetch('POST', '/settings', {
    store_settings: settings
});

await loadSavedSettings();.catch(err => {
        console.warn('Could not sync settings to DB:', err);
    });

    // Show a premium toast notification
    const toast = document.createElement('div');
    toast.innerHTML = '✓ <strong>All settings saved</strong> — changes are live on the storefront';
    toast.style.cssText = 'position:fixed; bottom:30px; right:30px; background:var(--dark2); color:var(--lime); border:1px solid var(--lime-border); border-left:4px solid var(--lime); border-radius:12px; padding:16px 24px; font-weight:600; z-index:9999; box-shadow:0 8px 30px rgba(0,0,0,0.5); animation:fadeIn 0.3s ease; max-width:380px; line-height:1.5;';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; }, 3000);
    setTimeout(() => toast.remove(), 3500);
}

// Load settings into form when settings tab is clicked
document.querySelector('[data-tab="settings"]').addEventListener('click', () => {
    setTimeout(loadSavedSettings, 50);
});

// Also load immediately in case settings tab is already shown on boot
loadSavedSettings();

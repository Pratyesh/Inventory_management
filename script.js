/* ============================================
   InventorySys — script.js  v3.0
   Pure JS / HTML / CSS — no dependencies
   ============================================ */

// ── Theme ─────────────────────────────────────
(function initTheme() {
  const t = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

// ── Toast ─────────────────────────────────────
function toast(msg, type = 'success') {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toastWrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':type==='error'?'❌':type==='warn'?'⚠️':'ℹ️'}</span> ${msg}`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

// ── Auth ─────────────────────────────────────
const USERS = [
  { username: 'admin',  password: '1234', role: 'admin' },
  { username: 'staff',  password: 'staff123', role: 'staff' }
];

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const error    = document.getElementById('error');
  const user     = USERS.find(u => u.username === username && u.password === password);

  if (user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    const btn = document.querySelector('.login-card button');
    btn.textContent = 'Signing in…'; btn.style.opacity = '0.7';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } else {
    error.innerHTML = '⚠ Invalid username or password';
    error.style.animation = 'none';
    requestAnimationFrame(() => { error.style.animation = ''; });
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
  }
}

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem('currentUser')) || { username: 'admin', role: 'admin' };
}

function isAdmin() { return getCurrentUser().role === 'admin'; }

function showUserBadge() {
  const el = document.getElementById('userBadge');
  if (!el) return;
  const u = getCurrentUser();
  el.textContent = `${u.role === 'admin' ? '👑' : '👤'} ${u.username}`;
}

// ── Storage ───────────────────────────────────
function getItems() {
  const items = JSON.parse(localStorage.getItem('inventory')) || [];
  let repaired = false;
  items.forEach(item => {
    if (item.id === undefined || item.id === null) {
      item.id = Date.now() + Math.floor(Math.random() * 1000000);
      repaired = true;
    }
  });
  if (repaired) saveItems(items);
  return items;
}
function saveItems(d)  { localStorage.setItem('inventory',   JSON.stringify(d)); }
function getLogs()     { return JSON.parse(localStorage.getItem('borrowLogs'))  || []; }
function saveLogs(d)   { localStorage.setItem('borrowLogs',  JSON.stringify(d)); }
function getAudit()    { return JSON.parse(localStorage.getItem('auditLog'))    || []; }
function saveAudit(d)  { localStorage.setItem('auditLog',    JSON.stringify(d)); }

function auditLog(action, detail) {
  const logs = getAudit();
  logs.unshift({ action, detail, user: getCurrentUser().username, time: new Date().toISOString() });
  if (logs.length > 200) logs.length = 200;
  saveAudit(logs);
}

// ── Categories ────────────────────────────────
const CATEGORIES = ['All', 'Lab', 'Sports', 'AV', 'Furniture', 'IT', 'Other'];

// ── Add item ──────────────────────────────────
function addItem() {
  const name       = document.getElementById('itemName').value.trim();
  const location   = document.getElementById('itemLocation').value.trim();
  const status     = document.getElementById('itemStatus').value;
  const category   = document.getElementById('itemCategory').value;
  const quantity   = parseInt(document.getElementById('itemQuantity').value) || 1;
  const condition  = document.getElementById('itemCondition').value;
  const threshold  = parseInt(document.getElementById('itemThreshold').value) || 1;
  const imageInput = document.getElementById('itemImage');

  if (!name || !location) { shake(document.getElementById('itemName')); toast('Please fill in name and location.','error'); return; }

  const file = imageInput.files[0];
  if (!file) { toast('Please select an image.','error'); return; }

  const btn = document.querySelector('.inv-top .card button');
  btn.textContent = 'Adding…'; btn.style.opacity = '0.7';

  const reader = new FileReader();
  reader.onload = function(e) {
    const items = getItems();
    const newItem = {
      id: Date.now(), name, location, status, category, condition,
      quantity, available: quantity, threshold,
      image: e.target.result, time: Date.now()
    };
    items.unshift(newItem);
    saveItems(items);
    auditLog('ADD', `Added "${name}" (qty:${quantity}, cat:${category})`);
    displayItems();
    clearAddForm(btn);
    toast(`"${name}" added successfully!`);
  };
  reader.readAsDataURL(file);
}

function clearAddForm(btn) {
  ['itemName','itemLocation','itemImage'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('itemQuantity').value  = 1;
  document.getElementById('itemThreshold').value = 1;
  if (btn) { btn.textContent = '+ Add Equipment'; btn.style.opacity = '1'; }
}

// ── Display / sort / filter ───────────────────
let sortCol = 'name', sortDir = 1, filterCat = 'All', filterStatus = 'All';

function displayItems() {
  let items = getItems();
  const tbody = document.getElementById('inventoryBody');
  const empty = document.getElementById('emptyState');
  if (!tbody) return;

  // Filter
  if (filterCat !== 'All')    items = items.filter(i => i.category === filterCat);
  if (filterStatus !== 'All') items = items.filter(i => i.status   === filterStatus);

  const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
  if (query) items = items.filter(i => (i.name+i.location+i.category).toLowerCase().includes(query));

  // Sort
  items.sort((a,b) => {
    let av = a[sortCol]||'', bv = b[sortCol]||'';
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  tbody.innerHTML = '';

  if (items.length === 0) { if(empty) empty.style.display='block'; updateSearchCount(0,0); return; }
  if (empty) empty.style.display = 'none';

  items.forEach((item, index) => {
    const tr  = document.createElement('tr');
    tr.style.animationDelay = `${index*0.03}s`;
    const available  = item.available !== undefined ? item.available : (item.quantity || 1);
    const quantity    = item.quantity !== undefined ? item.quantity : 1;
    const threshold   = item.threshold !== undefined ? item.threshold : 1;
    const activelog  = getActiveBorrow(item.id);
    const lowStock   = available <= threshold && available > 0;
    const outOfStock = available === 0;
    const condClass  = { 'Good':'cond-good','Damaged':'cond-damaged','Under Repair':'cond-repair' }[item.condition]||'';
    const borrowInfo = activelog ? `<div class="borrow-mini">👤 ${activelog.student} · due ${fmtDate(activelog.returnDate)}</div>` : '';
    const lowBadge   = lowStock   ? `<span class="badge-low">⚠ Low Stock</span>` : '';
    const outBadge   = outOfStock ? `<span class="badge-out">Out of Stock</span>` : '';
    const canBorrow  = available > 0;
    const canEdit    = isAdmin();

    tr.innerHTML = `
      <td><img src="${item.image}" class="item-image" alt="${item.name}"></td>
      <td>
        <strong>${item.name}</strong>
        <div class="item-meta">${item.category || 'Uncategorised'}</div>
        ${borrowInfo}${lowBadge}${outBadge}
      </td>
      <td style="color:rgba(var(--text-rgb),0.6)">${item.location}</td>
      <td>
        <div class="qty-display">
          <span class="qty-avail">${available}</span>
          <span class="qty-sep">/</span>
          <span class="qty-total">${quantity}</span>
        </div>
        <div style="font-size:11px;color:rgba(var(--text-rgb),0.4);margin-top:2px">available</div>
      </td>
      <td><span class="cond-badge ${condClass}">${item.condition||'Good'}</span></td>
      <td>
        <span class="status-badge ${item.status==='Available'?'status-available':'status-lost'}">
          ${item.status}
        </span>
      </td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        ${canBorrow ? `<button class="action-btn borrow-btn" onclick="openBorrowModal(${index})">Borrow</button>` : ''}
        ${activelog  ? `<button class="action-btn return-btn" onclick="returnItem(${item.id})">Return</button>` : ''}
        ${canEdit    ? `<button class="action-btn edit-btn" onclick="openEditModal(${item.id})">Edit</button>` : ''}
        <button class="delete-btn" onclick="confirmDelete(${item.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateSearchCount(items.length, getItems().length);
  updateSortHeaders();
  checkOverdueAlert();
}

function updateSearchCount(visible, total) {
  const el = document.getElementById('searchCount');
  if (el) el.textContent = total===0 ? '' : `Showing ${visible} of ${total} items`;
}

function setSort(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
  displayItems();
}

function updateSortHeaders() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.sort === sortCol) th.classList.add(sortDir===1?'sort-asc':'sort-desc');
  });
}

function setCatFilter(cat) {
  filterCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat===cat));
  displayItems();
}

function setStatusFilter(status) {
  filterStatus = status;
  displayItems();
}

function searchItem() { displayItems(); }

// ── Delete with PIN confirm ───────────────────
function confirmDelete(itemId) {
  const pin = prompt('Enter admin PIN to delete (default: 9999):');
  if (pin === null) return;
  if (pin !== '9999') { toast('Incorrect PIN. Deletion cancelled.','error'); return; }
  const items = getItems();
  const idx   = items.findIndex(i => i.id == itemId);
  if (idx === -1) return;
  const name = items[idx].name;
  items.splice(idx, 1);
  saveItems(items);
  auditLog('DELETE', `Deleted "${name}"`);
  displayItems();
  toast(`"${name}" removed.`, 'warn');
}

// ── Edit modal ────────────────────────────────
function openEditModal(itemId) {
  const item = getItems().find(i => i.id == itemId);
  if (!item) return;
  document.getElementById('editItemId').value       = itemId;
  document.getElementById('editName').value         = item.name;
  document.getElementById('editLocation').value     = item.location;
  document.getElementById('editCategory').value     = item.category || 'Other';
  document.getElementById('editCondition').value    = item.condition || 'Good';
  document.getElementById('editQuantity').value     = item.quantity || 1;
  document.getElementById('editThreshold').value    = item.threshold || 1;
  document.getElementById('editStatus').value       = item.status;
  document.getElementById('editError').textContent  = '';
  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() { document.getElementById('editModal').classList.remove('open'); }

function saveEdit() {
  const id        = document.getElementById('editItemId').value;
  const name      = document.getElementById('editName').value.trim();
  const location  = document.getElementById('editLocation').value.trim();
  const category  = document.getElementById('editCategory').value;
  const condition = document.getElementById('editCondition').value;
  const quantity  = parseInt(document.getElementById('editQuantity').value) || 1;
  const threshold = parseInt(document.getElementById('editThreshold').value) || 1;
  const status    = document.getElementById('editStatus').value;
  const err       = document.getElementById('editError');

  if (!name || !location) { err.textContent = '⚠ Name and location are required.'; return; }

  const items = getItems();
  const idx   = items.findIndex(i => i.id == id);
  if (idx === -1) return;

  const diff = quantity - (items[idx].quantity || 1);
  items[idx] = { ...items[idx], name, location, category, condition, quantity, threshold, status,
                 available: Math.max(0, (items[idx].available||items[idx].quantity||1) + diff) };
  saveItems(items);
  auditLog('EDIT', `Edited "${name}"`);
  closeEditModal();
  displayItems();
  toast(`"${name}" updated.`);
}

// ── Borrow modal ──────────────────────────────
function openBorrowModal(visibleIndex) {
  // visibleIndex is position in current filtered/sorted list — re-resolve
  let items = getFilteredItems();
  const item = items[visibleIndex];
  if (!item) return;
  const available = item.available !== undefined ? item.available : (item.quantity || 1);

  document.getElementById('borrowItemId').value     = item.id;
  document.getElementById('borrowStudent').value    = '';
  document.getElementById('borrowStudentId').value  = '';
  document.getElementById('borrowTime').value       = '';
  document.getElementById('borrowQty').value        = 1;
  document.getElementById('borrowQty').max          = available;
  document.getElementById('borrowQtyMax').textContent = `max ${available}`;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  document.getElementById('borrowReturnDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('modalError').textContent = '';
  document.getElementById('borrowModal').classList.add('open');
  document.getElementById('borrowStudent').focus();
}

function getFilteredItems() {
  let items = getItems();
  if (filterCat !== 'All')    items = items.filter(i => i.category === filterCat);
  if (filterStatus !== 'All') items = items.filter(i => i.status   === filterStatus);
  const query = (document.getElementById('searchInput')?.value||'').toLowerCase();
  if (query) items = items.filter(i=>(i.name+i.location+i.category).toLowerCase().includes(query));
  items.sort((a,b)=>{ let av=a[sortCol]||'',bv=b[sortCol]||'';
    if(typeof av==='string'){av=av.toLowerCase();bv=bv.toLowerCase();}
    return av<bv?-sortDir:av>bv?sortDir:0; });
  return items;
}

function closeBorrowModal() { document.getElementById('borrowModal').classList.remove('open'); }

function confirmBorrow() {
  const itemId     = document.getElementById('borrowItemId').value;
  const student    = document.getElementById('borrowStudent').value.trim();
  const studentId  = document.getElementById('borrowStudentId').value.trim();
  const time       = document.getElementById('borrowTime').value.trim();
  const returnDate = document.getElementById('borrowReturnDate').value;
  const qty        = parseInt(document.getElementById('borrowQty').value) || 1;
  const err        = document.getElementById('modalError');

  if (!student)    { err.textContent = '⚠ Enter the student name.';   return; }
  if (!studentId)  { err.textContent = '⚠ Enter student ID / roll no.'; return; }
  if (!time)       { err.textContent = '⚠ Enter the time taken.';      return; }
  if (!returnDate) { err.textContent = '⚠ Select a return date.';      return; }

  // Borrow limit: max 3 active borrows per student
  const active = getLogs().filter(l => !l.returned && l.studentId === studentId);
  if (active.length >= 3) { err.textContent = '⚠ This student already has 3 active borrows (limit reached).'; return; }

  const items = getItems();
  const idx   = items.findIndex(i => i.id == itemId);
  if (idx === -1) return;

  items[idx].available = Math.max(0, (items[idx].available||0) - qty);
  if (items[idx].available === 0) items[idx].status = 'Lost';
  saveItems(items);

  const logs = getLogs();
  logs.unshift({
    id: Date.now(), itemId: items[idx].id, itemName: items[idx].name,
    location: items[idx].location, student, studentId, timeTaken: time,
    quantity: qty, borrowDate: new Date().toISOString(), returnDate, returned: false
  });
  saveLogs(logs);
  auditLog('BORROW', `"${items[idx].name}" borrowed by ${student} (${studentId}), qty:${qty}, due:${returnDate}`);

  closeBorrowModal();
  displayItems();
  toast(`"${items[idx].name}" checked out to ${student}.`);
}

// ── Return ────────────────────────────────────
function returnItem(itemId) {
  const log = getLogs().find(l => l.itemId == itemId && !l.returned);
  if (!log) return;
  if (!confirm(`Mark "${log.itemName}" as returned by ${log.student}?`)) return;
  doReturn(log.id);
}

function returnByLogId(logId) {
  const log = getLogs().find(l => l.id == logId);
  if (!log || log.returned) return;
  if (!confirm(`Mark "${log.itemName}" borrowed by ${log.student} as returned?`)) return;
  doReturn(logId);
}

function doReturn(logId) {
  const logs   = getLogs();
  const logIdx = logs.findIndex(l => l.id == logId);
  if (logIdx === -1) return;
  const log = logs[logIdx];
  logs[logIdx] = { ...log, returned: true, returnedOn: new Date().toISOString() };
  saveLogs(logs);

  const items = getItems();
  const iIdx  = items.findIndex(i => i.id == log.itemId);
  if (iIdx > -1) {
    items[iIdx].available = Math.min(items[iIdx].quantity, (items[iIdx].available||0) + (log.quantity||1));
    if (items[iIdx].available > 0) items[iIdx].status = 'Available';
    saveItems(items);
  }
  auditLog('RETURN', `"${log.itemName}" returned by ${log.student}`);

  if (typeof loadTracking === 'function') loadTracking();
  else displayItems();
  toast(`"${log.itemName}" returned successfully.`);
}

// ── Overdue alert ─────────────────────────────
function checkOverdueAlert() {
  const overdue = getLogs().filter(l => !l.returned && new Date(l.returnDate) < new Date());
  const banner  = document.getElementById('overdueBanner');
  if (!banner) return;
  if (overdue.length > 0) {
    banner.innerHTML = `⏰ <strong>${overdue.length} item${overdue.length>1?'s are':' is'} overdue!</strong> <a href="tracking.html" style="color:#ffb020;text-decoration:underline">View in Tracking →</a>`;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ── Tracking ──────────────────────────────────
function loadTracking() {
  renderActiveLoans();
  renderHistory();
  loadTrackingDashboard();
}

function renderActiveLoans() {
  const logs   = getLogs();
  let active   = logs.filter(l => !l.returned);

  const sq = (document.getElementById('trackSearch')?.value||'').toLowerCase();
  if (sq) active = active.filter(l => (l.itemName+l.student+l.studentId).toLowerCase().includes(sq));

  const tbody = document.getElementById('activeBody');
  const empty = document.getElementById('activeEmpty');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (active.length === 0) { if(empty) empty.style.display='block'; return; }
  if (empty) empty.style.display = 'none';

  const today = new Date(); today.setHours(0,0,0,0);

  active.forEach((log, i) => {
    const due      = new Date(log.returnDate);
    const overdue  = due < today;
    const daysLeft = Math.ceil((due - today)/86400000);
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i*0.04}s`;
    tr.innerHTML = `
      <td><strong>${log.itemName}</strong></td>
      <td>${log.student}<div class="item-meta">${log.studentId||''}</div></td>
      <td>${log.quantity||1}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${log.timeTaken}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDateTime(log.borrowDate)}</td>
      <td>
        <span class="status-badge ${overdue?'status-lost':'status-available'}">
          ${overdue?`Overdue ${Math.abs(daysLeft)}d`:daysLeft===0?'Due today':`${daysLeft}d left`}
        </span>
        <div style="font-size:11px;color:rgba(var(--text-rgb),0.4);margin-top:3px">${fmtDate(log.returnDate)}</div>
      </td>
      <td><button class="action-btn return-btn" onclick="returnByLogId(${log.id})">Return</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHistory() {
  const logs = getLogs();
  let returned = logs.filter(l => l.returned);

  const sq = (document.getElementById('trackSearch')?.value||'').toLowerCase();
  if (sq) returned = returned.filter(l=>(l.itemName+l.student+l.studentId).toLowerCase().includes(sq));

  const tbody = document.getElementById('historyBody');
  const empty = document.getElementById('historyEmpty');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (returned.length === 0) { if(empty) empty.style.display='block'; return; }
  if (empty) empty.style.display = 'none';

  returned.forEach((log,i) => {
    const onTime = new Date(log.returnedOn) <= new Date(log.returnDate);
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i*0.03}s`;
    tr.innerHTML = `
      <td><strong>${log.itemName}</strong></td>
      <td>${log.student}<div class="item-meta">${log.studentId||''}</div></td>
      <td>${log.quantity||1}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDateTime(log.borrowDate)}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDate(log.returnDate)}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDateTime(log.returnedOn)}</td>
      <td><span class="status-badge ${onTime?'status-available':'status-lost'}">${onTime?'On time':'Late'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function searchTracking() { renderActiveLoans(); renderHistory(); }

function loadTrackingDashboard() {
  const logs    = getLogs();
  const active  = logs.filter(l => !l.returned);
  const today   = new Date(); today.setHours(0,0,0,0);
  const overdue = active.filter(l => new Date(l.returnDate) < today);
  animateCount('trackActive',  active.length,  700);
  animateCount('trackOverdue', overdue.length, 800);
  animateCount('trackTotal',   logs.length,    900);
}

// Student history
function loadStudentHistory() {
  const name   = (document.getElementById('studentSearch')?.value||'').toLowerCase().trim();
  const tbody  = document.getElementById('studentHistoryBody');
  const stats  = document.getElementById('studentStats');
  if (!tbody || !name) return;

  const logs = getLogs().filter(l => l.student.toLowerCase().includes(name) || (l.studentId||'').toLowerCase().includes(name));
  tbody.innerHTML = '';

  if (stats) {
    const onTime  = logs.filter(l=>l.returned && new Date(l.returnedOn)<=new Date(l.returnDate)).length;
    const late    = logs.filter(l=>l.returned && new Date(l.returnedOn)>new Date(l.returnDate)).length;
    const active  = logs.filter(l=>!l.returned).length;
    stats.innerHTML = `
      <div class="student-stat"><span>${logs.length}</span>Total Borrows</div>
      <div class="student-stat"><span style="color:#2ee6a8">${onTime}</span>On Time</div>
      <div class="student-stat"><span style="color:#ff5d7a">${late}</span>Late</div>
      <div class="student-stat"><span style="color:#ffb020">${active}</span>Active</div>
    `;
  }

  if (logs.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(var(--text-rgb),0.4);padding:20px">No records found</td></tr>'; return; }

  logs.forEach((log,i) => {
    const onTime = log.returned ? new Date(log.returnedOn)<=new Date(log.returnDate) : null;
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i*0.03}s`;
    tr.innerHTML = `
      <td><strong>${log.itemName}</strong></td>
      <td>${log.student} <div class="item-meta">${log.studentId||''}</div></td>
      <td>${log.quantity||1}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDateTime(log.borrowDate)}</td>
      <td style="color:rgba(var(--text-rgb),0.6)">${fmtDate(log.returnDate)}</td>
      <td>${log.returned
        ? `<span class="status-badge ${onTime?'status-available':'status-lost'}">${onTime?'Returned on time':'Returned late'}</span>`
        : `<span class="status-badge status-lost">Active</span>`}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Audit log ─────────────────────────────────
function loadAuditLog() {
  const logs  = getAudit();
  const tbody = document.getElementById('auditBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(var(--text-rgb),0.4);padding:20px">No actions logged yet</td></tr>';
    return;
  }

  logs.forEach((log,i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i*0.02}s`;
    const iconMap = { ADD:'➕', DELETE:'🗑️', EDIT:'✏️', BORROW:'📤', RETURN:'📥' };
    tr.innerHTML = `
      <td>${iconMap[log.action]||'•'} <strong>${log.action}</strong></td>
      <td>${log.detail}</td>
      <td>${log.user}</td>
      <td style="color:rgba(var(--text-rgb),0.5)">${fmtDateTime(log.time)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Dashboard ─────────────────────────────────
function loadDashboard() {
  showUserBadge();
  const items    = getItems();
  const total    = items.length;
  const avail    = items.filter(i=>i.status==='Available').length;
  const lost     = items.filter(i=>i.status==='Lost').length;
  const logs     = getLogs();
  const today    = new Date(); today.setHours(0,0,0,0);
  const overdue  = logs.filter(l=>!l.returned && new Date(l.returnDate)<today).length;

  animateCount('totalItems',     total,   800);
  animateCount('availableItems', avail,   900);
  animateCount('lostItems',      lost,    1000);
  animateCount('overdueItems',   overdue, 1100);

  setTimeout(() => {
    setBar('totalBar',   total>0?100:0);
    setBar('availBar',   total>0?Math.round((avail/total)*100):0);
    setBar('lostBar',    total>0?Math.round((lost/total)*100):0);
    setBar('overdueBar', total>0?Math.round((overdue/total)*100):0);
  }, 300);

  updateDonut(total, avail, lost);
  setText('legendTotal', total);
  setText('legendAvail', avail);
  setText('legendLost',  lost);
  setText('donutCenter', total);
  renderRecentDash(items, logs);
  checkOverdueAlert();

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = localStorage.getItem('theme')==='light'?'🌙':'☀️';
}

function renderRecentDash(items, logs) {
  const container = document.getElementById('recentList');
  if (!container) return;

  const recentLogs = logs.slice(0,6);
  if (recentLogs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No activity yet. <a href="inventory.html" style="color:#1de9d4">Add equipment →</a></p></div>`;
    return;
  }

  container.innerHTML = '<div class="activity-list"></div>';
  const list = container.querySelector('.activity-list');
  recentLogs.forEach((log,i) => {
    const div = document.createElement('div');
    div.className = 'activity-item fade-up';
    div.style.animationDelay = `${0.3+i*0.06}s`;
    div.innerHTML = `
      <div class="activity-dot ${log.returned?'add':'delete'}">${log.returned?'📥':'📤'}</div>
      <div>
        <div class="activity-name">${log.itemName}</div>
        <div class="activity-meta">👤 ${log.student} · ${log.studentId||''}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <span class="activity-badge ${log.returned?'available':'lost'}">${log.returned?'Returned':'Borrowed'}</span>
        <div class="activity-meta" style="margin-top:3px">due ${fmtDate(log.returnDate)}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

// ── Helpers ───────────────────────────────────
function getActiveBorrow(itemId) {
  return getLogs().find(l => l.itemId == itemId && !l.returned) || null;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' ' +
         d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}

function animateCount(id, target, dur) {
  const el = document.getElementById(id); if(!el) return;
  const s  = performance.now();
  (function step(now) {
    const t = Math.min((now-s)/dur,1), e = 1-Math.pow(1-t,3);
    el.textContent = Math.round(e*target);
    if (t<1) requestAnimationFrame(step);
  })(performance.now());
}

function setBar(id,pct)  { const e=document.getElementById(id); if(e) e.style.width=pct+'%'; }
function setText(id,val) { const e=document.getElementById(id); if(e) e.textContent=val; }

function updateDonut(total, avail, lost) {
  const circ=2*Math.PI*50, da=document.getElementById('donutAvail'), dl=document.getElementById('donutLost');
  if (!da||!dl||total===0) return;
  setTimeout(() => {
    da.setAttribute('stroke-dasharray', `${(avail/total)*circ} ${circ}`);
    dl.setAttribute('stroke-dasharray',  `${(lost/total)*circ} ${circ}`);
    dl.setAttribute('stroke-dashoffset', `${-(avail/total)*circ}`);
  }, 400);
}

function shake(el) {
  el.style.borderColor='#ff5d7a'; el.style.animation='none';
  requestAnimationFrame(()=>{ el.style.animation='shake 0.4s ease'; });
  setTimeout(()=>{ el.style.borderColor=''; el.style.animation=''; }, 600);
}

// Close modals on backdrop click
document.addEventListener('click', e => {
  ['borrowModal','editModal'].forEach(id => {
    const m = document.getElementById(id);
    if (m && e.target === m) m.classList.remove('open');
  });
});
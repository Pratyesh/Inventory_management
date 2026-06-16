/* ============================================
   InventorySys — script.js
   Pure JS / HTML / CSS only
   ============================================ */

// ── Auth ─────────────────────────────────────

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const error    = document.getElementById('error');

  if (username === 'admin' && password === '1234') {
    const btn = document.querySelector('button');
    btn.textContent = 'Signing in…';
    btn.style.opacity = '0.7';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
  } else {
    error.innerHTML = '⚠ Invalid username or password';
    error.style.animation = 'none';
    requestAnimationFrame(() => { error.style.animation = ''; });
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
  }
}

// ── Storage helpers ───────────────────────────

function getItems()   { return JSON.parse(localStorage.getItem('inventory'))  || []; }
function saveItems(d) { localStorage.setItem('inventory',  JSON.stringify(d)); }
function getLogs()    { return JSON.parse(localStorage.getItem('borrowLogs')) || []; }
function saveLogs(d)  { localStorage.setItem('borrowLogs', JSON.stringify(d)); }

// ── Add item ──────────────────────────────────

function addItem() {
  const name       = document.getElementById('itemName').value.trim();
  const location   = document.getElementById('itemLocation').value.trim();
  const status     = document.getElementById('itemStatus').value;
  const imageInput = document.getElementById('itemImage');
  const btn        = document.querySelector('.inv-top .card button');

  if (!name || !location) { shake(document.getElementById('itemName')); return; }

  const file = imageInput.files[0];
  if (!file) { alert('Please select an image.'); return; }

  btn.textContent = 'Adding…';
  btn.style.opacity = '0.7';

  const reader = new FileReader();
  reader.onload = function(e) {
    const items = getItems();
    items.unshift({
      id: Date.now(),
      name, location, status,
      image: e.target.result,
      time: Date.now()
    });
    saveItems(items);
    displayItems();
    document.getElementById('itemName').value     = '';
    document.getElementById('itemLocation').value = '';
    document.getElementById('itemImage').value    = '';
    btn.textContent = '+ Add Equipment';
    btn.style.opacity = '1';
  };
  reader.readAsDataURL(file);
}

// ── Display items ─────────────────────────────

function displayItems() {
  const items = getItems();
  const tbody = document.getElementById('inventoryBody');
  const empty = document.getElementById('emptyState');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (items.length === 0) {
    if (empty) empty.style.display = 'block';
    updateSearchCount(0, 0);
    return;
  }
  if (empty) empty.style.display = 'none';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${index * 0.04}s`;
    const isAvail   = item.status === 'Available';
    const activelog = getActiveBorrow(item.id);
    const borrowInfo = activelog
      ? `<div class="borrow-mini">👤 ${activelog.student} · due ${fmtDate(activelog.returnDate)}</div>`
      : '';

    tr.innerHTML = `
      <td><img src="${item.image}" class="item-image" alt="${item.name}"></td>
      <td>
        <strong>${item.name}</strong>
        ${borrowInfo}
      </td>
      <td style="color:rgba(255,255,255,0.6)">${item.location}</td>
      <td>
        <span class="status-badge ${isAvail ? 'status-available' : 'status-lost'}">
          ${item.status}
        </span>
      </td>
      <td style="display:flex;gap:8px;flex-wrap:wrap">
        ${isAvail
          ? `<button class="action-btn borrow-btn" onclick="openBorrowModal(${index})">Borrow</button>`
          : activelog
            ? `<button class="action-btn return-btn" onclick="returnItem(${index})">Return</button>`
            : ''}
        <button class="delete-btn" onclick="deleteItem(${index})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateSearchCount(items.length, items.length);
}

// ── Delete item ───────────────────────────────

function deleteItem(index) {
  if (!confirm('Remove this item from inventory?')) return;
  const items = getItems();
  items.splice(index, 1);
  saveItems(items);
  displayItems();
}

// ── Search ────────────────────────────────────

function searchItem() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const rows  = document.querySelectorAll('#inventoryBody tr');
  let visible = 0;
  rows.forEach(row => {
    const match = row.innerText.toLowerCase().includes(query);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  updateSearchCount(visible, rows.length);
  const empty = document.getElementById('emptyState');
  if (empty) empty.style.display = (visible === 0 && rows.length > 0) ? 'block' : 'none';
}

function updateSearchCount(visible, total) {
  const el = document.getElementById('searchCount');
  if (el) el.textContent = total === 0 ? '' : `Showing ${visible} of ${total} items`;
}

// ── Borrow modal ──────────────────────────────

function openBorrowModal(index) {
  const modal = document.getElementById('borrowModal');
  document.getElementById('borrowItemIndex').value = index;

  // Default return date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('borrowReturnDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('borrowStudent').value    = '';
  document.getElementById('borrowTime').value       = '';
  document.getElementById('modalError').textContent = '';

  modal.classList.add('open');
  document.getElementById('borrowStudent').focus();
}

function closeBorrowModal() {
  document.getElementById('borrowModal').classList.remove('open');
}

function confirmBorrow() {
  const index      = parseInt(document.getElementById('borrowItemIndex').value);
  const student    = document.getElementById('borrowStudent').value.trim();
  const time       = document.getElementById('borrowTime').value.trim();
  const returnDate = document.getElementById('borrowReturnDate').value;
  const err        = document.getElementById('modalError');

  if (!student)    { err.textContent = '⚠ Enter the student name.';   return; }
  if (!time)       { err.textContent = '⚠ Enter the time taken.';      return; }
  if (!returnDate) { err.textContent = '⚠ Select a return date.';      return; }

  const items = getItems();
  const item  = items[index];

  // Change status to Lost (checked-out)
  items[index].status = 'Lost';
  saveItems(items);

  // Log the borrow
  const logs = getLogs();
  logs.unshift({
    id:         Date.now(),
    itemId:     item.id,
    itemName:   item.name,
    location:   item.location,
    student,
    timeTaken:  time,
    borrowDate: new Date().toISOString(),
    returnDate,
    returned:   false
  });
  saveLogs(logs);

  closeBorrowModal();
  displayItems();
}

// ── Return item ───────────────────────────────

function returnItem(index) {
  const items = getItems();
  const item  = items[index];
  if (!confirm(`Mark "${item.name}" as returned?`)) return;

  items[index].status = 'Available';
  saveItems(items);

  // Mark log as returned
  const logs = getLogs();
  const logIdx = logs.findIndex(l => l.itemId === item.id && !l.returned);
  if (logIdx > -1) {
    logs[logIdx].returned    = true;
    logs[logIdx].returnedOn  = new Date().toISOString();
  }
  saveLogs(logs);
  displayItems();
}

// ── Tracking page ─────────────────────────────

function loadTracking() {
  renderActiveLoans();
  renderHistory();
  loadTrackingDashboard();
}

function renderActiveLoans() {
  const logs    = getLogs();
  const active  = logs.filter(l => !l.returned);
  const tbody   = document.getElementById('activeBody');
  const empty   = document.getElementById('activeEmpty');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (active.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const today = new Date(); today.setHours(0,0,0,0);

  active.forEach((log, i) => {
    const due     = new Date(log.returnDate);
    const overdue = due < today;
    const daysLeft = Math.ceil((due - today) / 86400000);

    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td><strong>${log.itemName}</strong></td>
      <td>${log.student}</td>
      <td style="color:rgba(255,255,255,0.6)">${log.timeTaken}</td>
      <td style="color:rgba(255,255,255,0.6)">${fmtDateTime(log.borrowDate)}</td>
      <td>
        <span class="status-badge ${overdue ? 'status-lost' : 'status-available'}">
          ${overdue ? `Overdue ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
        </span>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px">${fmtDate(log.returnDate)}</div>
      </td>
      <td>
        <button class="action-btn return-btn" onclick="returnByLogId(${log.id})">Mark Returned</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderHistory() {
  const logs     = getLogs();
  const returned = logs.filter(l => l.returned);
  const tbody    = document.getElementById('historyBody');
  const empty    = document.getElementById('historyEmpty');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (returned.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  returned.forEach((log, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i * 0.04}s`;
    const onTime = new Date(log.returnedOn) <= new Date(log.returnDate);
    tr.innerHTML = `
      <td><strong>${log.itemName}</strong></td>
      <td>${log.student}</td>
      <td style="color:rgba(255,255,255,0.6)">${fmtDateTime(log.borrowDate)}</td>
      <td style="color:rgba(255,255,255,0.6)">${fmtDate(log.returnDate)}</td>
      <td style="color:rgba(255,255,255,0.6)">${fmtDateTime(log.returnedOn)}</td>
      <td>
        <span class="status-badge ${onTime ? 'status-available' : 'status-lost'}">
          ${onTime ? 'On time' : 'Late'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function returnByLogId(logId) {
  const logs   = getLogs();
  const logIdx = logs.findIndex(l => l.id === logId);
  if (logIdx === -1) return;
  const log = logs[logIdx];
  if (!confirm(`Mark "${log.itemName}" borrowed by ${log.student} as returned?`)) return;

  logs[logIdx].returned   = true;
  logs[logIdx].returnedOn = new Date().toISOString();
  saveLogs(logs);

  // Update item status back to available
  const items = getItems();
  const itemIdx = items.findIndex(i => i.id === log.itemId);
  if (itemIdx > -1) { items[itemIdx].status = 'Available'; saveItems(items); }

  loadTracking();
}

function loadTrackingDashboard() {
  const logs    = getLogs();
  const active  = logs.filter(l => !l.returned);
  const today   = new Date(); today.setHours(0,0,0,0);
  const overdue = active.filter(l => new Date(l.returnDate) < today);

  setText('trackActive',  active.length);
  setText('trackOverdue', overdue.length);
  setText('trackTotal',   logs.length);

  animateCount('trackActive',  active.length,  700);
  animateCount('trackOverdue', overdue.length, 800);
  animateCount('trackTotal',   logs.length,    900);
}

function searchTracking() {
  const query = document.getElementById('trackSearch').value.toLowerCase();
  ['activeBody','historyBody'].forEach(id => {
    const rows = document.querySelectorAll(`#${id} tr`);
    rows.forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

// ── Dashboard ─────────────────────────────────

function loadDashboard() {
  const items     = getItems();
  const total     = items.length;
  const available = items.filter(i => i.status === 'Available').length;
  const lost      = items.filter(i => i.status === 'Lost').length;
  const logs      = getLogs();
  const overdue   = logs.filter(l => !l.returned && new Date(l.returnDate) < new Date()).length;

  animateCount('totalItems',     total,     800);
  animateCount('availableItems', available, 900);
  animateCount('lostItems',      lost,      1000);
  animateCount('overdueItems',   overdue,   1100);

  setTimeout(() => {
    setBar('totalBar', total > 0 ? 100 : 0);
    setBar('availBar', total > 0 ? Math.round((available/total)*100) : 0);
    setBar('lostBar',  total > 0 ? Math.round((lost/total)*100) : 0);
    setBar('overdueBar', total > 0 ? Math.round((overdue/total)*100) : 0);
  }, 300);

  updateDonut(total, available, lost);
  setText('legendTotal', total);
  setText('legendAvail', available);
  setText('legendLost',  lost);
  setText('donutCenter', total);
  renderRecent(items, logs);
}

function renderRecent(items, logs) {
  const container = document.getElementById('recentList');
  if (!container) return;

  if (items.length === 0 && logs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No equipment yet. <a href="inventory.html" style="color:#14b8a6">Add some →</a></p></div>`;
    return;
  }

  // Show recent borrow logs + recent additions mixed
  const recentLogs = logs.slice(0, 5);
  container.innerHTML = '<div class="activity-list"></div>';
  const list = container.querySelector('.activity-list');

  if (recentLogs.length === 0) {
    // fall back to items
    items.slice(0,5).forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'activity-item fade-up';
      div.style.animationDelay = `${0.3 + i*0.07}s`;
      const isAvail = item.status === 'Available';
      div.innerHTML = `
        <div class="activity-dot ${isAvail?'add':'delete'}">${isAvail?'✅':'⚠️'}</div>
        <div class="activity-name">${item.name}</div>
        <div class="activity-meta">${item.location}</div>
        <span class="activity-badge ${isAvail?'available':'lost'}">${item.status}</span>
      `;
      list.appendChild(div);
    });
    return;
  }

  recentLogs.forEach((log, i) => {
    const div = document.createElement('div');
    div.className = 'activity-item fade-up';
    div.style.animationDelay = `${0.3 + i*0.07}s`;
    div.innerHTML = `
      <div class="activity-dot ${log.returned?'add':'delete'}">${log.returned?'✅':'📤'}</div>
      <div>
        <div class="activity-name">${log.itemName}</div>
        <div class="activity-meta">👤 ${log.student}</div>
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
  return getLogs().find(l => l.itemId === itemId && !l.returned) || null;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }) +
         ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

function animateCount(id, target, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1-t, 3)) * target);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateDonut(total, available, lost) {
  const circ  = 2 * Math.PI * 50;
  const dAvail = document.getElementById('donutAvail');
  const dLost  = document.getElementById('donutLost');
  if (!dAvail || !dLost || total === 0) return;
  const availArc = (available/total)*circ;
  const lostArc  = (lost/total)*circ;
  setTimeout(() => {
    dAvail.setAttribute('stroke-dasharray', `${availArc} ${circ}`);
    dLost.setAttribute('stroke-dasharray',  `${lostArc} ${circ}`);
    dLost.setAttribute('stroke-dashoffset', `${-availArc}`);
  }, 400);
}

function shake(el) {
  el.style.borderColor = '#f87171';
  el.style.animation   = 'none';
  requestAnimationFrame(() => { el.style.animation = 'shake 0.4s ease'; });
  setTimeout(() => { el.style.borderColor=''; el.style.animation=''; }, 600);
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  const modal = document.getElementById('borrowModal');
  if (modal && e.target === modal) closeBorrowModal();
});
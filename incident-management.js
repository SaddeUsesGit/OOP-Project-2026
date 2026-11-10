const form = document.getElementById('incidentForm');
const rows = document.getElementById('incidentRows');
const message = document.getElementById('message');

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = await api('/api/auth/me');
    currentUser = auth.user;
    document.getElementById('signedInAs').textContent = `${currentUser.displayName} (${currentUser.role})`;
    document.getElementById('logoutButton').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
    applyRoleInterface();
    if (currentUser.role === 'admin') {
      document.getElementById('userManagement').style.display = 'block';
      document.getElementById('createAccountForm').addEventListener('submit', createAccount);
      loadAccounts();
    }
  } catch (e) { location.href = '/login'; return; }
  loadAll();
  form.addEventListener('submit', saveIncident);
  document.getElementById('cancelButton').addEventListener('click', resetForm);
  document.getElementById('refreshButton').addEventListener('click', loadAll);
  document.getElementById('search').addEventListener('input', loadIncidents);
  document.getElementById('statusFilter').addEventListener('change', loadIncidents);
  document.getElementById('priorityFilter').addEventListener('change', loadIncidents);
});

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadAll() {
  await Promise.all([loadSummary(), loadIncidents()]);
}

async function loadSummary() {
  try {
    const data = await api('/api/incidents/summary/counts');
    document.getElementById('totalCount').textContent = data.total || 0;
    document.getElementById('openCount').textContent = data.open || 0;
    document.getElementById('progressCount').textContent = data.in_progress || 0;
    document.getElementById('resolvedCount').textContent = data.resolved || 0;
    document.getElementById('criticalCount').textContent = data.critical || 0;
  } catch (error) { showMessage(error.message, true); }
}

async function loadIncidents() {
  const params = new URLSearchParams();
  const search = document.getElementById('search').value.trim();
  const status = document.getElementById('statusFilter').value;
  const priority = document.getElementById('priorityFilter').value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);

  try {
    const incidents = await api(`/api/incidents?${params.toString()}`);
    rows.replaceChildren();
    if (!incidents.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 8; td.textContent = 'No incidents found.';
      tr.appendChild(td); rows.appendChild(tr); return;
    }
    incidents.forEach(incident => rows.appendChild(createRow(incident)));
  } catch (error) { showMessage(error.message, true); }
}

function applyRoleInterface() {
  const role = currentUser.role;
  if (role === 'technician') {
    document.getElementById('formHeading').textContent = 'Your assigned incidents';
    document.getElementById('incidentForm').hidden = true;
  } else if (role === 'employee') {
    document.getElementById('formHeading').textContent = 'Report a new incident';
    document.getElementById('reportedBy').value = currentUser.username;
    document.getElementById('reportedBy').readOnly = true;
    document.getElementById('assignedTo').parentElement.hidden = true;
    document.getElementById('status').parentElement.hidden = true;
  }
}

function createRow(item) {
  const tr = document.createElement('tr');
  const values = [
    item.id, item.title, item.priority, item.status,
    item.assigned_to || 'Unassigned', item.reported_by,
    item.updated_at || item.created_at
  ];
  values.forEach((value, index) => {
    const td = document.createElement('td');
    if (index === 2 || index === 3) {
      const badge = document.createElement('span');
      badge.className = `pill ${String(value).replaceAll(' ', '-')}`;
      badge.textContent = value;
      td.appendChild(badge);
    } else {
      td.textContent = value == null ? '' : String(value);
    }
    tr.appendChild(td);
  });

  const actionCell = document.createElement('td');
  const actionWrap = document.createElement('div');
  actionWrap.className = 'row-actions';
  if (currentUser.role === 'admin') {
    const edit = document.createElement('button'); edit.className = 'secondary'; edit.textContent = 'Edit';
    edit.addEventListener('click', () => editIncident(item));
    const remove = document.createElement('button'); remove.className = 'danger'; remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteIncident(item.id));
    actionWrap.append(edit, remove);
  } else if (currentUser.role === 'technician') {
    const status = document.createElement('select');
    ['Open','In Progress','Resolved','Closed'].forEach(value => { const option=document.createElement('option'); option.value=value; option.textContent=value; status.appendChild(option); });
    status.value = item.status;
    const update = document.createElement('button'); update.className='secondary'; update.textContent='Update status';
    update.addEventListener('click', async () => { try { await api(`/api/incidents/${item.id}`, {method:'PUT', body:JSON.stringify({status:status.value})}); showMessage(`Incident #${item.id} updated.`); await loadAll(); } catch(e) { showMessage(e.message,true); } });
    actionWrap.append(status, update);
  } else { actionWrap.textContent = '—'; }
  actionCell.appendChild(actionWrap); tr.appendChild(actionCell);
  return tr;
}

async function saveIncident(event) {
  event.preventDefault();
  const id = document.getElementById('incidentId').value;
  const payload = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    priority: document.getElementById('priority').value,
    status: document.getElementById('status').value,
    reported_by: currentUser.role === 'employee' ? currentUser.username : document.getElementById('reportedBy').value.trim(),
    assigned_to: currentUser.role === 'admin' ? document.getElementById('assignedTo').value.trim() : '',
    description: document.getElementById('description').value.trim()
  };
  try {
    await api(id ? `/api/incidents/${id}` : '/api/incidents', {
      method: id ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    showMessage(id ? 'Incident updated.' : 'Incident created.');
    resetForm(); await loadAll();
  } catch (error) { showMessage(error.message, true); }
}

function editIncident(item) {
  document.getElementById('incidentId').value = item.id;
  document.getElementById('title').value = item.title;
  document.getElementById('category').value = item.category;
  document.getElementById('priority').value = item.priority;
  document.getElementById('status').value = item.status;
  document.getElementById('reportedBy').value = item.reported_by;
  document.getElementById('assignedTo').value = item.assigned_to || '';
  document.getElementById('description').value = item.description;
  document.getElementById('formHeading').textContent = `Edit incident #${item.id}`;
  document.getElementById('saveButton').textContent = 'Save changes';
  document.getElementById('cancelButton').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  document.getElementById('incidentId').value = '';
  document.getElementById('status').value = 'Open';
  document.getElementById('formHeading').textContent = 'Report a new incident';
  document.getElementById('saveButton').textContent = 'Create incident';
  document.getElementById('cancelButton').hidden = true;
}

async function deleteIncident(id) {
  if (!window.confirm(`Delete incident #${id}? This cannot be undone.`)) return;
  try {
    await api(`/api/incidents/${id}`, { method: 'DELETE' });
    showMessage(`Incident #${id} deleted.`);
    await loadAll();
  } catch (error) { showMessage(error.message, true); }
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}


async function loadAccounts() {
  const accountRows = document.getElementById('accountRows');
  try {
    const accounts = await api('/api/admin/accounts');
    accountRows.replaceChildren();
    if (!accounts.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = 6; td.textContent = 'No accounts found.'; tr.appendChild(td); accountRows.appendChild(tr); return;
    }
    accounts.forEach(account => {
      const tr = document.createElement('tr');
      [account.display_name, account.username, account.role, account.is_active ? 'Active' : 'Inactive', account.created_at || ''].forEach((value, index) => {
        const td = document.createElement('td'); td.textContent = value == null ? '' : String(value);
        if (index === 2) td.className = 'role-tag';
        tr.appendChild(td);
      });
      const actions = document.createElement('td'); const wrap = document.createElement('div'); wrap.className = 'row-actions';
      if (account.role !== 'admin') {
        const reset = document.createElement('button'); reset.className = 'secondary'; reset.textContent = 'Reset password';
        reset.addEventListener('click', () => resetAccountPassword(account));
        const toggle = document.createElement('button'); toggle.className = account.is_active ? 'danger' : 'secondary';
        toggle.textContent = account.is_active ? 'Deactivate' : 'Activate';
        toggle.addEventListener('click', () => toggleAccount(account));
        wrap.append(reset, toggle);
      } else { wrap.textContent = 'Protected'; }
      actions.appendChild(wrap); tr.appendChild(actions); accountRows.appendChild(tr);
    });
  } catch (error) { showMessage(error.message, true); }
}

async function createAccount(event) {
  event.preventDefault();
  const payload = {
    display_name: document.getElementById('newDisplayName').value.trim(),
    username: document.getElementById('newUsername').value.trim().toLowerCase(),
    role: document.getElementById('newRole').value,
    password: document.getElementById('newPassword').value
  };
  try {
    const result = await api('/api/admin/accounts', { method: 'POST', body: JSON.stringify(payload) });
    const output = document.getElementById('credentialResult');
    output.replaceChildren(); output.style.display = 'block';
    const heading = document.createElement('strong'); heading.textContent = 'Account created. Save these login details now:';
    const details = document.createElement('p'); details.textContent = `Name: ${result.account.display_name} | Role: ${result.account.role} | Username: ${result.account.username} | Initial password: ${result.initial_password}`;
    const copy = document.createElement('button'); copy.className = 'secondary'; copy.textContent = 'Copy login details';
    copy.addEventListener('click', async () => {
      const text = `Name: ${result.account.display_name}\nRole: ${result.account.role}\nUsername: ${result.account.username}\nInitial password: ${result.initial_password}`;
      try { await navigator.clipboard.writeText(text); showMessage('Login details copied.'); }
      catch { showMessage('Clipboard access unavailable; copy the details displayed above.', true); }
    });
    output.append(heading, details, copy);
    document.getElementById('createAccountForm').reset();
    showMessage('New account created successfully.'); await loadAccounts();
  } catch (error) { showMessage(error.message, true); }
}

async function resetAccountPassword(account) {
  const password = window.prompt(`Enter a new password for ${account.username} (at least 8 characters):`);
  if (password === null) return;
  if (password.length < 8 || password.length > 72) { showMessage('Password must be 8–72 characters.', true); return; }
  try {
    const result = await api(`/api/admin/accounts/${account.id}/password`, { method: 'PUT', body: JSON.stringify({ password }) });
    const output = document.getElementById('credentialResult'); output.replaceChildren(); output.style.display = 'block';
    const heading = document.createElement('strong'); heading.textContent = 'Password reset. Share this new password securely:';
    const details = document.createElement('p'); details.textContent = `Username: ${result.username} | New password: ${result.temporary_password}`;
    output.append(heading, details);
    showMessage('Password reset successfully.');
  } catch (error) { showMessage(error.message, true); }
}

async function toggleAccount(account) {
  const action = account.is_active ? 'deactivate' : 'activate';
  if (!window.confirm(`Are you sure you want to ${action} ${account.username}?`)) return;
  try {
    await api(`/api/admin/accounts/${account.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !account.is_active }) });
    showMessage(`Account ${action}d successfully.`); await loadAccounts();
  } catch (error) { showMessage(error.message, true); }
}

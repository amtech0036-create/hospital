document.addEventListener('DOMContentLoaded', async () => {
  requireAuthOrRedirect();
  renderSidebar('/settings.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Settings';

  const alertBox = document.getElementById('settingsAlert');
  const successBox = document.getElementById('settingsSuccess');
  const userModal = new bootstrap.Modal(document.getElementById('userModal'));
  const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
  const userForm = document.getElementById('userForm');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';
  let editingUserId = null;
  let resettingUserId = null;
  let allUsers = [];

  function showError(err) {
    successBox.classList.add('d-none');
    alertBox.textContent = err.message || 'Something went wrong.';
    alertBox.classList.remove('d-none');
  }
  function showSuccess(msg) {
    alertBox.classList.add('d-none');
    successBox.textContent = msg;
    successBox.classList.remove('d-none');
  }
  function clearAlerts() {
    alertBox.classList.add('d-none');
    successBox.classList.add('d-none');
  }

  if (isAdmin) {
    document.getElementById('usersTabNav')?.classList.remove('d-none');
    document.getElementById('backupTabNav')?.classList.remove('d-none');
  }

  document.querySelectorAll('.nav-link[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-tab]').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.add('d-none'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.remove('d-none');
      if (btn.dataset.tab === 'usersTab') loadUsers();
    });
  });

  document.getElementById('downloadBackupJsonBtn')?.addEventListener('click', async (e) => {
    clearAlerts();
    const button = e.currentTarget;
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating JSON…';
    try {
      await downloadBackupJson();
      showSuccess('JSON backup file downloaded successfully.');
    } catch (err) {
      showError(err);
    } finally {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  });

  async function loadCompanySettings() {
    try {
      const settings = await getCompanySettings(true);
      document.getElementById('companyName').value = settings.companyName || '';
      document.getElementById('companyPhone').value = settings.companyPhone || '';
      document.getElementById('companyEmail').value = settings.companyEmail || '';
      document.getElementById('companyAddress').value = settings.companyAddress || '';
      document.getElementById('currencySymbol').value = settings.currencySymbol || '৳';
      document.getElementById('invoiceFooterNote').value = settings.invoiceFooterNote || '';
    } catch (err) {
      showError(err);
    }
  }

  document.getElementById('companyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: {
          companyName: document.getElementById('companyName').value.trim(),
          companyPhone: document.getElementById('companyPhone').value.trim(),
          companyEmail: document.getElementById('companyEmail').value.trim(),
          companyAddress: document.getElementById('companyAddress').value.trim(),
          currencySymbol: document.getElementById('currencySymbol').value.trim() || '৳',
          invoiceFooterNote: document.getElementById('invoiceFooterNote').value.trim()
        }
      });
      clearCompanySettingsCache();
      showSuccess('Company profile saved.');
    } catch (err) {
      showError(err);
    }
  });

  async function loadUsers() {
    if (!isAdmin) return;
    try {
      const res = await apiRequest('/settings/users');
      allUsers = res.data;
      renderUserTable();
    } catch (err) {
      showError(err);
    }
  }

  function renderUserTable() {
    const body = document.getElementById('userTableBody');
    if (!allUsers.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No users yet.</td></tr>';
      return;
    }
    body.innerHTML = allUsers
      .map(
        (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td><span class="badge ${u.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${u.status}</span></td>
        <td class="text-end">
          <div class="d-flex flex-wrap gap-1 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" data-reset-password="${u.id}">Reset password</button>
            <button class="btn btn-sm btn-outline-primary" data-edit-user="${u.id}">Edit</button>
            ${
              u.id !== currentUser?.id && u.status === 'Active'
                ? `<button class="btn btn-sm btn-outline-danger" data-deactivate-user="${u.id}">Deactivate</button>`
                : ''
            }
          </div>
        </td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('[data-edit-user]').forEach((btn) =>
      btn.addEventListener('click', () => openEditUser(btn.dataset.editUser))
    );
    body.querySelectorAll('[data-reset-password]').forEach((btn) =>
      btn.addEventListener('click', () => openResetPassword(btn.dataset.resetPassword))
    );
    body.querySelectorAll('[data-deactivate-user]').forEach((btn) =>
      btn.addEventListener('click', () => deactivateUser(btn.dataset.deactivateUser))
    );
  }

  document.getElementById('addUserBtn')?.addEventListener('click', () => {
    editingUserId = null;
    userForm.reset();
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('u_password').required = true;
    document.getElementById('u_passwordHint').textContent = 'Minimum 6 characters.';
    document.getElementById('u_statusGroup').classList.add('d-none');
    userModal.show();
  });

  function openEditUser(id) {
    const u = allUsers.find((x) => x.id === id);
    if (!u) return;
    editingUserId = id;
    document.getElementById('userModalTitle').textContent = `Edit ${u.name}`;
    document.getElementById('u_name').value = u.name;
    document.getElementById('u_email').value = u.email;
    document.getElementById('u_password').value = '';
    document.getElementById('u_password').required = false;
    document.getElementById('u_passwordHint').textContent = 'Leave blank to keep current password.';
    document.getElementById('u_role').value = u.role;
    document.getElementById('u_status').value = u.status;
    document.getElementById('u_statusGroup').classList.remove('d-none');
    userModal.show();
  }

  function openResetPassword(id) {
    const u = allUsers.find((x) => x.id === id);
    if (!u) return;
    resettingUserId = id;
    resetPasswordForm.reset();
    document.getElementById('resetPasswordUserLabel').textContent = `${u.name} (${u.email})`;
    resetPasswordModal.show();
    setTimeout(() => document.getElementById('rp_password').focus(), 200);
  }

  resetPasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const password = document.getElementById('rp_password').value;
    const confirmPassword = document.getElementById('rp_password_confirm').value;

    if (!password || password.length < 6) {
      showError(new Error('Password must be at least 6 characters.'));
      return;
    }
    if (password !== confirmPassword) {
      showError(new Error('Passwords do not match.'));
      return;
    }

    try {
      await apiRequest(`/settings/users/${resettingUserId}`, {
        method: 'PUT',
        body: { password }
      });
      resetPasswordModal.hide();
      showSuccess('Password reset successfully. Share the new password with the user securely.');
    } catch (err) {
      showError(err);
    }
  });

  async function deactivateUser(id) {
    if (!confirm('Deactivate this user? They will not be able to log in.')) return;
    try {
      await apiRequest(`/settings/users/${id}`, { method: 'DELETE' });
      loadUsers();
    } catch (err) {
      showError(err);
    }
  }

  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();
    const payload = {
      name: document.getElementById('u_name').value.trim(),
      email: document.getElementById('u_email').value.trim(),
      role: document.getElementById('u_role').value
    };
    const password = document.getElementById('u_password').value;
    if (!editingUserId) {
      if (!password || password.length < 6) {
        showError(new Error('Password must be at least 6 characters.'));
        return;
      }
      payload.password = password;
    } else if (password) {
      payload.password = password;
      payload.status = document.getElementById('u_status').value;
    } else {
      payload.status = document.getElementById('u_status').value;
    }

    try {
      if (editingUserId) {
        await apiRequest(`/settings/users/${editingUserId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/settings/users', { method: 'POST', body: payload });
      }
      userModal.hide();
      loadUsers();
      showSuccess(editingUserId ? 'User updated.' : 'User created.');
    } catch (err) {
      showError(err);
    }
  });

  await loadCompanySettings();
});

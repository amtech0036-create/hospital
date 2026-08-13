document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, skip straight to the dashboard.
  if (getToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
      });

      setSession(res.data.token, res.data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      alertBox.textContent = err.message || 'Login failed.';
      alertBox.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
});

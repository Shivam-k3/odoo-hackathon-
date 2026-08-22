// DAYFLOW HRMS — SIGNUP VIEW (REAL BACKEND REGISTRATION)

import { authService } from '../../core/authService.js';
import { router } from '../../core/router.js';
import { showToast } from '../../components/Toast.js';

export function createSignupView() {
  let showPassword = false;

  return {
    render() {
      return `
        <div class="auth-layout">
          <div class="auth-card" style="max-width: 520px;">
            <div class="auth-header">
              <div class="auth-logo">D</div>
              <h1 class="auth-title">Create Account</h1>
              <p class="auth-subtitle">Join Dayflow HRMS employee portal</p>
            </div>

            <div id="signup-error-banner" style="display: none; padding: 10px 14px; background-color: var(--danger-bg); border: 1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size: 13px; margin-bottom: 20px;"></div>

            <form id="signup-form">
              <div class="form-group">
                <label class="form-label required" for="email">Corporate Email</label>
                <input type="email" id="email" class="form-input" placeholder="firstname.lastname@dayflow.com" required />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label required" for="first-name">First Name</label>
                  <input type="text" id="first-name" class="form-input" placeholder="e.g. Rohit" required />
                </div>
                <div class="form-group">
                  <label class="form-label required" for="last-name">Last Name</label>
                  <input type="text" id="last-name" class="form-input" placeholder="e.g. Kulkarni" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="department">Department (optional)</label>
                <input type="text" id="department" class="form-input" placeholder="e.g. Engineering, Sales, HR" />
              </div>

              <div class="form-group">
                <label class="form-label" for="role">Account Type</label>
                <select id="role" class="form-select">
                  <option value="Employee" selected>Employee</option>
                  <option value="Admin">Admin / HR</option>
                </select>
                <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">HR admins manage payroll, leave approvals and reports. Authorization is enforced by the backend.</div>
              </div>

              <div class="form-group">
                <label class="form-label required" for="password">Password</label>
                <div class="input-wrapper">
                  <input type="${showPassword ? 'text' : 'password'}" id="password" class="form-input" placeholder="Minimum 6 characters" required />
                  <button type="button" class="input-toggle-pwd" id="toggle-signup-pwd" title="Show/Hide password">
                    <i data-lucide="${showPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required" for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" class="form-input" placeholder="Re-enter password" required />
              </div>

              <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 16px;">
                Note: Your unique Login ID will be assigned by the backend system upon account activation.
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" id="signup-submit-btn">
                <span>Create Account</span>
                <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i>
              </button>
            </form>

            <div style="text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-secondary);">
              Already have an account? <a href="#/login" style="font-weight: 600;">Sign In</a>
            </div>
          </div>
        </div>
      `;
    },

    afterRender() {
      const form = document.getElementById('signup-form');
      const togglePwd = document.getElementById('toggle-signup-pwd');
      const errorBanner = document.getElementById('signup-error-banner');

      const showError = (msg) => {
        if (errorBanner) {
          errorBanner.textContent = msg;
          errorBanner.style.display = 'block';
        }
      };

      if (togglePwd) {
        togglePwd.addEventListener('click', () => {
          showPassword = !showPassword;
          const pwdInput = document.getElementById('password');
          if (pwdInput) pwdInput.type = showPassword ? 'text' : 'password';
          togglePwd.innerHTML = `<i data-lucide="${showPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>`;
          if (window.lucide) window.lucide.createIcons();
        });
      }

      // Mirrors the backend policy exactly (min 6 chars) so the placeholder,
      // the client validation and the server can never disagree.
      const validatePassword = (pwd) => {
        if (!pwd || pwd.length < 6) return 'Password must be at least 6 characters long.';
        return null;
      };

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value.trim();
          const firstName = document.getElementById('first-name').value.trim();
          const lastName = document.getElementById('last-name').value.trim();
          const department = document.getElementById('department').value.trim();
          const role = document.getElementById('role').value;
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;

          errorBanner.style.display = 'none';

          if (!firstName || !lastName) {
            showError('First name and last name are both required.');
            return;
          }

          const pwdError = validatePassword(password);
          if (pwdError) {
            showError(pwdError);
            return;
          }

          if (password !== confirmPassword) {
            showError('Passwords do not match. Please verify both fields.');
            return;
          }

          const submitBtn = document.getElementById('signup-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader-2" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i> Creating Account...`;
            if (window.lucide) window.lucide.createIcons();
          }

          try {
            const res = await authService.signup({ email, password, firstName, lastName, department, role });
            showToast(`Welcome to Dayflow, ${res.user.name.split(' ')[0]}!`, 'success');
            router.navigate(res.user.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard');
          } catch (err) {
            const detail = err && err.errors ? Object.values(err.errors).join(' ') : '';
            showError((err && err.message ? err.message : 'Registration failed.') + (detail ? ` ${detail}` : ''));
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `<span>Create Account</span> <i data-lucide="user-plus" style="width: 18px; height: 18px;"></i>`;
              if (window.lucide) window.lucide.createIcons();
            }
          }
        });
      }
    }
  };
}

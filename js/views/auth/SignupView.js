// DAYFLOW HRMS — SIGNUP VIEW

import { authService } from '../../core/authService.js';
import { router } from '../../core/router.js';
import { showToast } from '../../components/Toast.js';

export function createSignupView() {
  let showPassword = false;

  return {
    render() {
      return `
        <div class="auth-layout">
          <div class="auth-card" style="max-width: 480px;">
            <div class="auth-header">
              <div class="auth-logo">D</div>
              <h1 class="auth-title">Create Account</h1>
              <p class="auth-subtitle">Join Dayflow HRMS employee portal</p>
            </div>

            <div id="signup-error-banner" style="display: none; padding: 10px 14px; background-color: var(--danger-bg); border: 1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size: 13px; margin-bottom: 20px;"></div>

            <form id="signup-form">
              <div class="form-group">
                <label class="form-label required" for="email">Corporate Email</label>
                <input type="email" id="email" class="form-input" placeholder="sarah.jenkins@dayflow.com" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="role">Role (Dev Selector)</label>
                <select id="role" class="form-select">
                  <option value="Employee" selected>Employee</option>
                  <option value="Admin">Admin (Mock)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label required" for="password">Password</label>
                <div class="input-wrapper">
                  <input type="${showPassword ? 'text' : 'password'}" id="password" class="form-input" placeholder="At least 8 characters" required />
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
                Note: Your unique Login ID will be assigned and provided by the backend system upon account activation.
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

      if (togglePwd) {
        togglePwd.addEventListener('click', () => {
          showPassword = !showPassword;
          const pwdInput = document.getElementById('password');
          if (pwdInput) pwdInput.type = showPassword ? 'text' : 'password';
          togglePwd.innerHTML = `<i data-lucide="${showPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>`;
          if (window.lucide) window.lucide.createIcons();
        });
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const role = document.getElementById('role').value;

          if (password !== confirmPassword) {
            if (errorBanner) {
              errorBanner.textContent = 'Passwords do not match. Please verify both fields.';
              errorBanner.style.display = 'block';
            }
            return;
          }

          if (password.length < 6) {
            if (errorBanner) {
              errorBanner.textContent = 'Password must be at least 6 characters long.';
              errorBanner.style.display = 'block';
            }
            return;
          }

          const res = await authService.signup({
            email,
            password,
            role
          });

          if (res.success) {
            showToast('Account registered! Welcome to Dayflow.', 'success');
            router.navigate('/employee/dashboard');
          }
        });
      }
    }
  };
}

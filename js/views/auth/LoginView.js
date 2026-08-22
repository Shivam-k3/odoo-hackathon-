// DAYFLOW HRMS — LOGIN VIEW

import { authService } from '../../core/authService.js';
import { router } from '../../core/router.js';
import { showToast } from '../../components/Toast.js';

export function createLoginView() {
  let showPassword = false;

  return {
    render() {
      return `
        <div class="auth-layout">
          <div class="auth-card">
            <div class="auth-header">
              <div class="auth-logo">D</div>
              <h1 class="auth-title">Welcome to Dayflow</h1>
              <p class="auth-subtitle">Sign in to your employee portal</p>
            </div>

            <div id="auth-error-banner" style="display: none; padding: 10px 14px; background-color: var(--danger-bg); border: 1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size: 13px; margin-bottom: 20px;"></div>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label required" for="email">Login ID or Corporate Email</label>
                <input type="text" id="email" class="form-input" placeholder="Your assigned Login ID or corporate email" value="sarah.jenkins@dayflow.com" required />
                <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">Your Login ID is assigned by HR/Admin after account activation.</div>
              </div>

              <div class="form-group">
                <label class="form-label required" for="password">Password</label>
                <div class="input-wrapper">
                  <input type="${showPassword ? 'text' : 'password'}" id="password" class="form-input" placeholder="••••••••" value="password123" required />
                  <button type="button" class="input-toggle-pwd" id="toggle-pwd-btn" title="Show/Hide password">
                    <i data-lucide="${showPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>
                  </button>
                </div>
              </div>

              <!-- Role Selector for Frontend Testing -->
              <div class="form-group">
                <label class="form-label" for="role">Role (Dev Selector)</label>
                <select id="role" class="form-select">
                  <option value="Employee" selected>Employee</option>
                  <option value="Admin">Admin (Mock)</option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-submit-btn" style="margin-top: 8px;">
                <span>Sign In</span>
                <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>
              </button>
            </form>

            <div style="text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-secondary);">
              Don't have an account? <a href="#/signup" style="font-weight: 600;">Sign Up</a>
            </div>
          </div>
        </div>
      `;
    },

    afterRender() {
      const form = document.getElementById('login-form');
      const togglePwdBtn = document.getElementById('toggle-pwd-btn');
      const errorBanner = document.getElementById('auth-error-banner');

      if (togglePwdBtn) {
        togglePwdBtn.addEventListener('click', () => {
          showPassword = !showPassword;
          const pwdInput = document.getElementById('password');
          if (pwdInput) pwdInput.type = showPassword ? 'text' : 'password';
          togglePwdBtn.innerHTML = `<i data-lucide="${showPassword ? 'eye-off' : 'eye'}" style="width: 18px; height: 18px;"></i>`;
          if (window.lucide) window.lucide.createIcons();
        });
      }

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const emailInput = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value.trim();
          const role = document.getElementById('role').value;

          if (!emailInput || !password) {
            if (errorBanner) {
              errorBanner.textContent = 'Please provide both Login ID/email and password.';
              errorBanner.style.display = 'block';
            }
            return;
          }

          const submitBtn = document.getElementById('login-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader-2" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i> Signing In...`;
            if (window.lucide) window.lucide.createIcons();
          }

          try {
            const res = await authService.login({
              loginId: emailInput.includes('@') ? null : emailInput,
              email: emailInput.includes('@') ? emailInput : 'sarah.jenkins@dayflow.com',
              password: password,
              role: role
            });

            if (res.success) {
              showToast(`Welcome back, ${res.user.name.split(' ')[0]}!`, 'success');
              router.navigate('/employee/dashboard');
            }
          } catch (err) {
            if (errorBanner) {
              errorBanner.textContent = 'Authentication failed. Please check your credentials.';
              errorBanner.style.display = 'block';
            }
          }
        });
      }
    }
  };
}

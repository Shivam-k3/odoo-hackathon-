// DAYFLOW HRMS — EMPLOYEE PROFILE VIEW (REAL BACKEND DATA)
// Read/write via /api/employees/me. Server is the database — localStorage is never
// used for business data. Only backend-supported fields are exposed.

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { api, esc } from '../../core/api.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

let currentActiveTab = 'about';
// Module-level cache so re-renders (tab switches) never refetch or loop.
let profile = null;

const CERT_SEPARATOR = ' :: ';

function parseCert(str) {
  const [name = '', issuer = '', year = ''] = String(str).split(CERT_SEPARATOR).map(s => s.trim());
  return { name, issuer, year };
}

export function createProfileView() {
  return {
    render() {
      const state = store.getState();
      const user = state.user || {};
      const p = profile;

      const currentPath = '/employee/profile';

      const tabs = [
        { id: 'about', label: 'About', icon: 'user' },
        { id: 'private', label: 'Private Info', icon: 'shield' },
        { id: 'skills', label: 'Skills', icon: 'code' },
        { id: 'certification', label: 'Certification', icon: 'award' },
        { id: 'salary', label: 'Salary Info', icon: 'lock' },
        { id: 'account', label: 'Account', icon: 'lock' }
      ];

      // Loading / error shells
      if (!p) {
        return `
          <div class="main-layout">
            ${renderSidebar(currentPath)}
            <div class="content-wrapper">
              ${renderNavbar('My Profile')}
              <main class="main-content">
                <div id="pf-error" style="display:none; margin-bottom:20px; padding:12px 16px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-md); color: var(--danger); font-size:13px;"></div>
                <div class="card"><div style="padding:48px; text-align:center; color:var(--text-tertiary); font-size:13px;">Loading profile…</div></div>
              </main>
            </div>
          </div>
        `;
      }

      const tabsHeaderHtml = tabs.map(tab => `
        <button class="tab-btn ${currentActiveTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
          <i data-lucide="${tab.icon}" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i>
          ${tab.label}
        </button>
      `).join('');

      const fullName = `${p.firstName} ${p.lastName}`.trim();

      let tabContentHtml = '';

      if (currentActiveTab === 'about') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Professional Summary & Bio</h3>
              <button class="btn btn-secondary btn-sm" id="edit-about-btn">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                <span>Edit Bio</span>
              </button>
            </div>
            <p style="font-size: 14px; color: var(--text-main); line-height: 1.7; white-space: pre-line; margin-bottom: 24px;">
              ${p.about ? esc(p.about) : '<span style="color: var(--text-tertiary);">No biography provided yet.</span>'}
            </p>

            <div style="border-top: 1px solid var(--border-light); padding-top: 20px;">
              <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">Key Job Information</h4>
              <div class="profile-info-grid">
                <div>
                  <div class="info-item-label">Designation</div>
                  <div class="info-item-value">${esc(p.designation || 'Not set')}</div>
                </div>
                <div>
                  <div class="info-item-label">Department</div>
                  <div class="info-item-value">${esc(p.department || 'Not set')}</div>
                </div>
                <div>
                  <div class="info-item-label">Employee ID</div>
                  <div class="info-item-value">${esc(p.loginId || '—')}</div>
                </div>
                <div>
                  <div class="info-item-label">Joining Date</div>
                  <div class="info-item-value">${esc(p.joiningDate ? String(p.joiningDate).slice(0, 10) : '—')}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'private') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Personal & Contact Details</h3>
              <button class="btn btn-secondary btn-sm" id="edit-private-btn">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                <span>Edit Private Info</span>
              </button>
            </div>

            <div class="profile-info-grid">
              <div>
                <div class="info-item-label">Phone Number</div>
                <div class="info-item-value">${p.phone ? esc(p.phone) : '<span style="color: var(--text-tertiary);">Not provided</span>'}</div>
              </div>
              <div>
                <div class="info-item-label">Residential Address</div>
                <div class="info-item-value">${p.address ? esc(p.address) : '<span style="color: var(--text-tertiary);">Not provided</span>'}</div>
              </div>
              <div>
                <div class="info-item-label">Corporate Email</div>
                <div class="info-item-value">${esc(p.email)}</div>
              </div>
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'skills') {
        const skillsList = Array.isArray(p.skills) ? p.skills : [];
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Technical & Professional Skills</h3>
              <button class="btn btn-primary btn-sm" id="add-skill-btn">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                <span>Add Skill</span>
              </button>
            </div>

            <div class="skills-container">
              ${skillsList.length ? skillsList.map(skill => `
                <div class="skill-tag">
                  <span>${esc(skill)}</span>
                  <button class="remove-skill-btn" data-skill="${esc(skill)}" title="Remove skill">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              `).join('') : '<span style="color: var(--text-tertiary); font-size: 13px;">No skills added yet.</span>'}
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'certification') {
        const certs = (Array.isArray(p.certifications) ? p.certifications : []).map(parseCert);
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Certifications & Badges</h3>
              <button class="btn btn-primary btn-sm" id="add-cert-btn">
                <i data-lucide="plus" style="width: 14px; height: 14px;"></i>
                <span>Add Certification</span>
              </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${certs.length ? certs.map((c, i) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                      <i data-lucide="award" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 14px;">${esc(c.name)}</div>
                      <div style="font-size: 12px; color: var(--text-secondary);">${c.issuer ? esc(c.issuer) + ' • ' : ''}${c.year ? 'Issued ' + esc(c.year) : ''}</div>
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm remove-cert-btn" data-index="${i}" title="Remove certification">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                  </button>
                </div>
              `).join('') : '<span style="color: var(--text-tertiary); font-size: 13px;">No certifications added yet.</span>'}
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'salary') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Salary Info & Restrictions</h3>
              <span class="badge badge-warning">Admin Access Restricted</span>
            </div>

            <div style="padding: 16px; background-color: #fff7e6; border: 1px solid #f9ab00; border-radius: var(--radius-md); color: #8a4b00; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
              <i data-lucide="shield-alert" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>
              <strong>Notice:</strong> Per Dayflow HR Policy, detailed salary structure configuration, wage components, and CTC adjustments are restricted to HR & Payroll Administrators. Employees can access their monthly read-only pay statements via the <strong>Payroll</strong> portal.
            </div>

            <div class="profile-info-grid">
              <div>
                <div class="info-item-label">Salary Structure Configuration</div>
                <div class="info-item-value" style="color: var(--text-tertiary);">Restricted — Managed by Admin/HR</div>
              </div>
            </div>

            <div style="margin-top: 24px; text-align: right;">
              <button class="btn btn-primary btn-sm" id="view-full-payroll-btn">
                <span>View Monthly Pay Slips</span>
                <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'account') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Account Information</h3>
            </div>

            <div class="profile-info-grid">
              <div>
                <div class="info-item-label">Email</div>
                <div class="info-item-value">${esc(user.email || p.email || '—')}</div>
              </div>
              <div>
                <div class="info-item-label">Role</div>
                <div class="info-item-value">${esc(user.role || '—')}</div>
              </div>
              <div>
                <div class="info-item-label">Account Status</div>
                <div class="info-item-value">${esc(user.status || '—')}</div>
              </div>
              <div>
                <div class="info-item-label">Login ID</div>
                <div class="info-item-value">${esc(p.loginId || '—')}</div>
              </div>
            </div>

            <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--border-light); font-size:12px; color:var(--text-tertiary);">
              Password changes and account deactivation are handled by HR administrators.
            </div>
          </div>
        `;
      }

      return `
        <div class="main-layout">
          ${renderSidebar(currentPath)}

          <div class="content-wrapper">
            ${renderNavbar('My Profile')}

            <main class="main-content">
              <!-- Profile Header Card -->
              <div class="card profile-header-card">
                <div class="profile-avatar-wrapper">
                  <div class="profile-large-avatar">
                    ${p.profilePicture
                      ? `<img src="${esc(p.profilePicture)}" class="profile-large-avatar" alt="${esc(fullName)}">`
                      : esc((fullName || 'U').charAt(0).toUpperCase())}
                  </div>
                  <button class="avatar-edit-btn" id="edit-avatar-btn" title="Change Avatar URL">
                    <i data-lucide="camera" style="width: 16px; height: 16px;"></i>
                  </button>
                </div>

                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                    <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main);">${esc(fullName)}</h2>
                    <span class="badge badge-info">${esc(p.loginId || '')}</span>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${esc(p.designation || 'Staff')} • ${esc(p.department || 'General')}
                  </div>
                  <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-tertiary);">
                    <span><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${esc(p.email)}</span>
                    <span><i data-lucide="phone" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${p.phone ? esc(p.phone) : 'No phone set'}</span>
                  </div>
                </div>
              </div>

              <!-- Profile Navigation Tabs -->
              <div class="tab-container" id="profile-tabs">
                ${tabsHeaderHtml}
              </div>

              <!-- Active Tab Body -->
              <div id="profile-tab-content">
                ${tabContentHtml}
              </div>
            </main>
          </div>
        </div>
      `;
    },

    afterRender() {
      initSidebarEvents();
      initNavbarEvents();

      const errBox = document.getElementById('pf-error');
      const showError = (msg) => {
        if (!errBox) return;
        errBox.textContent = msg;
        errBox.style.display = 'block';
      };

      // ---- Data loading ---------------------------------------------------
      const loadProfile = async () => {
        try {
          if (errBox) errBox.style.display = 'none';
          profile = await api.get('/api/employees/me');

          // Keep session user's avatar/name in sync for Navbar/Sidebar
          const sessionUser = store.getState().user;
          if (sessionUser) {
            store.setUser({
              ...sessionUser,
              avatar: profile.profilePicture || sessionUser.avatar,
              name: `${profile.firstName} ${profile.lastName}`.trim(),
            });
          }
          router.handleRoute(); // re-render with fresh server data
        } catch (err) {
          showError(err.message || 'Could not load profile.');
        }
      };

      // ---- Shared update helper -------------------------------------------
      const updateProfile = async (patch, successMsg) => {
        try {
          await api.put('/api/employees/me', patch);
          showToast(successMsg, 'success');
          await loadProfile(); // reconcile with server truth, then re-render
        } catch (err) {
          showToast(err.message || 'Update failed.', 'danger');
          throw err;
        }
      };

      // Tab switching
      const tabBtns = document.querySelectorAll('#profile-tabs .tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabId = e.currentTarget.dataset.tab;
          if (tabId && tabId !== currentActiveTab) {
            currentActiveTab = tabId;
            router.handleRoute();
          }
        });
      });

      // Edit Avatar URL
      document.getElementById('edit-avatar-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Update Profile Picture',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="avatar-url-input">Image URL</label>
              <input type="url" id="avatar-url-input" class="form-input" value="${esc(profile.profilePicture || '')}" placeholder="https://example.com/photo.jpg" />
            </div>
            <div id="avatar-err" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-avatar">Cancel</button>
            <button class="btn btn-primary" id="modal-save-avatar">Save Picture</button>
          `,
        });

        document.getElementById('modal-cancel-avatar')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-avatar')?.addEventListener('click', async () => {
          const newUrl = document.getElementById('avatar-url-input')?.value.trim() || null;
          try {
            await updateProfile({ profilePicture: newUrl }, 'Profile picture updated!');
            closeModal();
          } catch (err) {
            const eBox = document.getElementById('avatar-err');
            if (eBox) { eBox.textContent = err.message || 'Update failed.'; eBox.style.display = 'block'; }
          }
        });
      });

      // Edit Bio
      document.getElementById('edit-about-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Edit Bio / About',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="about-input">Professional Biography</label>
              <textarea id="about-input" class="form-textarea" rows="5">${esc(profile.about || '')}</textarea>
            </div>
            <div id="about-err" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-about">Cancel</button>
            <button class="btn btn-primary" id="modal-save-about">Save Bio</button>
          `,
        });

        document.getElementById('modal-cancel-about')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-about')?.addEventListener('click', async () => {
          const val = document.getElementById('about-input')?.value || null;
          try {
            await updateProfile({ about: val }, 'Bio updated!');
            closeModal();
          } catch (err) {
            const eBox = document.getElementById('about-err');
            if (eBox) { eBox.textContent = err.message || 'Update failed.'; eBox.style.display = 'block'; }
          }
        });
      });

      // Edit Private Info (phone/address only — the fields the backend supports)
      document.getElementById('edit-private-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Edit Private Contact Information',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="phone-input">Phone Number</label>
              <input type="tel" id="phone-input" class="form-input" value="${esc(profile.phone || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="address-input">Residential Address</label>
              <textarea id="address-input" class="form-textarea" rows="2">${esc(profile.address || '')}</textarea>
            </div>
            <div id="private-err" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-private">Cancel</button>
            <button class="btn btn-primary" id="modal-save-private">Save Changes</button>
          `,
        });

        document.getElementById('modal-cancel-private')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-private')?.addEventListener('click', async () => {
          const phone = document.getElementById('phone-input')?.value.trim() || null;
          const address = document.getElementById('address-input')?.value.trim() || null;
          try {
            await updateProfile({ phone, address }, 'Contact details saved!');
            closeModal();
          } catch (err) {
            const eBox = document.getElementById('private-err');
            if (eBox) { eBox.textContent = err.message || 'Update failed.'; eBox.style.display = 'block'; }
          }
        });
      });

      // Skill manager
      document.getElementById('add-skill-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Add Skill',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label required" for="skill-name-input">Skill Name</label>
              <input type="text" id="skill-name-input" class="form-input" placeholder="e.g. Node.js, GraphQL" />
            </div>
            <div id="skill-err" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-skill">Cancel</button>
            <button class="btn btn-primary" id="modal-save-skill">Add Skill</button>
          `,
        });

        document.getElementById('modal-cancel-skill')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-skill')?.addEventListener('click', async () => {
          const name = document.getElementById('skill-name-input')?.value.trim();
          if (!name) return;
          const skills = [...(Array.isArray(profile.skills) ? profile.skills : []), name];
          try {
            await updateProfile({ skills }, `Skill '${name}' added!`);
            closeModal();
          } catch (err) {
            const eBox = document.getElementById('skill-err');
            if (eBox) { eBox.textContent = err.message || 'Update failed.'; eBox.style.display = 'block'; }
          }
        });
      });

      document.querySelectorAll('.remove-skill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const skill = e.currentTarget.dataset.skill;
          if (!skill) return;
          const skills = (Array.isArray(profile.skills) ? profile.skills : []).filter(s => s !== skill);
          try {
            await updateProfile({ skills }, `Skill '${skill}' removed.`);
          } catch (_) { /* toast already shown */ }
        });
      });

      // Certification manager
      document.getElementById('add-cert-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Add Certification',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label required" for="cert-name">Certification Title</label>
              <input type="text" id="cert-name" class="form-input" placeholder="e.g. Certified Kubernetes Administrator" required />
            </div>
            <div class="form-group">
              <label class="form-label required" for="cert-issuer">Issuing Organization</label>
              <input type="text" id="cert-issuer" class="form-input" placeholder="e.g. Linux Foundation" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="cert-year">Year Issued</label>
              <input type="text" id="cert-year" class="form-input" placeholder="2026" />
            </div>
            <div id="cert-err" style="display:none; padding:10px 12px; background-color:#fdecea; border:1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger); font-size:13px;"></div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-cert">Cancel</button>
            <button class="btn btn-primary" id="modal-save-cert">Save Certification</button>
          `,
        });

        document.getElementById('modal-cancel-cert')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-cert')?.addEventListener('click', async () => {
          const name = document.getElementById('cert-name')?.value.trim();
          const issuer = document.getElementById('cert-issuer')?.value.trim();
          const year = document.getElementById('cert-year')?.value.trim();
          if (!name || !issuer) return;
          const certs = [...(Array.isArray(profile.certifications) ? profile.certifications : []),
            `${name}${CERT_SEPARATOR}${issuer}${CERT_SEPARATOR}${year || ''}`];
          try {
            await updateProfile({ certifications: certs }, 'Certification added!');
            closeModal();
          } catch (err) {
            const eBox = document.getElementById('cert-err');
            if (eBox) { eBox.textContent = err.message || 'Update failed.'; eBox.style.display = 'block'; }
          }
        });
      });

      document.querySelectorAll('.remove-cert-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = Number(e.currentTarget.dataset.index);
          const certs = (Array.isArray(profile.certifications) ? profile.certifications : []).filter((_, i) => i !== idx);
          try {
            await updateProfile({ certifications: certs }, 'Certification removed.');
          } catch (_) { /* toast already shown */ }
        });
      });

      document.getElementById('view-full-payroll-btn')?.addEventListener('click', () => {
        router.navigate('/employee/payroll');
      });

      // Initial load — only fetch when we don't already have server data
      // (tab switches re-render without refetching; updates call updateProfile → loadProfile).
      if (!profile) {
        loadProfile();
      }
    },
  };
}

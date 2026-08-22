// DAYFLOW HRMS — EMPLOYEE PROFILE VIEW

import { store } from '../../core/store.js';
import { router } from '../../core/router.js';
import { renderSidebar, initSidebarEvents } from '../../components/Sidebar.js';
import { renderNavbar, initNavbarEvents } from '../../components/Navbar.js';
import { openModal, closeModal } from '../../components/Modal.js';
import { showToast } from '../../components/Toast.js';

let currentActiveTab = 'about';

export function createProfileView() {
  return {
    render() {
      const state = store.getState();
      const user = state.user || {};
      const profile = state.profile || {};

      const currentPath = '/employee/profile';

      const tabs = [
        { id: 'about', label: 'About', icon: 'user' },
        { id: 'private', label: 'Private Info', icon: 'shield' },
        { id: 'resume', label: 'Resume', icon: 'file-text' },
        { id: 'skills', label: 'Skills', icon: 'code' },
        { id: 'certification', label: 'Certification', icon: 'award' },
        { id: 'salary', label: 'Salary Info', icon: 'lock' },
        { id: 'security', label: 'Security', icon: 'lock' }
      ];

      const tabsHeaderHtml = tabs.map(tab => `
        <button class="tab-btn ${currentActiveTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
          <i data-lucide="${tab.icon}" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></i>
          ${tab.label}
        </button>
      `).join('');

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
              ${profile.about || 'No biography provided yet.'}
            </p>

            <div style="border-top: 1px solid var(--border-light); padding-top: 20px;">
              <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">Key Job Information</h4>
              <div class="profile-info-grid">
                <div>
                  <div class="info-item-label">Designation</div>
                  <div class="info-item-value">${user.designation || 'Senior Frontend Developer'}</div>
                </div>
                <div>
                  <div class="info-item-label">Department</div>
                  <div class="info-item-value">${user.department || 'Engineering'}</div>
                </div>
                <div>
                  <div class="info-item-label">Employee ID</div>
                  <div class="info-item-value">${user.id || 'EMP-1042'}</div>
                </div>
                <div>
                  <div class="info-item-label">Joining Date</div>
                  <div class="info-item-value">${user.joiningDate || '2022-03-15'}</div>
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
                <div class="info-item-value">${profile.phone || 'Not provided'}</div>
              </div>
              <div>
                <div class="info-item-label">Residential Address</div>
                <div class="info-item-value">${profile.address || 'Not provided'}</div>
              </div>
              <div>
                <div class="info-item-label">Emergency Contact</div>
                <div class="info-item-value">${profile.emergencyContact || 'Not provided'}</div>
              </div>
              <div>
                <div class="info-item-label">Date of Birth</div>
                <div class="info-item-value">${profile.dob || '1994-08-14'}</div>
              </div>
              <div>
                <div class="info-item-label">Gender</div>
                <div class="info-item-value">${profile.gender || 'Female'}</div>
              </div>
              <div>
                <div class="info-item-label">Corporate Email</div>
                <div class="info-item-value">${user.email || 'sarah.jenkins@dayflow.com'}</div>
              </div>
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'resume') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Attached Resume / Curriculum Vitae</h3>
              <button class="btn btn-secondary btn-sm" id="upload-resume-btn">
                <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
                <span>Upload New CV</span>
              </button>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-subtle);">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background-color: var(--danger-bg); color: var(--danger); display: flex; align-items: center; justify-content: center;">
                  <i data-lucide="file-text" style="width: 24px; height: 24px;"></i>
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px; color: var(--text-main);">${profile.resumeName || 'Sarah_Jenkins_Resume.pdf'}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">${profile.resumeSize || '1.2 MB'} • Uploaded March 2026</div>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" id="download-resume-btn">
                <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                <span>Download</span>
              </button>
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'skills') {
        const skillsList = profile.skills || [];
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
              ${skillsList.map(skill => `
                <div class="skill-tag">
                  <span>${skill}</span>
                  <button class="remove-skill-btn" data-skill="${skill}" title="Remove skill">
                    <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else if (currentActiveTab === 'certification') {
        const certs = profile.certifications || [];
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
              ${certs.map(c => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
                      <i data-lucide="award" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                      <div style="font-weight: 600; font-size: 14px;">${c.name}</div>
                      <div style="font-size: 12px; color: var(--text-secondary);">${c.issuer} • Issued ${c.year}</div>
                    </div>
                  </div>
                  <span class="badge badge-success">Verified</span>
                </div>
              `).join('')}
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

            <div style="padding: 16px; background-color: var(--warning-bg); border: 1px solid #f9ab00; border-radius: var(--radius-md); color: #8a4b00; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
              <i data-lucide="shield-alert" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;"></i>
              <strong>Notice:</strong> Per Dayflow HR Policy, detailed salary structure configuration, wage components, and CTC adjustments are restricted to HR & Payroll Administrators. Employees can access their monthly read-only pay statements via the <strong>Payroll</strong> portal.
            </div>

            <!-- Sensitive salary structure fields are intentionally NOT rendered here (Admin-only per SRS).
                 This tab exists only for wireframe compatibility and shows no wage/component configuration. -->
            <div class="profile-info-grid">
              <div>
                <div class="info-item-label">Salary Structure Configuration</div>
                <div class="info-item-value" style="color: var(--text-tertiary);">Restricted — Managed by Admin/HR</div>
              </div>
              <div>
                <div class="info-item-label">PF Account Number</div>
                <div class="info-item-value">PF-99014-8842</div>
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
      } else if (currentActiveTab === 'security') {
        tabContentHtml = `
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Account Security & Password</h3>
            </div>

            <form id="security-pwd-form" style="max-width: 480px;">
              <div class="form-group">
                <label class="form-label required" for="current-pwd">Current Password</label>
                <input type="password" id="current-pwd" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="new-pwd">New Password</label>
                <input type="password" id="new-pwd" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="confirm-new-pwd">Confirm New Password</label>
                <input type="password" id="confirm-new-pwd" class="form-input" required />
              </div>

              <button type="submit" class="btn btn-primary">
                <span>Update Password</span>
              </button>
            </form>
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
                    ${user.avatar ? `<img src="${user.avatar}" class="profile-large-avatar" alt="${user.name}">` : (user.name ? user.name.charAt(0) : 'S')}
                  </div>
                  <button class="avatar-edit-btn" id="edit-avatar-btn" title="Change Avatar URL">
                    <i data-lucide="camera" style="width: 16px; height: 16px;"></i>
                  </button>
                </div>

                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                    <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main);">${user.name || 'Sarah Jenkins'}</h2>
                    <span class="badge badge-info">${user.id || 'EMP-1042'}</span>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${user.designation || 'Senior Frontend Developer'} • ${user.department || 'Engineering'}
                  </div>
                  <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-tertiary);">
                    <span><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${user.email || 'sarah.jenkins@dayflow.com'}</span>
                    <span><i data-lucide="phone" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${profile.phone || '+91 98765 43210'}</span>
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

      // Tab switching listeners
      const tabBtns = document.querySelectorAll('#profile-tabs .tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tabId = e.currentTarget.dataset.tab;
          if (tabId) {
            currentActiveTab = tabId;
            router.handleRoute();
          }
        });
      });

      // Edit Avatar URL
      document.getElementById('edit-avatar-btn')?.addEventListener('click', () => {
        const currentAvatar = store.getState().user?.avatar || '';
        openModal({
          title: 'Update Profile Picture',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="avatar-url-input">Image URL</label>
              <input type="text" id="avatar-url-input" class="form-input" value="${currentAvatar}" placeholder="https://example.com/photo.jpg" />
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-avatar">Cancel</button>
            <button class="btn btn-primary" id="modal-save-avatar">Save Picture</button>
          `
        });

        document.getElementById('modal-cancel-avatar')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-avatar')?.addEventListener('click', () => {
          const newUrl = document.getElementById('avatar-url-input')?.value.trim();
          store.updateProfile({}, { avatar: newUrl });
          closeModal();
          showToast('Profile avatar updated!', 'success');
          router.handleRoute();
        });
      });

      // Edit Bio
      document.getElementById('edit-about-btn')?.addEventListener('click', () => {
        const currentAbout = store.getState().profile.about || '';
        openModal({
          title: 'Edit Bio / About',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="about-input">Professional Biography</label>
              <textarea id="about-input" class="form-textarea" rows="5">${currentAbout}</textarea>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-about">Cancel</button>
            <button class="btn btn-primary" id="modal-save-about">Save Bio</button>
          `
        });

        document.getElementById('modal-cancel-about')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-about')?.addEventListener('click', () => {
          const val = document.getElementById('about-input')?.value;
          store.updateProfile({ about: val });
          closeModal();
          showToast('Bio updated!', 'success');
          router.handleRoute();
        });
      });

      // Edit Private Info
      document.getElementById('edit-private-btn')?.addEventListener('click', () => {
        const p = store.getState().profile;
        openModal({
          title: 'Edit Private Contact Information',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label" for="phone-input">Phone Number</label>
              <input type="text" id="phone-input" class="form-input" value="${p.phone || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="address-input">Residential Address</label>
              <input type="text" id="address-input" class="form-input" value="${p.address || ''}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="emergency-input">Emergency Contact</label>
              <input type="text" id="emergency-input" class="form-input" value="${p.emergencyContact || ''}" />
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-private">Cancel</button>
            <button class="btn btn-primary" id="modal-save-private">Save Changes</button>
          `
        });

        document.getElementById('modal-cancel-private')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-private')?.addEventListener('click', () => {
          const phone = document.getElementById('phone-input')?.value;
          const address = document.getElementById('address-input')?.value;
          const emergencyContact = document.getElementById('emergency-input')?.value;

          store.updateProfile({ phone, address, emergencyContact });
          closeModal();
          showToast('Contact details saved!', 'success');
          router.handleRoute();
        });
      });

      // Skill Manager
      document.getElementById('add-skill-btn')?.addEventListener('click', () => {
        openModal({
          title: 'Add Skill',
          bodyHtml: `
            <div class="form-group">
              <label class="form-label required" for="skill-name-input">Skill Name</label>
              <input type="text" id="skill-name-input" class="form-input" placeholder="e.g. Node.js, GraphQL" />
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-skill">Cancel</button>
            <button class="btn btn-primary" id="modal-save-skill">Add Skill</button>
          `
        });

        document.getElementById('modal-cancel-skill')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-skill')?.addEventListener('click', () => {
          const name = document.getElementById('skill-name-input')?.value.trim();
          if (name) {
            store.addSkill(name);
            closeModal();
            showToast(`Skill '${name}' added!`, 'success');
            router.handleRoute();
          }
        });
      });

      document.querySelectorAll('.remove-skill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const skill = e.currentTarget.dataset.skill;
          if (skill) {
            store.removeSkill(skill);
            showToast(`Skill '${skill}' removed.`, 'info');
            router.handleRoute();
          }
        });
      });

      // Certification Manager
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
              <label class="form-label required" for="cert-year">Year Issued</label>
              <input type="text" id="cert-year" class="form-input" placeholder="2026" required />
            </div>
          `,
          footerHtml: `
            <button class="btn btn-secondary" id="modal-cancel-cert">Cancel</button>
            <button class="btn btn-primary" id="modal-save-cert">Save Certification</button>
          `
        });

        document.getElementById('modal-cancel-cert')?.addEventListener('click', closeModal);
        document.getElementById('modal-save-cert')?.addEventListener('click', () => {
          const name = document.getElementById('cert-name')?.value.trim();
          const issuer = document.getElementById('cert-issuer')?.value.trim();
          const year = document.getElementById('cert-year')?.value.trim();

          if (name && issuer && year) {
            store.addCertification({ name, issuer, year });
            closeModal();
            showToast('Certification added!', 'success');
            router.handleRoute();
          }
        });
      });

      // Resume download simulation
      document.getElementById('download-resume-btn')?.addEventListener('click', () => {
        showToast('Downloading resume PDF...', 'info');
      });

      // Security Form
      document.getElementById('security-pwd-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Password updated successfully!', 'success');
        document.getElementById('security-pwd-form').reset();
      });

      document.getElementById('view-full-payroll-btn')?.addEventListener('click', () => {
        router.navigate('/employee/payroll');
      });
    }
  };
}

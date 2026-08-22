// DAYFLOW HRMS — CENTRALIZED STATE STORE & MOCK DATA MANAGER
// Handles local reactive state and local storage persistence for frontend prototype.

const STORAGE_KEY = 'DAYFLOW_EMPLOYEE_STATE_V2';

const defaultState = {
  // Current Authenticated User
  // NOTE: `id` (Login/Employee ID) is a backend-assigned value in production.
  // The value below is a mock session placeholder, NOT a permanent ID format.
  user: {
    id: 'EMP-1042',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@dayflow.com',
    role: 'Employee',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    department: 'Engineering',
    designation: 'Senior Frontend Developer',
    joiningDate: '2022-03-15'
  },

  // Detailed Employee Profile
  profile: {
    phone: '+91 98765 43210',
    address: '42 MG Road, Indiranagar, Bengaluru, Karnataka 560038',
    emergencyContact: 'Mark Jenkins (+91 98765 00000)',
    dob: '1994-08-14',
    gender: 'Female',
    about: 'Passionate Senior Frontend Developer with 6+ years of experience building modern, responsive, and accessible user interfaces. Specialized in React, Vanilla JS, and UI design systems.',
    skills: ['JavaScript (ES6+)', 'React', 'CSS3 / HTML5', 'UI/UX Design', 'TypeScript', 'Web Accessibility'],
    certifications: [
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2023' },
      { name: 'Google UX Design Professional', issuer: 'Google', year: '2022' }
    ],
    resumeName: 'Sarah_Jenkins_Resume_2026.pdf',
    resumeSize: '1.2 MB'
  },

  // Attendance Data
  attendance: {
    isCheckedIn: false,
    checkInTime: null,
    todayHours: '0h 0m',
    status: 'Not Checked In',
    history: [
      { date: '2026-08-21', checkIn: '09:00 AM', checkOut: '05:30 PM', hours: '8h 30m', extra: '0h 30m', status: 'Present' },
      { date: '2026-08-20', checkIn: '09:15 AM', checkOut: '05:15 PM', hours: '8h 00m', extra: '0h 00m', status: 'Present' },
      { date: '2026-08-19', checkIn: '09:00 AM', checkOut: '01:00 PM', hours: '4h 00m', extra: '0h 00m', status: 'Half-day' },
      { date: '2026-08-18', checkIn: '-', checkOut: '-', hours: '0h 00m', extra: '0h 00m', status: 'Leave' },
      { date: '2026-08-17', checkIn: '08:50 AM', checkOut: '06:00 PM', hours: '9h 10m', extra: '1h 10m', status: 'Present' }
    ]
  },

  // Leave Applications & Balances
  leave: {
    balances: {
      pto: 14,
      sick: 7,
      unpaid: 10
    },
    requests: [
      {
        id: 'LV-101',
        type: 'Sick Leave',
        startDate: '2026-08-18',
        endDate: '2026-08-18',
        days: 1,
        reason: 'Severe migraine and fever.',
        attachment: 'Medical_Note_Aug18.pdf',
        status: 'Approved',
        appliedOn: '2026-08-17'
      },
      {
        id: 'LV-102',
        type: 'Paid Time Off',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        days: 5,
        reason: 'Annual family vacation.',
        attachment: null,
        status: 'Pending',
        appliedOn: '2026-08-20'
      }
    ]
  },

  // INDIA-FIRST READ-ONLY PAYROLL MOCK DATA (₹50,000 Monthly Wage Specification)
  payroll: {
    currency: '₹',
    month: 'August 2026',
    payPeriod: 'Aug 01, 2026 - Aug 31, 2026',
    payableDays: 22,
    unpaidDays: 0,
    grossWage: 50000,
    basicSalary: 25000,
    hra: 12500,
    standardAllowance: 4167,
    performanceBonus: 2082.50,
    lta: 2082.50,
    fixedAllowance: 4168,
    employeePF: 3000,   // 12% of Basic (₹25,000)
    employerPF: 3000,   // 12% of Basic (₹25,000)
    professionalTax: 200,
    totalDeductions: 3200, // PF (3000) + Tax (200)
    netPay: 46800       // ₹50,000 - ₹3,200
  }
};

class Store {
  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
      } catch (e) {
        this.state = defaultState;
      }
    } else {
      this.state = defaultState;
    }
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.save();
    this.notify();
  }

  // Local reactive persistence for prototype
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }

  login(userData) {
    this.setState({ user: userData });
  }

  logout() {
    this.setState({ user: null });
  }

  toggleCheckIn() {
    const attendance = { ...this.state.attendance };
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    if (!attendance.isCheckedIn) {
      attendance.isCheckedIn = true;
      attendance.checkInTime = timeStr;
      attendance.status = 'Present';
      const existingIdx = attendance.history.findIndex(h => h.date === dateStr);
      if (existingIdx >= 0) {
        attendance.history[existingIdx].checkIn = timeStr;
        attendance.history[existingIdx].status = 'Present';
      } else {
        attendance.history.unshift({
          date: dateStr,
          checkIn: timeStr,
          checkOut: '-',
          hours: 'In Progress',
          extra: '0h 0m',
          status: 'Present'
        });
      }
    } else {
      attendance.isCheckedIn = false;
      attendance.checkOutTime = timeStr;
      const existingIdx = attendance.history.findIndex(h => h.date === dateStr);
      if (existingIdx >= 0) {
        attendance.history[existingIdx].checkOut = timeStr;
        attendance.history[existingIdx].hours = '8h 15m';
      }
    }

    this.setState({ attendance });
  }

  updateProfile(updatedProfileFields, updatedUserFields) {
    const profile = { ...this.state.profile, ...updatedProfileFields };
    const user = updatedUserFields ? { ...this.state.user, ...updatedUserFields } : this.state.user;
    this.setState({ profile, user });
  }

  addSkill(skillName) {
    if (!skillName) return;
    const skills = [...this.state.profile.skills];
    if (!skills.includes(skillName)) {
      skills.push(skillName);
      this.updateProfile({ skills });
    }
  }

  removeSkill(skillName) {
    const skills = this.state.profile.skills.filter(s => s !== skillName);
    this.updateProfile({ skills });
  }

  addCertification(cert) {
    const certifications = [...this.state.profile.certifications, cert];
    this.updateProfile({ certifications });
  }

  addLeaveRequest(requestData) {
    const leave = { ...this.state.leave };
    const newReq = {
      id: `LV-${Math.floor(100 + Math.random() * 900)}`,
      ...requestData,
      status: 'Pending',
      appliedOn: new Date().toISOString().split('T')[0]
    };
    leave.requests.unshift(newReq);
    this.setState({ leave });
  }
}

export const store = new Store();

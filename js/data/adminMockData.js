// DAYFLOW HRMS — ADMIN MOCK DATA SEED
// Frontend-only mock dataset for the Admin/HR console. Replace with API calls
// when the backend is wired in; consumers should only depend on adminStore.

export const TODAY_ISO = '2026-08-21'; // mock "today" (aligns with employee portal data)
export const CURRENT_MONTH = { year: 2026, month: 8, label: 'August 2026', workingDays: 22 };
export const NEXT_PAYOUT_DATE = 'Aug 31, 2026';

export const DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance', 'Design', 'Operations'
];

export const LEAVE_TYPES = [
  'Paid Time Off', 'Sick Leave', 'Casual Leave', 'Earned Leave', 'Unpaid Leave', 'Work From Home'
];

// Initials-avatar palette (cycled by employee index)
export const AVATAR_PALETTE = [
  ['#1a73e8', '#ffffff'], ['#188038', '#ffffff'], ['#b06000', '#ffffff'],
  ['#d93025', '#ffffff'], ['#7b1fa2', '#ffffff'], ['#00838f', '#ffffff'],
  ['#5f6368', '#ffffff'], ['#c2185b', '#ffffff']
];

export const ADMIN_PROFILE = {
  id: 'ADM-0001',
  name: 'Priya Sharma',
  email: 'priya.sharma@dayflow.com',
  role: 'Admin',
  designation: 'HR Manager',
  department: 'Human Resources'
};

export const EMPLOYEES = [
  {
    id: 'EMP-1001',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@dayflow.com',
    phone: '+91 98200 11223',
    dob: '1992-01-24',
    gender: 'Male',
    address: '301 Sunrise Apartments, Koramangala, Bengaluru 560034',
    emergencyContact: 'Rohini Mehta (+91 98200 55511)',
    about: 'Backend engineer focused on scalable APIs, distributed systems and clean domain modelling. 8+ years across fintech and SaaS.',
    department: 'Engineering',
    position: 'Senior Backend Developer',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (Hybrid)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2021-06-14',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis', 'System Design'],
    certifications: [
      { name: 'AWS Solutions Architect - Associate', issuer: 'Amazon Web Services', year: '2024' }
    ],
    resume: { name: 'Arjun_Mehta_Resume.pdf', size: '0.9 MB', updatedOn: '2026-05-02' },
    bank: { bankName: 'HDFC Bank', accountNumber: 'xxxx4421', ifsc: 'HDFC0001234', branch: 'Koramangala, Bengaluru', pan: 'ABCPM1234K', uan: '101234567890' },
    wage: 90000,
    payableDays: 22
  },
  {
    id: 'EMP-1002',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@dayflow.com',
    phone: '+91 98765 43210',
    dob: '1994-08-14',
    gender: 'Female',
    address: '42 MG Road, Indiranagar, Bengaluru, Karnataka 560038',
    emergencyContact: 'Mark Jenkins (+91 98765 00000)',
    about: 'Passionate Senior Frontend Developer with 6+ years of experience building modern, responsive, and accessible user interfaces.',
    department: 'Engineering',
    position: 'Senior Frontend Developer',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (Hybrid)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2022-03-15',
    skills: ['JavaScript (ES6+)', 'React', 'CSS3 / HTML5', 'TypeScript', 'Web Accessibility'],
    certifications: [
      { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2023' },
      { name: 'Google UX Design Professional', issuer: 'Google', year: '2022' }
    ],
    resume: { name: 'Sarah_Jenkins_Resume_2026.pdf', size: '1.2 MB', updatedOn: '2026-07-18' },
    bank: { bankName: 'ICICI Bank', accountNumber: 'xxxx8830', ifsc: 'ICIC0004521', branch: 'Indiranagar, Bengaluru', pan: 'BXQPJ7762L', uan: '101098765432' },
    wage: 50000,
    payableDays: 22
  },
  {
    id: 'EMP-1003',
    name: 'Rahul Verma',
    email: 'rahul.verma@dayflow.com',
    phone: '+91 99870 22114',
    dob: '1995-11-02',
    gender: 'Male',
    address: '78 Hennur Main Road, Bengaluru 560077',
    emergencyContact: 'Sunita Verma (+91 99870 22115)',
    about: 'Sales professional with a track record of closing enterprise accounts and nurturing long-term client relationships.',
    department: 'Sales',
    position: 'Sales Executive',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Mumbai (On-site)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2023-01-09',
    skills: ['Lead Qualification', 'CRM (Zoho)', 'Negotiation', 'B2B Sales'],
    certifications: [],
    resume: { name: 'Rahul_Verma_Resume.pdf', size: '0.7 MB', updatedOn: '2025-12-29' },
    bank: { bankName: 'State Bank of India', accountNumber: 'xxxx1102', ifsc: 'SBIN0007788', branch: 'Hennur, Bengaluru', pan: 'CDEPV4321M', uan: '101234111222' },
    wage: 42000,
    payableDays: 22
  },
  {
    id: 'EMP-1004',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@dayflow.com',
    phone: '+91 97400 33455',
    dob: '1996-04-18',
    gender: 'Female',
    address: '12 Cooke Town, Bangalore 560005',
    emergencyContact: 'Deepak Iyer (+91 97400 33456)',
    about: 'Product designer who cares about research-driven UX and crisp visual systems. Previously at two early-stage startups.',
    department: 'Design',
    position: 'UI/UX Designer',
    employmentStatus: 'On Leave',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (Hybrid)',
    shift: 'Flexible',
    joiningDate: '2022-09-05',
    skills: ['Figma', 'User Research', 'Design Systems', 'Prototyping'],
    certifications: [
      { name: 'Nielsen Norman Group UX Certification', issuer: 'NN/g', year: '2024' }
    ],
    resume: { name: 'Ananya_Iyer_Portfolio.pdf', size: '2.4 MB', updatedOn: '2026-06-11' },
    bank: { bankName: 'Axis Bank', accountNumber: 'xxxx6675', ifsc: 'UTIB0002233', branch: 'Frazer Town, Bengaluru', pan: 'DEFPI8890N', uan: '101555666777' },
    wage: 55000,
    payableDays: 22
  },
  {
    id: 'EMP-1005',
    name: 'Vikram Singh',
    email: 'vikram.singh@dayflow.com',
    phone: '+91 90190 44332',
    dob: '1990-07-09',
    gender: 'Male',
    address: '5 Jayanagar 4th Block, Bengaluru 560011',
    emergencyContact: 'Harpreet Kaur (+91 90190 44330)',
    about: 'Marketing lead blending performance campaigns with brand storytelling. Growth-minded and data-driven.',
    department: 'Marketing',
    position: 'Marketing Lead',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Delhi (Remote)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2021-11-22',
    skills: ['SEO / SEM', 'Content Strategy', 'Google Analytics', 'HubSpot'],
    certifications: [
      { name: 'Google Ads Search Certification', issuer: 'Google', year: '2025' }
    ],
    resume: { name: 'Vikram_Singh_Resume.pdf', size: '0.8 MB', updatedOn: '2026-01-20' },
    bank: { bankName: 'Kotak Mahindra Bank', accountNumber: 'xxxx9034', ifsc: 'KKBK0000560', branch: 'Jayanagar, Bengaluru', pan: 'EFGPS1122O', uan: '101888999000' },
    wage: 72000,
    payableDays: 22
  },
  {
    id: 'EMP-1006',
    name: 'Neha Kulkarni',
    email: 'neha.kulkarni@dayflow.com',
    phone: '+91 98450 55667',
    dob: '1993-02-27',
    gender: 'Female',
    address: '22 Viman Nagar, Pune 411014',
    emergencyContact: 'Amit Kulkarni (+91 98450 55668)',
    about: 'Accounts manager ensuring compliant books, timely closes and clean audits. Comfortable with both Tally and Zoho Books.',
    department: 'Finance',
    position: 'Accounts Manager',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Pune (On-site)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2020-08-03',
    skills: ['GST & TDS Compliance', 'Tally Prime', 'Financial Reporting', 'Payroll Ops'],
    certifications: [
      { name: 'Certified Management Accountant (CMA)', issuer: 'IMA', year: '2022' }
    ],
    resume: { name: 'Neha_Kulkarni_Resume.pdf', size: '0.6 MB', updatedOn: '2025-10-14' },
    bank: { bankName: 'Bank of Baroda', accountNumber: 'xxxx2245', ifsc: 'BARB0VIMAN', branch: 'Viman Nagar, Pune', pan: 'GHIJK2233P', uan: '101234556677' },
    wage: 65000,
    payableDays: 22
  },
  {
    id: 'EMP-1007',
    name: 'Rohan Patel',
    email: 'rohan.patel@dayflow.com',
    phone: '+91 79990 66778',
    dob: '1999-10-16',
    gender: 'Male',
    address: '9 Whitefield Main Road, Bengaluru 560066',
    emergencyContact: 'Kiran Patel (+91 79990 66779)',
    about: 'QA engineer passionate about automation-first testing and shipping regression-free releases.',
    department: 'Engineering',
    position: 'QA Engineer',
    employmentStatus: 'Probation',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (On-site)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2026-07-01',
    skills: ['Playwright', 'API Testing', 'Jest', 'SQL'],
    certifications: [],
    resume: { name: 'Rohan_Patel_Resume.pdf', size: '0.5 MB', updatedOn: '2026-06-25' },
    bank: { bankName: 'Yes Bank', accountNumber: 'xxxx7789', ifsc: 'YESB0000123', branch: 'Whitefield, Bengaluru', pan: 'HIJKP6677Q', uan: '101777888999' },
    wage: 35000,
    payableDays: 22
  },
  {
    id: 'EMP-1008',
    name: 'Ishita Rao',
    email: 'ishita.rao@dayflow.com',
    phone: '+91 96633 77889',
    dob: '1997-12-05',
    gender: 'Female',
    address: '40 HSR Layout Sector 2, Bengaluru 560102',
    emergencyContact: 'Lata Rao (+91 96633 77880)',
    about: 'HR executive handling onboarding, engagement and day-to-day people operations for a fast-growing team.',
    department: 'Human Resources',
    position: 'HR Executive',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (Hybrid)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2023-06-19',
    skills: ['Onboarding', 'Employee Engagement', 'HRIS Tools', 'Conflict Resolution'],
    certifications: [
      { name: 'SHRM-CP', issuer: 'SHRM', year: '2024' }
    ],
    resume: { name: 'Ishita_Rao_Resume.pdf', size: '0.7 MB', updatedOn: '2026-03-08' },
    bank: { bankName: 'HDFC Bank', accountNumber: 'xxxx3356', ifsc: 'HDFC0009087', branch: 'HSR Layout, Bengaluru', pan: 'IJKLR9900R', uan: '101666777888' },
    wage: 40000,
    payableDays: 22
  },
  {
    id: 'EMP-1009',
    name: 'Karan Malhotra',
    email: 'karan.malhotra@dayflow.com',
    phone: '+91 98110 88990',
    dob: '1994-06-30',
    gender: 'Male',
    address: '17 Sector 45, Gurugram 122003',
    emergencyContact: 'Ritu Malhotra (+91 98110 88991)',
    about: 'Operations specialist keeping logistics, procurement and vendor management running smoothly.',
    department: 'Operations',
    position: 'Operations Executive',
    employmentStatus: 'Active',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Gurugram (On-site)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2022-01-10',
    skills: ['Vendor Management', 'Logistics', 'Excel Modelling', 'Process SOPs'],
    certifications: [],
    resume: { name: 'Karan_Malhotra_Resume.pdf', size: '0.8 MB', updatedOn: '2025-11-30' },
    bank: { bankName: 'IndusInd Bank', accountNumber: 'xxxx4467', ifsc: 'INDB0000456', branch: 'Sector 45, Gurugram', pan: 'JKLMN4455S', uan: '101999111222' },
    wage: 38000,
    payableDays: 22
  },
  {
    id: 'EMP-1010',
    name: 'Meera Nair',
    email: 'meera.nair@dayflow.com',
    phone: '+91 95350 99001',
    dob: '1991-09-12',
    gender: 'Female',
    address: '63 Kadugodi, Whitefield, Bengaluru 560067',
    emergencyContact: 'Sunil Nair (+91 95350 99002)',
    about: 'DevOps engineer experienced in CI/CD pipelines, Kubernetes clusters and cloud cost optimisation.',
    department: 'Engineering',
    position: 'DevOps Engineer',
    employmentStatus: 'Inactive',
    employmentType: 'Full-time',
    manager: 'Priya Sharma',
    location: 'Bengaluru (Remote)',
    shift: 'General (9:30 AM - 6:30 PM)',
    joiningDate: '2020-04-20',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'GitHub Actions', 'Observability'],
    certifications: [
      { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'CNCF', year: '2023' }
    ],
    resume: { name: 'Meera_Nair_Resume.pdf', size: '0.9 MB', updatedOn: '2025-08-19' },
    bank: { bankName: 'Federal Bank', accountNumber: 'xxxx5578', ifsc: 'FDRL0001234', branch: 'Whitefield, Bengaluru', pan: 'KLMNO6688T', uan: '101333444555' },
    wage: 85000,
    payableDays: 22
  }
];

// ---------------------------------------------------------------------------
// Deterministic pseudo-random helpers so mock attendance never flickers
// between renders or reloads.
// ---------------------------------------------------------------------------

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 31) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatTime12(totalMinutes) {
  if (totalMinutes == null) return '-';
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad2(h12)}:${pad2(m)} ${period}`;
}

export function formatHoursLabel(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  return `${Math.floor(totalMinutes / 60)}h ${pad2(totalMinutes % 60)}m`;
}

function makeRecord(employeeId, dateISO, status, checkInMin, checkOutMin) {
  const d = new Date(Number(dateISO.slice(0, 4)), Number(dateISO.slice(5, 7)) - 1, Number(dateISO.slice(8, 10)));
  const worked = status === 'Present' || status === 'Half-day' ? Math.max(0, checkOutMin - checkInMin) : 0;
  const extra = Math.max(0, worked - 480);
  return {
    id: `ATT-${employeeId}-${dateISO}`,
    employeeId,
    date: dateISO,
    dayName: DAY_NAMES[d.getDay()],
    checkIn: checkInMin != null ? formatTime12(checkInMin) : '-',
    checkOut: checkOutMin != null ? formatTime12(checkOutMin) : '-',
    workMinutes: worked,
    hoursLabel: formatHoursLabel(worked),
    extraMinutes: extra,
    extraLabel: formatHoursLabel(extra),
    status
  };
}

// Hand-picked records so today's dashboard numbers tell a clean story and
// stay consistent with the employee portal's own history.
const ATTENDANCE_OVERRIDES = {
  'EMP-1002': {
    '2026-08-21': ['Present', 540, 1050],
    '2026-08-20': ['Present', 555, 1035],
    '2026-08-19': ['Half-day', 540, 780],
    '2026-08-18': ['Leave', null, null],
    '2026-08-17': ['Present', 530, 1080]
  },
  'EMP-1004': {
    '2026-08-19': ['Leave', null, null],
    '2026-08-20': ['Leave', null, null],
    '2026-08-21': ['Leave', null, null]
  },
  'EMP-1007': {
    '2026-08-20': ['Half-day', 550, 800],
    '2026-08-21': ['Present', 528, 1042]
  },
  'EMP-1009': {
    '2026-08-21': ['Absent', null, null],
    '2026-08-20': ['Present', 545, 1030]
  },
  'EMP-1010': {
    '2026-08-18': ['Absent', null, null],
    '2026-08-19': ['Absent', null, null],
    '2026-08-20': ['Absent', null, null],
    '2026-08-21': ['Absent', null, null]
  },
  'EMP-1001': { '2026-08-21': ['Present', 534, 1068] },
  'EMP-1003': { '2026-08-21': ['Present', 549, 1041] },
  'EMP-1005': { '2026-08-21': ['Present', 540, 1022] },
  'EMP-1006': { '2026-08-21': ['Present', 537, 1053] },
  'EMP-1008': { '2026-08-21': ['Present', 543, 1049] }
};

// Generates deterministic attendance for every employee across all weekdays
// of the given month, up to (and including) TODAY_ISO.
export function generateMonthAttendance(year = CURRENT_MONTH.year, month = CURRENT_MONTH.month) {
  const records = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (const emp of EMPLOYEES) {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const weekday = dateObj.getDay();
      if (weekday === 0 || weekday === 6) continue;

      const dateISO = `${year}-${pad2(month)}-${pad2(day)}`;
      if (dateISO > TODAY_ISO) break;

      const override = ATTENDANCE_OVERRIDES[emp.id] && ATTENDANCE_OVERRIDES[emp.id][dateISO];
      if (override) {
        records.push(makeRecord(emp.id, dateISO, override[0], override[1], override[2]));
        continue;
      }

      const rand = seededRandom(hashString(`${emp.id}:${dateISO}`))();
      let status;
      if (emp.employmentStatus === 'Inactive') {
        status = rand < 0.55 ? 'Absent' : 'Leave';
      } else if (rand < 0.86) {
        status = 'Present';
      } else if (rand < 0.92) {
        status = 'Half-day';
      } else if (rand < 0.97) {
        status = 'Leave';
      } else {
        status = 'Absent';
      }

      if (status === 'Present' || status === 'Half-day') {
        const inMin = 525 + Math.floor(seededRandom(hashString(`in:${emp.id}${dateISO}`))() * 35); // 8:45 - 9:20
        const duration = status === 'Half-day' ? 235 + Math.floor(rand * 30) : 475 + Math.floor(rand * 65);
        records.push(makeRecord(emp.id, dateISO, status, inMin, inMin + duration));
      } else {
        records.push(makeRecord(emp.id, dateISO, status, null, null));
      }
    }
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.employeeId.localeCompare(b.employeeId)));
}

// ---------------------------------------------------------------------------
// LEAVE REQUESTS
// ---------------------------------------------------------------------------

export const LEAVE_REQUESTS = [
  {
    id: 'LV-201',
    employeeId: 'EMP-1004',
    type: 'Paid Time Off',
    startDate: '2026-08-19',
    endDate: '2026-08-23',
    days: 5,
    remarks: 'Attending a family wedding out of station.',
    attachment: { name: 'Wedding_Function_Invite.pdf', size: '212 KB' },
    status: 'Approved',
    appliedOn: '2026-08-10',
    decidedBy: 'Priya Sharma',
    decidedOn: '2026-08-11',
    comments: [{ author: 'Priya Sharma', text: 'Approved. Enjoy the wedding!', time: '2026-08-11 10:24' }]
  },
  {
    id: 'LV-202',
    employeeId: 'EMP-1009',
    type: 'Sick Leave',
    startDate: '2026-08-21',
    endDate: '2026-08-21',
    days: 1,
    remarks: 'Food poisoning since last night, unable to come in. Doctor has advised rest.',
    attachment: { name: 'Medical_Certificate_Karan.pdf', size: '184 KB' },
    status: 'Pending',
    appliedOn: '2026-08-21',
    decidedBy: null,
    decidedOn: null,
    comments: []
  },
  {
    id: 'LV-203',
    employeeId: 'EMP-1005',
    type: 'Casual Leave',
    startDate: '2026-08-25',
    endDate: '2026-08-26',
    days: 2,
    remarks: 'Personal errands in hometown.',
    attachment: null,
    status: 'Pending',
    appliedOn: '2026-08-19',
    decidedBy: null,
    decidedOn: null,
    comments: []
  },
  {
    id: 'LV-204',
    employeeId: 'EMP-1006',
    type: 'Earned Leave',
    startDate: '2026-09-02',
    endDate: '2026-09-04',
    days: 3,
    remarks: 'Short trip planned with family.',
    attachment: null,
    status: 'Pending',
    appliedOn: '2026-08-20',
    decidedBy: null,
    decidedOn: null,
    comments: []
  },
  {
    id: 'LV-205',
    employeeId: 'EMP-1010',
    type: 'Unpaid Leave',
    startDate: '2026-08-12',
    endDate: '2026-08-14',
    days: 3,
    remarks: 'Relocating to a new apartment.',
    attachment: null,
    status: 'Rejected',
    appliedOn: '2026-08-05',
    decidedBy: 'Priya Sharma',
    decidedOn: '2026-08-06',
    comments: [{ author: 'Priya Sharma', text: 'Rejected - critical release week. Please reapply for September.', time: '2026-08-06 16:02' }]
  },
  {
    id: 'LV-206',
    employeeId: 'EMP-1007',
    type: 'Work From Home',
    startDate: '2026-08-27',
    endDate: '2026-08-28',
    days: 2,
    remarks: 'Home internet upgrade scheduled; will be fully available online.',
    attachment: null,
    status: 'Pending',
    appliedOn: '2026-08-20',
    decidedBy: null,
    decidedOn: null,
    comments: []
  },
  {
    id: 'LV-207',
    employeeId: 'EMP-1002',
    type: 'Sick Leave',
    startDate: '2026-08-18',
    endDate: '2026-08-18',
    days: 1,
    remarks: 'Severe migraine and fever.',
    attachment: { name: 'Medical_Note_Aug18.pdf', size: '150 KB' },
    status: 'Approved',
    appliedOn: '2026-08-17',
    decidedBy: 'Priya Sharma',
    decidedOn: '2026-08-17',
    comments: [{ author: 'Priya Sharma', text: 'Get well soon.', time: '2026-08-17 18:10' }]
  },
  {
    id: 'LV-208',
    employeeId: 'EMP-1001',
    type: 'Paid Time Off',
    startDate: '2026-09-07',
    endDate: '2026-09-11',
    days: 5,
    remarks: 'Annual vacation with family.',
    attachment: null,
    status: 'Pending',
    appliedOn: '2026-08-21',
    decidedBy: null,
    decidedOn: null,
    comments: []
  }
];

// ---------------------------------------------------------------------------
// ACTIVITY FEED + NOTIFICATIONS
// ---------------------------------------------------------------------------

export const SEED_ACTIVITY = [
  { id: 'ACT-1', icon: 'user-plus', tone: 'success', title: 'New employee onboarded', desc: 'Rohan Patel joined Engineering as QA Engineer (probation).', time: 'Aug 21, 2026 · 11:20 AM' },
  { id: 'ACT-2', icon: 'plane', tone: 'info', title: 'Leave approved', desc: 'Ananya Iyer\'s Paid Time Off (Aug 19 - Aug 23) was approved.', time: 'Aug 11, 2026 · 10:24 AM' },
  { id: 'ACT-3', icon: 'x-circle', tone: 'danger', title: 'Leave rejected', desc: 'Meera Nair\'s Unpaid Leave (Aug 12 - Aug 14) was rejected.', time: 'Aug 6, 2026 · 4:02 PM' },
  { id: 'ACT-4', icon: 'receipt', tone: 'neutral', title: 'Payroll draft generated', desc: 'July 2026 payroll register was prepared for review.', time: 'Aug 1, 2026 · 9:00 AM' }
];

export const SEED_NOTIFICATIONS = [
  { id: 'NTF-1', icon: 'calendar', tone: 'warning', title: 'New leave request', desc: 'Karan Malhotra applied for Sick Leave (Aug 21).', time: '2h ago', read: false },
  { id: 'NTF-2', icon: 'clock', tone: 'info', title: 'Attendance flagged', desc: 'Rohan Patel marked Half-day on Aug 20.', time: 'Yesterday', read: false },
  { id: 'NTF-3', icon: 'receipt', tone: 'neutral', title: 'Payroll pending review', desc: 'August 2026 payroll draft is awaiting your review.', time: '2d ago', read: true },
  { id: 'NTF-4', icon: 'badge-check', tone: 'success', title: 'Probation ending soon', desc: 'Rohan Patel completes probation on Sep 30, 2026.', time: '4d ago', read: true }
];

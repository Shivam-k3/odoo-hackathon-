# Dayflow HRMS — Backend API Documentation (Member 1)

This document provides complete technical specifications for the Dayflow HRMS Backend APIs covering Authentication, Employee Management, Profile Self-Service, and Attendance Tracking.

---

## Base URL
```
http://localhost:5000/api
```

## Response Envelope Standard
All APIs return a consistent JSON response structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Clear error description",
  "errors": { ... }
}
```

---

## 1. Authentication APIs

### 1.1 Sign Up
* **Method**: `POST`
* **URL**: `/api/auth/signup`
* **Authentication**: None (Public)
* **Role**: None
* **Description**: Registers a new user account and employee profile. Automatically generates Dayflow Login ID and securely hashes password.
* **Request Body**:
```json
{
  "email": "alice.smith@dayflow.com",
  "password": "SecurePassword123!",
  "firstName": "Alice",
  "lastName": "Smith",
  "phone": "+91 9876543210",
  "department": "Engineering",
  "designation": "Software Engineer",
  "joiningDate": "2026-01-10"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-user-id",
      "email": "alice.smith@dayflow.com",
      "role": "EMPLOYEE",
      "status": "ACTIVE"
    },
    "employee": {
      "id": "uuid-employee-id",
      "loginId": "OIALSM20260001",
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@dayflow.com",
      "department": "Engineering",
      "designation": "Software Engineer",
      "profilePicture": null
    }
  }
}
```
* **Error Cases**:
  - `400 Bad Request`: Validation failure (short password, invalid email format).
  - `409 Conflict`: Email already exists.

---

### 1.2 Sign In (Login)
* **Method**: `POST`
* **URL**: `/api/auth/login`
* **Authentication**: None (Public)
* **Role**: None
* **Description**: Authenticate user via either **Dayflow Login ID** (e.g. `OIALSM20260001`) or **Email** (`alice.smith@dayflow.com`) and password.
* **Request Body**:
```json
{
  "loginIdentifier": "OIALSM20260001",
  "password": "SecurePassword123!"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-user-id",
      "email": "alice.smith@dayflow.com",
      "role": "EMPLOYEE",
      "status": "ACTIVE"
    },
    "employee": {
      "id": "uuid-employee-id",
      "loginId": "OIALSM20260001",
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@dayflow.com",
      "department": "Engineering",
      "designation": "Software Engineer",
      "profilePicture": null
    }
  }
}
```
* **Error Cases**:
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account is inactive or suspended.

---

### 1.3 Get Current User Identity
* **Method**: `GET`
* **URL**: `/api/auth/me`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Current user profile retrieved",
  "data": {
    "id": "uuid-user-id",
    "email": "alice.smith@dayflow.com",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2026-01-10T00:00:00.000Z",
    "employee": {
      "id": "uuid-employee-id",
      "loginId": "OIALSM20260001",
      "firstName": "Alice",
      "lastName": "Smith",
      "email": "alice.smith@dayflow.com",
      "phone": "+91 9876543210",
      "department": "Engineering",
      "designation": "Software Engineer",
      "skills": ["TypeScript", "Node.js"],
      "certifications": ["Odoo Certified"]
    }
  }
}
```
* **Error Cases**:
  - `401 Unauthorized`: Missing, invalid or expired token.

---

### 1.4 Logout
* **Method**: `POST`
* **URL**: `/api/auth/logout`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {
    "loggedOut": true
  }
}
```

---

## 2. Employee Profile & Management APIs

### 2.1 Get Own Employee Profile
* **Method**: `GET`
* **URL**: `/api/employees/me`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Description**: Returns full self-service profile details for current authenticated employee.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employee profile retrieved",
  "data": {
    "id": "uuid-employee-id",
    "userId": "uuid-user-id",
    "loginId": "OIALSM20260001",
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@dayflow.com",
    "phone": "+91 9876543210",
    "profilePicture": "https://example.com/avatar.jpg",
    "department": "Engineering",
    "designation": "Software Engineer",
    "joiningDate": "2026-01-10T00:00:00.000Z",
    "address": "123 Innovation Way, Tech Hub",
    "about": "Backend engineer passionate about scalable systems.",
    "skills": ["Node.js", "Express", "TypeScript"],
    "certifications": ["AWS Developer Associate"],
    "user": {
      "id": "uuid-user-id",
      "email": "alice.smith@dayflow.com",
      "role": "EMPLOYEE",
      "status": "ACTIVE"
    }
  }
}
```

---

### 2.2 Update Own Profile
* **Method**: `PUT` or `PATCH`
* **URL**: `/api/employees/me`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Description**: Updates allowed profile fields. Whitelist strictly enforced (cannot edit salary, role, department, designation, or loginId).
* **Request Body**:
```json
{
  "phone": "+91 9876543211",
  "address": "456 Residency Rd, Bangalore",
  "profilePicture": "https://example.com/new-avatar.jpg",
  "about": "Senior Backend Developer",
  "skills": ["TypeScript", "Node.js", "PostgreSQL", "Prisma"],
  "certifications": ["Odoo Certified", "GCP Professional Cloud Developer"]
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { ... }
}
```

---

### 2.3 Admin: List / Search All Employees
* **Method**: `GET`
* **URL**: `/api/employees?query=Alice&department=Engineering&page=1&limit=20`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Query Parameters**:
  - `query` (optional): search keyword across name, email, loginId, department.
  - `department` (optional): department filter.
  - `page` (optional): page number (default 1).
  - `limit` (optional): items per page (default 20).
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "employees": [ ... ]
  }
}
```
* **Error Cases**:
  - `403 Forbidden`: Non-admin users.

---

### 2.4 Admin: Get Employee By ID
* **Method**: `GET`
* **URL**: `/api/employees/:id`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": { ... }
}
```

---

### 2.5 Admin: Create Employee
* **Method**: `POST`
* **URL**: `/api/employees`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Request Body**:
```json
{
  "email": "charlie.brown@dayflow.com",
  "password": "TemporaryPassword123!",
  "firstName": "Charlie",
  "lastName": "Brown",
  "phone": "+91 9123456789",
  "department": "Finance",
  "designation": "Financial Analyst",
  "salary": 85000,
  "role": "EMPLOYEE",
  "status": "ACTIVE"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": { ... }
}
```

---

### 2.6 Admin: Update Employee
* **Method**: `PUT` or `PATCH`
* **URL**: `/api/employees/:id`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Request Body**:
```json
{
  "department": "Corporate Finance",
  "designation": "Senior Financial Analyst",
  "salary": 95000,
  "status": "ACTIVE"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": { ... }
}
```

---

## 3. Attendance APIs

### 3.1 Check-In
* **Method**: `POST`
* **URL**: `/api/attendance/check-in`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Description**: Records employee check-in timestamp for today. Prevents duplicate check-in.
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Checked in successfully",
  "data": {
    "id": "uuid-attendance-id",
    "employeeId": "uuid-employee-id",
    "date": "2026-08-22",
    "checkInTime": "2026-08-22T09:00:00.000Z",
    "checkOutTime": null,
    "workHours": 0,
    "extraHours": 0,
    "status": "PRESENT"
  }
}
```
* **Error Cases**:
  - `400 Bad Request`: "You have already checked in for today".

---

### 3.2 Check-Out
* **Method**: `POST`
* **URL**: `/api/attendance/check-out`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Description**: Records check-out timestamp, calculates exact work hours and overtime (extra hours) based on standard 8-hour workday. Sets `HALF_DAY` if work hours < 4.0.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Checked out successfully",
  "data": {
    "id": "uuid-attendance-id",
    "employeeId": "uuid-employee-id",
    "date": "2026-08-22",
    "checkInTime": "2026-08-22T09:00:00.000Z",
    "checkOutTime": "2026-08-22T18:00:00.000Z",
    "workHours": 9.0,
    "extraHours": 1.0,
    "status": "PRESENT"
  }
}
```
* **Error Cases**:
  - `400 Bad Request`: "No active check-in found for today. Please check in first."
  - `400 Bad Request`: "You have already checked out for today."

---

### 3.3 Get Today's Status
* **Method**: `GET`
* **URL**: `/api/attendance/me/today`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Today's attendance retrieved",
  "data": {
    "id": "uuid-attendance-id",
    "employeeId": "uuid-employee-id",
    "date": "2026-08-22",
    "checkInTime": "2026-08-22T09:00:00.000Z",
    "checkOutTime": null,
    "workHours": 0,
    "extraHours": 0,
    "status": "PRESENT"
  }
}
```

---

### 3.4 Get Own Attendance History
* **Method**: `GET`
* **URL**: `/api/attendance/me?page=1&limit=30`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Attendance history retrieved",
  "data": {
    "total": 15,
    "page": 1,
    "limit": 30,
    "totalPages": 1,
    "records": [ ... ]
  }
}
```

---

### 3.5 Get Attendance By Date
* **Method**: `GET`
* **URL**: `/api/attendance/me/date?date=2026-08-22`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Attendance for date retrieved",
  "data": { ... }
}
```

---

### 3.6 Get Weekly Attendance
* **Method**: `GET`
* **URL**: `/api/attendance/me/weekly`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Weekly attendance retrieved",
  "data": {
    "startDate": "2026-08-17",
    "endDate": "2026-08-23",
    "totalWorkHours": 42.5,
    "totalExtraHours": 2.5,
    "records": [ ... ]
  }
}
```

---

### 3.7 Get Monthly Attendance
* **Method**: `GET`
* **URL**: `/api/attendance/me/monthly?month=2026-08`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `EMPLOYEE` or `ADMIN_HR`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Monthly attendance retrieved",
  "data": {
    "month": "2026-08",
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "stats": {
      "presentDays": 20,
      "halfDays": 1,
      "leaveDays": 0,
      "totalWorkHours": 168.0,
      "totalExtraHours": 8.0
    },
    "records": [ ... ]
  }
}
```

---

### 3.8 Admin: View All Attendance
* **Method**: `GET`
* **URL**: `/api/attendance/admin/all?date=2026-08-22&department=Engineering&page=1&limit=30`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Organization attendance records retrieved",
  "data": {
    "total": 50,
    "page": 1,
    "limit": 30,
    "totalPages": 2,
    "records": [ ... ]
  }
}
```

---

### 3.9 Admin: Today's Company Attendance Dashboard
* **Method**: `GET`
* **URL**: `/api/attendance/admin/today`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Today's organization attendance summary",
  "data": {
    "date": "2026-08-22",
    "totalEmployees": 100,
    "summary": {
      "presentCount": 92,
      "halfDayCount": 2,
      "leaveCount": 3,
      "absentCount": 3,
      "checkedInCount": 94,
      "checkedOutCount": 88
    },
    "records": [ ... ]
  }
}
```

---

### 3.10 Admin: Monthly Organization Summary
* **Method**: `GET`
* **URL**: `/api/attendance/admin/monthly-summary?month=2026-08`
* **Authentication**: Required (`Bearer <JWT>`)
* **Role**: `ADMIN_HR` only
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Monthly attendance summary retrieved",
  "data": {
    "month": "2026-08",
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "totalEmployees": 100,
    "totalRecords": 2100,
    "aggregateStats": {
      "presentTotal": 2020,
      "halfDayTotal": 40,
      "leaveTotal": 40,
      "totalWorkHours": 16960.0,
      "totalExtraHours": 960.0,
      "averageWorkHoursPerDay": 8.08
    }
  }
}
```

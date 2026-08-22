# 🕒 Dayflow HRMS — Backend API

> Robust, secure, and performant backend service for the **Dayflow Human Resource Management System (HRMS)** built for the Odoo Hackathon.

[![Tests](https://img.shields.io/badge/tests-36%20passed-brightgreen.svg)](#testing)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node->=20.0.0-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-ISC-lightgrey.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Security & Authorization](#-security--authorization)
- [Testing](#-testing)
- [Git Workflow](#-git-workflow)

---

## 🌟 Overview

This service implements the core authentication, identity management, employee profile self-service, administrative directory, and attendance tracking workflows for the Dayflow HRMS platform.

---

## 🚀 Key Features

### 1. Authentication & Identity Management
- **Universal Sign-In**: Login using either **Email** or **Dayflow Login ID** + Password.
- **Password Security**: Salted Bcrypt (10 rounds) hashing. Passwords are never stored in plaintext or returned in responses.
- **Stateless Tokens**: Secure JWT-based session authorization with configurable expiration.
- **Account Lifecycle**: Enforces `ACTIVE`, `INACTIVE`, and `PENDING` states.

### 2. Algorithmic Dayflow Login ID Generator
- **Deterministic Format**: `[Company Prefix][2-letter First Name + 2-letter Last Name][Joining Year][4-digit Serial]` (e.g., `OIJODO20260001`).
- **Collision Prevention**: Concurrency-safe atomic serial incrementing per stem/year.

### 3. Employee Management & Profile Self-Service
- **Self-Service Profile**: Employees can view their own profile and update allowed fields (`phone`, `address`, `profilePicture`, `about`, `skills`, `certifications`).
- **Field-Level Protection**: Restricted fields (`salary`, `department`, `designation`, `role`, `status`) are strictly protected from modification by non-admin users.
- **Admin Directory**: Full CRUD, pagination, department filtering, and keyword search across employee records.

### 4. Attendance Clocking & Overtime Analytics
- **Check-In / Check-Out**: Daily punch clock with duplicate punch prevention and timestamp recording.
- **Automatic Calculations**: Work hours (rounded to 2 decimals) and overtime calculations computed on the backend.
- **Status Classification**: Classifies attendance as `PRESENT`, `ABSENT`, `HALF_DAY` (< 4 hours worked), or `LEAVE`.
- **Reporting & Summaries**: Personal daily/weekly/monthly logs and company-wide admin rosters & monthly summaries.

---

## 🛠 Tech Stack

- **Runtime & Framework**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) with SQLite (local development) / PostgreSQL (production)
- **Security**: [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js), [JSON Web Tokens (JWT)](https://github.com/auth0/node-jsonwebtoken), [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Jest](https://jestjs.io/), [Supertest](https://github.com/ladjs/supertest), [ts-jest](https://kulshekhar.github.io/ts-jest/)

---

## 📂 Project Architecture

```
odoo-hackathon/
├── prisma/
│   └── schema.prisma              # Data models (User, Employee, Attendance)
├── src/
│   ├── config/
│   │   └── env.ts                 # Environment variable configurations
│   ├── controllers/
│   │   ├── auth.controller.ts     # Auth endpoints (signup, login, me, logout)
│   │   ├── employee.controller.ts # Employee CRUD, profiles, search
│   │   └── attendance.controller.ts # Punch clock, history, admin reports
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT token validation & user extraction
│   │   ├── role.middleware.ts     # Role-based access control (RBAC)
│   │   ├── validate.middleware.ts # Zod schema validation
│   │   └── error.middleware.ts    # Centralized error handler
│   ├── models/
│   │   └── prisma.ts              # Prisma Client singleton
│   ├── routes/
│   │   ├── auth.routes.ts         # /api/auth routes
│   │   ├── employee.routes.ts     # /api/employees routes
│   │   ├── attendance.routes.ts   # /api/attendance routes
│   │   └── index.ts               # Master router (/api)
│   ├── services/
│   │   ├── auth.service.ts        # Auth & password security logic
│   │   ├── loginId.service.ts     # Dayflow Login ID generation algorithm
│   │   ├── employee.service.ts    # Profile & permission logic
│   │   └── attendance.service.ts  # Punch clock & hours calculation
│   ├── utils/
│   │   ├── apiResponse.ts         # Standard API response wrappers
│   │   └── dateUtils.ts           # Work hours & date range utilities
│   ├── validators/
│   │   ├── auth.validator.ts      # Auth validation schemas
│   │   ├── employee.validator.ts  # Employee validation schemas
│   │   └── attendance.validator.ts # Attendance validation schemas
│   ├── app.ts                     # Express app setup & middleware
│   └── server.ts                  # Server entry point
├── tests/
│   ├── auth.test.ts               # Auth & session tests
│   ├── loginId.test.ts            # Login ID generator unit tests
│   ├── employee.test.ts           # Employee CRUD & permission tests
│   └── attendance.test.ts         # Attendance & calculations tests
├── API_DOCUMENTATION.md           # Exhaustive endpoint documentation
├── package.json
├── tsconfig.json
└── jest.config.ts
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Shivam-k3/odoo-hackathon-.git
cd odoo-hackathon-
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Initialize Database
Generate Prisma client and push database schema:
```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Run Development Server
```bash
npm run dev
```
The API server will be available at `http://localhost:5000/api`.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port on which the Express server listens |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`) |
| `DATABASE_URL` | `file:./dev.db` | Database connection URI (SQLite or PostgreSQL) |
| `JWT_SECRET` | `dayflow-hrms-...` | Secret key used for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Lifespan of issued authentication tokens |
| `COMPANY_NAME` | `Odoo India` | Company name used for Login ID prefix derivation |
| `STANDARD_WORK_HOURS_PER_DAY`| `8` | Standard workday hours before overtime |

---

## 📡 API Overview

Complete request and response specifications are available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

### Summary of Endpoints

| Category | Method | Endpoint | Access |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/signup` | Public |
| **Auth** | `POST` | `/api/auth/login` | Public (Login ID or Email) |
| **Auth** | `GET` | `/api/auth/me` | Authenticated |
| **Auth** | `POST` | `/api/auth/logout` | Authenticated |
| **Employee** | `GET` | `/api/employees/me` | Authenticated (Own profile) |
| **Employee** | `PUT` | `/api/employees/me` | Authenticated (Allowed fields) |
| **Employee** | `GET` | `/api/employees/me/info` | Authenticated |
| **Employee** | `GET` | `/api/employees` | `ADMIN_HR` only |
| **Employee** | `GET` | `/api/employees/search` | `ADMIN_HR` only |
| **Employee** | `GET` | `/api/employees/:id` | `ADMIN_HR` only |
| **Employee** | `POST` | `/api/employees` | `ADMIN_HR` only |
| **Employee** | `PUT` | `/api/employees/:id` | `ADMIN_HR` only |
| **Attendance**| `POST` | `/api/attendance/check-in` | Authenticated |
| **Attendance**| `POST` | `/api/attendance/check-out` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/me/today` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/me` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/me/date` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/me/weekly` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/me/monthly` | Authenticated |
| **Attendance**| `GET` | `/api/attendance/admin/all` | `ADMIN_HR` only |
| **Attendance**| `GET` | `/api/attendance/admin/today` | `ADMIN_HR` only |
| **Attendance**| `GET` | `/api/attendance/admin/employee/:id` | `ADMIN_HR` only |
| **Attendance**| `GET` | `/api/attendance/admin/monthly-summary`| `ADMIN_HR` only |

---

## 🔒 Security & Authorization

- **Standard Response Envelope**: All API endpoints return `{ success: boolean, message: string, data?: any, errors?: any }`.
- **Role Isolation**: Non-admin users cannot access `/api/employees` (list/create/update other records) or `/api/attendance/admin/*`.
- **Identity Isolation**: Employees can only punch and view their own attendance records; identity is bound strictly to the authenticated JWT.
- **Sanitized Errors**: Stack traces and internal database errors are shielded in responses.

---

## 🧪 Testing

The backend includes a comprehensive automated test suite with **36 unit & integration tests** covering all auth, permissions, login ID generation, and attendance calculation scenarios.

Run tests:
```bash
npm test
```

---

## 🌿 Git Workflow

- **Branch**: `main`
- **Clean Commits**:
  1. `feat: initialize backend foundation`
  2. `feat: implement authentication`
  3. `feat: add employee login id generation`
  4. `feat: add employee management`
  5. `feat: implement attendance`
  6. `test: add auth employee attendance tests`
  7. `docs: add comprehensive readme`

# Architecture

```
frontend/ (static HTML + Bootstrap + vanilla JS)
        │  fetch()
        ▼
backend/routes/          — URL → controller mapping, input validation wiring
        │
backend/controllers/     — thin HTTP layer: parse req, call a service, shape response
        │
backend/services/        — business logic. NO knowledge of HTTP or Google Sheets.
        │
backend/repositories/    — index.js picks an implementation based on DB_DRIVER
        │
backend/repositories/googlesheets/  — talks to Google Sheets via config/googleSheetsClient.js
        │
Google Sheets API
```

## Why this separation matters for the MySQL migration

- **Services never import a Sheets or MySQL class directly.** They only
  receive repository instances from `backend/repositories/index.js`, which
  is the single switchboard that decides which implementation to hand out
  based on `DB_DRIVER` in `.env`.
- **Every Sheets-backed repository implements the same contract**
  (`backend/repositories/interfaces/IRepository.js`): `findAll`, `findById`,
  `findOne`, `create`, `update`, `delete`. A future `repositories/mysql/*`
  folder implements the same methods against MySQL tables.
- **`googleSheetsClient.js` is the only file that constructs a Sheets API
  client.** All reads/writes go through `BaseSheetRepository`, which every
  sheet-specific repository (e.g. `UserRepository`) extends.
- **IDs are stable, app-generated strings** (`PROD-000001`), never sheet row
  numbers — so migrating rows to MySQL primary keys later doesn't break any
  foreign-key-style references already stored elsewhere.

## Request flow example: Login

1. `frontend/login.html` submits the form → `frontend/js/auth.js` calls
   `apiRequest('/auth/login', ...)`.
2. `backend/routes/auth.routes.js` runs validation
   (`validators/auth.validator.js`) then calls `controllers/auth.controller.js`.
3. `AuthController.login` calls `services/AuthService.login`.
4. `AuthService` asks `repositories.userRepository.findByEmail(...)` for the
   user, checks the bcrypt hash, and signs a JWT.
5. Controller returns `{ token, user }` as a standard JSON envelope
   (`utils/apiResponse.js`).
6. Frontend stores the token in `localStorage` and redirects to the dashboard.

## Role-based access control

`middleware/auth.middleware.js` verifies the JWT and attaches `req.user`.
`middleware/role.middleware.js` (`authorize('Admin', 'Manager')`) is added
per-route as new modules are built in later phases, restricting access per
the role matrix in the master spec (Admin / Manager / Sales User /
Accountant / HR).

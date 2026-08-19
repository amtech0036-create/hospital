# Architecture

```
frontend/ (static HTML + Bootstrap + vanilla JS)
        │  fetch()
        ▼
backend/routes/          — URL → controller mapping, input validation wiring
        │
backend/controllers/     — thin HTTP layer: parse req, call a service, shape response
        │
backend/services/        — business logic. NO knowledge of HTTP or database driver details.
        │
backend/repositories/    — index.js exports MongoDB repository singletons
        │
backend/repositories/mongo/ — talks to MongoDB Atlas via config/mongoClient.js
        │
MongoDB Atlas
```

## Repository Pattern & Database Architecture

- **Services never import database driver classes directly.** They only
  receive repository instances from `backend/repositories/index.js`.
- **Every MongoDB repository implements the standard contract**
  (`backend/repositories/interfaces/IRepository.js`): `findAll`, `findById`,
  `findOne`, `create`, `update`, `delete`.
- **IDs are stable, app-generated strings** (`PROD-000001`).

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

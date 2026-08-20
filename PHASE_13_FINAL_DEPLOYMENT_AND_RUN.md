# Phase 13: Final Deployment Health Check & Launch

## Execution Directives
- Output only configuration updates, health check endpoints, or process manager files.
- DO NOT output conversational pleasantries, explanations, or tutorials.
- Maintain strict multi-tenant scoping (`tenantId`).

---

## 1. Production Health & Tenant Audit Endpoint
- Implement route `GET /api/health`:
  - Verify active MongoDB connection state (`readyState === 1`).
  - Output connected database name.
  - Output system memory and server uptime.

## 2. Process Manager & Environment Validation
- Ensure `.env` is fully set with:
  - `MONGODB_URI` pointing to target hospital database.
  - `JWT_SECRET` configured for production token validation.
  - Subdomain routing and port settings (`PORT=4000` or production port).
- Create/update `ecosystem.config.js` (PM2 configuration) for cluster mode execution with auto-restart on memory limit.

## 3. Launch & Verification
- Execute production build:
  1. Frontend assets bundle & minification.
  2. Start server via Node/PM2.
  3. Verify SuperAdmin tier counts and diagnostic routes on active subdomains.

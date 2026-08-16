# Deploy online (free for testing)

This ERP is a **single Node.js app** (API + frontend). Best free option for testing: **[Render](https://render.com)**.

| Platform | Free tier | Good for this app? |
|----------|-----------|-------------------|
| **Render** | Yes — 750 hrs/month | **Recommended** |
| Railway | Limited trial credits | Works, paid after trial |
| Fly.io | Small free allowance | More setup |
| **Vercel** | Yes — static hosting | **Frontend** (use with Render API) |
| Netlify | Yes — static hosting | Frontend only |

---

## Split deploy: Vercel (frontend) + Render (API) — recommended for production UI

Keep the **Node API on Render** and serve **only the `frontend/` folder on Vercel** for a faster, always-on UI.

### 1. Render — API only

Your backend is already at `https://a-m-tech-erp.onrender.com`. In Render **Environment**, set:

| Key | Value |
|-----|--------|
| `CORS_ORIGIN` | Your Vercel URL(s), comma-separated, e.g. `https://your-app.vercel.app` |

Redeploy Render after changing `CORS_ORIGIN`.

### 2. Vercel — frontend

1. Sign up at [https://vercel.com](https://vercel.com) and **Import** your GitHub repo.
2. Project settings:

| Setting | Value |
|---------|--------|
| **Framework Preset** | Other |
| **Root Directory** | `.` (repo root) |
| **Build Command** | `node scripts/generate-frontend-config.js` |
| **Output Directory** | `frontend` |

(These are also defined in `vercel.json` at the repo root.)

3. **Environment variable** (Vercel → Settings → Environment Variables):

| Key | Value |
|-----|--------|
| `ERP_API_URL` | `https://a-m-tech-erp.onrender.com/api` |

4. Deploy. Your app will be at `https://your-project.vercel.app/login.html`.

### 3. After deploy

- Open the **Vercel** URL for daily use (no cold start on static pages).
- Render still handles `/api/*`; the frontend calls it via `frontend/js/config.js` (generated at build time).
- Log in with the same credentials you use on Render.

---

## Option 1 — Render (all-in-one, simplest for testing)

### 1. Push code to GitHub

Your repo must be on GitHub (public or private).

### 2. Create a Render account

Sign up at [https://render.com](https://render.com) (free, GitHub login works).

### 3. New Web Service

1. **Dashboard → New + → Web Service**
2. Connect your GitHub repo
3. Settings:

| Setting | Value |
|---------|--------|
| **Name** | `inventory-erp` (or any name) |
| **Region** | Singapore or closest to you |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | **Free** |

### 4. Environment variables

In **Environment → Add Environment Variable**, add:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Long random string (e.g. 32+ chars) |
| `JWT_EXPIRES_IN` | `8h` |
| `DB_DRIVER` | `googlesheets` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Your spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Full private key — **one line**, keep `\n` as literal `\n` |
| `CORS_ORIGIN` | `*` |
| `BACKUP_DRIVE_AUTO_HOURS` | `0` (disable auto backup on free tier) |
| `BACKUP_DRIVE_FOLDER_ID` | Optional — your backup folder ID |

**Important for `GOOGLE_PRIVATE_KEY` on Render:**

Paste exactly like in `.env`, on one line:

```
-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
```

Do **not** paste real newlines — use `\n` characters.

### 5. Deploy

Click **Create Web Service**. First deploy takes 3–5 minutes.

Your URL will be:

```
https://inventory-erp-xxxx.onrender.com
```

Open:

```
https://YOUR-APP.onrender.com/login.html
```

### 6. Create admin user (first time)

After deploy, register the first admin (only if no users exist yet):

```bash
curl -X POST https://YOUR-APP.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@example.com\",\"password\":\"YourPass123\",\"role\":\"Admin\"}"
```

Or use Postman / Thunder Client in VS Code.

Then log in at `/login.html`.

---

## Free tier limits (Render)

- App **sleeps after ~15 minutes** of no traffic
- First visit after sleep may take **30–60 seconds** to wake up
- **750 hours/month** free (enough for testing)
- Not for heavy production use — upgrade later if needed

---

## Option 3 — Webuzo Panel (VPS / Dedicated Server)

Webuzo allows running this ERP either via its built-in **NodeJS App Manager** (GUI) or via **SSH + PM2**.

### Prerequisites:
- Webuzo VPS with Node.js 18+ installed.
- Domain or Subdomain pointing to your Webuzo server IP (e.g., `erp.yourdomain.com`).
- A MongoDB Atlas database URI (recommended) or Google Service Account.

### Method A: Webuzo GUI (NodeJS App Manager)

1. **Upload Files:**
   - In Webuzo **File Manager** (or SFTP), upload the project files to your domain directory (e.g. `/home/username/erp` or `/home/username/public_html/erp`).
   - Do **not** upload `node_modules`.
2. **Create `.env` File:**
   - Create `.env` in the root folder with:
     ```env
     PORT=4000
     NODE_ENV=production
     CORS_ORIGIN=*
     JWT_SECRET=your_super_secret_random_string_min_32_chars
     JWT_EXPIRES_IN=8h
     DB_DRIVER=mongo
     MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     MONGODB_DB_NAME=inventory_erp
     ```
3. **Setup Node.js App in Webuzo:**
   - Go to Webuzo Enduser Panel → **Software / Extra Apps** → **Setup Node.js App** (or **NodeJS Selector**).
   - Click **Create Application**:
     - **Node.js Version:** `18.x`, `20.x`, or `22.x`
     - **Application Mode:** `Production`
     - **Application Root:** `erp` (path to your project)
     - **Application URL:** `erp.yourdomain.com`
     - **Application Startup File:** `app.js` or `backend/server.js`
   - Click **Create / Save**.
4. **Install Dependencies:**
   - On the Node.js App page, click **Run NPM Install** (or run `npm install --production` via SSH terminal in the app directory).
5. **Start Application & Enable SSL:**
   - Click **Start / Restart Application**.
   - Go to Webuzo **Security → SSL → Let's Encrypt** and issue a free SSL certificate for your domain.
   - Access `https://erp.yourdomain.com/login.html`.

### Method B: Webuzo via SSH + PM2 (Recommended for maximum performance)

1. **SSH into server and clone project:**
   ```bash
   cd /home/username
   git clone <your-repo-url> erp
   cd erp
   ```
2. **Install PM2 globally & project dependencies:**
   ```bash
   npm install -g pm2
   npm install --production
   ```
3. **Create `.env`:**
   ```bash
   cp .env.example .env
   nano .env
   # Edit with your production values and save
   ```
4. **Start with PM2:**
   ```bash
   pm2 start backend/server.js --name "amtech-erp"
   pm2 save
   pm2 startup
   ```
5. **Reverse Proxy & SSL in Webuzo:**
   - In Webuzo, map your domain's reverse proxy or Nginx/Apache virtualhost to forward `http://127.0.0.1:4000`.
   - Issue Let's Encrypt SSL from Webuzo Panel.

---

## Security checklist before sharing the test URL

- [ ] Change default admin password after first login
- [ ] Use a strong `JWT_SECRET` in production
- [ ] Consider disabling `/api/auth/register` after creating users (or restrict by IP later)
- [ ] Never commit `.env` to GitHub
- [ ] Google Sheet shared only with service account (Editor)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails | Check Node 18+; run `npm install` locally first |
| 502 / app won't start | Check Render logs; verify all Google env vars are set |
| Google Sheets error | Share spreadsheet with service account email |
| Private key error | Re-paste key with `\n` escapes, no extra quotes issues |
| Slow first load | Normal on free tier (cold start) |
| Backup fails | Set `BACKUP_DRIVE_AUTO_HOURS=0`; use ZIP download instead |

---

## Custom domain (later)

Render free tier supports custom domains with HTTPS. Add under **Settings → Custom Domains** after you buy a domain.

# Deploy online (free for testing)

This ERP is a **single Node.js app** (API + frontend). Best free option for testing: **[Render](https://render.com)**.

| Platform | Free tier | Good for this app? |
|----------|-----------|-------------------|
| **Render** | Yes — 750 hrs/month | **Recommended** |
| Railway | Limited trial credits | Works, paid after trial |
| Fly.io | Small free allowance | More setup |
| Vercel/Netlify | Frontend only | Not ideal (needs Node API) |

---

## Option 1 — Render (recommended)

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

## Option 2 — Railway

1. [https://railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Same env vars as above
3. Railway sets `PORT` automatically
4. Free trial credits, then paid

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

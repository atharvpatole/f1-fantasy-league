# F1 Fantasy League Tracker

3-player F1 fantasy dashboard with charts, podium picks, and fantasy points — auto-saves every change.

## Sync modes (pick one)

| Mode | Cost | Multi-device sync |
|------|------|-------------------|
| **Local** (default) | Free | Same browser only |
| **Supabase** (recommended) | Free tier | Real-time for all 3 players |
| **Firebase** (optional) | Free tier | Real-time |

No backend is required to deploy. Without cloud config, data persists in the browser via `localStorage`.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial F1 fantasy tracker"
git remote add origin https://github.com/YOUR_USER/f1-fantasy-league.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Vercel auto-detects the static site — no framework needed
4. Click **Deploy**

The app works immediately after deploy (local-save mode).

### 3. Enable live sync for all 3 players (optional, free)

**Supabase setup** (recommended):

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → paste and run `supabase-setup.sql`
3. Copy **Project URL** and **anon public key** from Settings → API

**Add Vercel environment variables** (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | your anon key |
| `APP_ID` | `f1-fantasy-tracker-v1` (keep same for everyone) |

4. **Redeploy** (Deployments → ⋯ → Redeploy)

Status badge in the header:
- **Live sync (cloud)** — all players see updates instantly
- **Saved on this device** — local only (no Supabase env vars set)

---

## Local development

```bash
cp config.example.js config.js   # edit with your Supabase keys (optional)
npm run dev                        # http://localhost:3000
```

---

## Firebase (optional alternative)

Set these Vercel env vars instead of Supabase:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

Deploy `firestore.rules` in Firebase Console if you use this option.

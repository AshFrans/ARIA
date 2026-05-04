# Deploying Aria to Vercel

## Prerequisites

- A Vercel account (free): https://vercel.com
- Your Aria code pushed to a GitHub repository
- Node.js 18+ installed locally

## Step 1 — Push your code to GitHub

Create a new GitHub repository (e.g. `aria-app`) and push this project:

```bash
git init
git add .
git commit -m "Initial Aria commit"
git remote add origin https://github.com/YOUR_USERNAME/aria-app.git
git push -u origin main
```

## Step 2 — Import the project in Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your `aria-app` repository
4. On the **Configure Project** screen:
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**

Vercel will install dependencies, run the export, and publish your app.

## Step 3 — Environment variables

**None needed.** All API keys are entered by the user in the Settings screen and stored locally in their browser's `localStorage`. Nothing is sent to your server.

## Step 4 — Custom domain (optional)

In your Vercel project dashboard → **Settings** → **Domains**, add your custom domain. Vercel handles SSL automatically.

## Step 5 — Automatic redeployment

Every time you push to your GitHub main branch, Vercel automatically rebuilds and redeploys. Users see the update on their next page refresh.

---

## Local Development

```bash
# Install dependencies
npm install

# Run in browser
npm run web

# Run on Android (requires Expo Go app or Android emulator)
npm run android
```

## Building the web export manually

```bash
npx expo export --platform web
# Output is in ./dist — upload this anywhere (Vercel, Netlify, GitHub Pages)
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `Module not found` errors on build | Run `npm install` locally and commit the updated `package-lock.json` |
| Blank page after deploy | Check that `outputDirectory` in `vercel.json` is `dist` |
| 404 on page refresh | The `rewrites` rule in `vercel.json` handles this — ensure it's committed |
| Clockify CORS errors | Clockify's API allows browser requests — if you see CORS, check your API key |
| GitHub API 401 | Your PAT may have expired — regenerate it at github.com/settings/tokens |

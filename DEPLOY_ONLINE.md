# CraveMatch — deploy the website online

This project includes a React + Vite frontend, an Express backend, and a MySQL schema. The frontend is configured to work as an interactive **demo website** even when the backend has not been deployed. Demo orders and ratings are not saved permanently.

## Fastest route: publish the frontend on Vercel

1. Create/sign in to GitHub: https://github.com/
2. Create a repository named `CraveMatch`.
3. Upload the contents of this project to the repository (keep `frontend/`, `backend/`, `database.sql`, and this guide).
4. Open https://vercel.com/ and sign in with GitHub.
5. Choose **Add New → Project** and import `CraveMatch`.
6. In project settings for the first deployment, set **Root Directory** to `frontend`.
7. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
8. Click **Deploy**. Vercel will generate a public URL ending in `vercel.app`.

## What works in the online demo

- Food search and mood/craving recommendations
- Budget slider and food portion/value comparisons
- Smart Swap suggestions
- Craving Roulette
- Sample cart, transparent totals and budget warnings
- Sample order history during the current browser session
- Surplus Meal Saver listings
- Dish rating interface (demo-only until API is connected)

## Important backend note

The public frontend is a demo unless you also deploy the Express API and MySQL database. To connect a deployed API, set the Vercel environment variable `VITE_API_URL` to the public API base URL ending in `/api`, then redeploy. Configure the backend database credentials as server-side environment variables only. Never commit `.env` files, passwords, or database credentials to GitHub.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Then open the local URL Vite prints (commonly `http://localhost:5173`).

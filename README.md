# CraveMatch MVP

CraveMatch is a responsive food-discovery website prototype focused on craving-based recommendations, budget transparency, dish value, Smart Swap, Craving Roulette, and surplus meal discovery.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

## Deploy the frontend

Follow [DEPLOY_ONLINE.md](DEPLOY_ONLINE.md) to publish the Vite frontend on Vercel and get a public `vercel.app` link.

Project files:
- `frontend/` — React + Vite website
- `backend/` — Node.js + Express API
- `database.sql` — MySQL schema and sample data
- `HOW_TO_RUN_STEP_BY_STEP.md` — detailed local setup instructions

**Demo limitations:** The frontend can run with sample data before a backend is deployed. Sample quality labels and ratings are illustrative, and checkout does not collect payments. Demo orders are not permanently saved unless a deployed API/database is connected. Never commit secrets or `.env` files to a public repository.

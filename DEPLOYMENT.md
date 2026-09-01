Deployment to Vercel
====================

Steps to finish the migration and enable automatic deploys:

1. Add GitHub secret `VERCEL_TOKEN` to this repository (Settings > Secrets > Actions).
   - Create a Vercel Personal Token in your Vercel account (Account Settings > Tokens).
   - Save it as `VERCEL_TOKEN` in GitHub.

2. Add environment variables in the Vercel Project (Project > Settings > Environment Variables):
   - `SUPABASE_URL` → your Supabase URL
   - `SUPABASE_ANON_KEY` → your Supabase anon/public key

3. Connect the GitHub repository `punioyarzun/Habitos` in the Vercel Dashboard (Import Project).
   - If you prefer to use the GitHub integration, Vercel will handle builds automatically; the workflow here is a fallback/alternative.

4. The GitHub Actions workflow `.github/workflows/deploy-vercel.yml` will run on pushes to `main` and deploy using `vercel` CLI.

5. API endpoints:
   - Serverless functions are available under `/api/*`, e.g. `/api/bitacora`.

If you want, I can guide you through generating the Vercel token and adding the GitHub secret step-by-step.

# Street Style Hub

## Deploy to Netlify

The app is a TanStack Start project and builds for Netlify out of the box (`netlify.toml` is included).

1. Sync the project to a GitHub repository (Lovable → Project settings → Git), then in Netlify choose **Add new site → Import an existing project** and pick that repository.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, Node 22, and the Netlify server preset.
3. Add environment variables in Netlify (**Site configuration → Environment variables**), using the values from the project's `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `LOVABLE_API_KEY` (the AI key for the Stylist chat — not stored in the repo)
4. Deploy. Every push to the branch the site watches triggers a new deployment.
5. Update sign-in redirects: add the new Netlify URL (e.g. `https://your-site.netlify.app/**`) to the allowed redirect URLs in the authentication settings, or Google sign-in will fail on the new domain.

Note: the database, file storage and AI gateway stay on Lovable Cloud — only the website itself moves to Netlify.

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


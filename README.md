# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Secure cron for `cleanup-old-data`

This endpoint is intended for server-to-server cron only.

### Required Edge Function settings

- In `supabase/config.toml`, keep JWT verification enabled:
  - `[functions.cleanup-old-data].verify_jwt = true`
- Configure a shared secret in function env:
  - `CRON_SECRET=<strong-random-secret>`

### Allowed authentication methods

`cleanup-old-data` accepts one of these:

1. **Supabase service JWT** via `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
2. **Cron secret** via `x-cron-secret: <CRON_SECRET>`

If no auth is provided, it returns `401`. If auth is present but invalid, it returns `403`.

### Deployment checklist

1. Set secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... CRON_SECRET=... ATTEMPT_LOG_RETENTION_DAYS=180
```

2. Deploy function:

```bash
supabase functions deploy cleanup-old-data
```

3. Configure your scheduler to call `POST /functions/v1/cleanup-old-data` with either:
   - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, or
   - `x-cron-secret: <CRON_SECRET>`

> CORS is intentionally not open for this function because it is not intended for browser clients.

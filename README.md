# humorprojectadmin

Admin panel for [Reality Check](https://github.com/rheeethann/humorproject). It is a separate Next.js 16 app and Vercel project that uses the same Supabase project as the main app. Members reach it from the **Admin Mode** link in the main app's bottom-right corner.

## What it does

- **Google sign-in, every time.** The panel keeps its own session cookie, separate from the main app's, and asks Google to show the account chooser. A main-app session never carries over. Only verified `@columbia.edu` accounts are admitted.
- **Users:** name, email, role, posts generated, votes cast, current voting streak, average distance from each image's average score, and last sign-in. You can search by name, email or role, and sort by most recent visit, name, votes cast or streak. Promote a user to superadmin, or demote them. Superadmins see a **Delete** button on every post in the main app.
- **Content:** each image with its caption, prompt, author, creation time, vote count and average score. You can search by caption, prompt or author, and sort by most recent, caption or votes. **Delete** soft-deletes a post: it disappears from the app and can no longer be rated, and `generated_media.deleted_at` / `deleted_by` record the deletion. Tick **Show deleted** to see deleted posts.

A streak counts consecutive days with at least one vote, ending today, or yesterday if the user hasn't voted yet today. Days are UTC.

## Database

All data comes from `security definer` functions in the main repo's `supabase/migrations/20261020120000_create_admin.sql`: `admin_users()`, `admin_media()`, `admin_set_role()` and `admin_delete_media()`. Each one checks `can_access_admin()`, so the panel needs only the publishable key and no service-role secret. Apply that migration to the Supabase project before using the panel. It also makes `enr2131@columbia.edu` a superadmin.

`can_access_admin()` currently admits any Columbia account, as the spec requires. To limit the panel to superadmins, change its body to `select public.is_superadmin();`.

## Development

```sh
npm install
cp .env.example .env.local   # fill in the Supabase publishable key
npm run dev                  # http://localhost:3001
```

Run the main app on port 3000 with `NEXT_PUBLIC_ADMIN_URL=http://localhost:3001` so its Admin Mode link points here.

## Deploying on Vercel

1. Import this repository as a new Vercel project.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (this project's origin) and `NEXT_PUBLIC_APP_URL` (the main app's origin).
3. In Supabase → Authentication → URL Configuration, add `<admin origin>/auth/callback` (and `http://localhost:3001/auth/callback` for local use) to the Redirect URLs allow list.
4. Set `NEXT_PUBLIC_ADMIN_URL` in the main app's Vercel project to this project's origin, then redeploy the main app.

## Checks

```sh
npm run lint
npm test
npm run build
```

# FIND MALI Admin — Futuristic UI refresh

Replace these two files in your existing repository:

- `components/dashboard.tsx`
- `app/globals.css`

No API routes, Supabase files, authentication handlers, environment variables, or package dependencies are changed.

Features:
- Futuristic responsive admin layout
- Dark / Light theme switch, saved in the current browser
- Existing Overview, Inboxes, Security, Activity Logs, Settings sections
- Existing Supabase API calls and Google OAuth sign-out retained
- Inbox search filters the currently loaded page only
- No fabricated activity logs or system health states

After replacing the files, run `npm run build`.

# Talita Cumi web

Next.js 16 (App Router, TypeScript) front end for the Kotlin API in the parent folder, with the visual identity of the
Projeto Talita Cumi emblem. No UI library and no CSS framework: one stylesheet with the brand tokens
(`src/app/globals.css`) and a handful of components. Every string lives in `src/lib/copy.ts` (Brazilian Portuguese).

```bash
cp .env.example .env.local      # API_URL, only needed if the API is not on :8080
npm install                     # Windows PowerShell: npm.cmd install
npm run dev                     # http://localhost:3000
npm run build && npm run typecheck
```

How it talks to the API (same as Meczap):

- Server components call `API_URL` directly (`src/lib/server-api.ts`); the browser calls same-origin `/api/*`, which
  `next.config.ts` proxies, so the backend needs no CORS.
- Who is signed in: `AccountProvider` calls `/api/auth/me` in the browser, so public pages stay cacheable. The session
  is an HttpOnly cookie; JavaScript never sees the token.
- Dates: the API speaks UTC instants; `src/lib/dates.ts` formats in `America/Sao_Paulo`, which must match
  `app.timezone` in the API's `application.yml`.

See `../README.md` for the screens, brand rules and what is not built yet.

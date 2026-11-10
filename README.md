# Talita Cumi

*"Talita cumi", que quer dizer: "Menina, eu te digo, levanta-te!" (Marcos 5:41)*

Talita Cumi connects women who need psychological help with Christian psychologists. Women find a therapist by what
they are going through (anxiety, grief, marriage, faith crises…) and how they want to be seen (online or in person),
then book a session. Therapists sign up with their CRP, are listed once someone has checked it, and manage their
weekly hours, profile and agenda from a panel.

Same stack as Meczap: Kotlin 2.2, Spring Boot 4.1, PostgreSQL + Flyway for the API; Next.js 16 (App Router, TypeScript,
no UI library) for the web app in `web/`. Modular monolith: one deployable, packages `account`, `therapist`,
`scheduling`, `common`.

## Run it

Requirements: JDK 21, Node 20.9+, Docker.

```bash
docker compose up -d postgres            # Postgres on localhost:5433 (5432 is left for Meczap)
ADMIN_TOKEN=dev-admin ./gradlew bootRun  # API on http://localhost:8080   (Windows: $env:ADMIN_TOKEN="dev-admin"; .\gradlew.bat bootRun)
./gradlew test                           # unit tests, plus PlatformFlowTest (needs Docker)

cd web
npm install
npm run dev                              # http://localhost:3000
```

Then, to see someone in the search:

1. Sign up as a therapist at `/cadastro/terapeuta`.
2. Verify her (the profile is hidden until then): `GET /api/admin/therapists/pending`, then
   `POST /api/admin/therapists/{id}/verify`, both with header `X-Admin-Token: dev-admin`. See `http/requests.http`.
3. In "Meu painel" → "Horários", add weekly windows.
4. Sign up as a client at `/cadastro`, find her on the home page and book.

## Endpoints

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/accounts` | anyone | Client sign-up (name, e-mail, phone with area code, password 8+). Signs her in. 409 if the e-mail is taken |
| POST | `/api/therapists` | anyone | Therapist sign-up: `account`, `crp`, `profile` in one request. Signs her in. Not listed until verified. 409 for a taken e-mail or CRP |
| POST | `/api/auth/login` · `/api/auth/logout` | | Session cookie in, session cookie out. 401 for a wrong e-mail or password (same answer for both) |
| GET | `/api/auth/me` | signed in | The account, with its `role` (`CLIENT` or `THERAPIST`) |
| GET | `/api/therapists?topic=&modality=&q=` | anyone | Verified therapists. `modality=ONLINE` also returns those who do both |
| GET | `/api/therapists/{id}` | anyone | Public profile; 404 until verified |
| GET · PUT | `/api/therapists/me` | therapist | Her own profile (with `verified`) / update it. The CRP can't be changed |
| GET · PUT | `/api/therapists/me/availability` | therapist | Weekly windows. PUT replaces the week; an empty list pauses new bookings |
| GET | `/api/therapists/{id}/slots?date=YYYY-MM-DD` | anyone | Free session times for a day |
| POST | `/api/appointments` | client | Book: `therapistId`, `startsAt`, optional `note`, `wantsFaith`. 409 if the time was just taken |
| GET | `/api/appointments/me` | signed in | Upcoming (and last week's) sessions. Therapists also get the client's contact |
| PATCH | `/api/appointments/{id}/cancel` | either participant | Until the session starts. 404 for anyone else |
| GET | `/api/admin/therapists/pending` | `X-Admin-Token` | Therapists waiting for CRP verification |
| POST | `/api/admin/therapists/{id}/verify` | `X-Admin-Token` | Publish a profile after checking the CRP |

## Design decisions

- **No unverified therapist reaches a client.** Profiles are hidden from search, profile pages and slots until
  `verified_at` is set, which today happens through the admin endpoint after a person checks the CRP in the
  Conselho Federal de Psicologia registry. The token compare is constant-time; blank `ADMIN_TOKEN` disables the endpoints.
- **Crisis lines on every page.** A booking platform must never be the only door: CVV 188, SAMU 192 and Ligue 180
  (Central de Atendimento à Mulher) sit above the header on every screen.
- **Faith is welcome, never imposed.** Therapists describe how faith shows up in their work (optional), and confirm at
  sign-up that they follow the psychologists' code of ethics and do not impose their faith. Each client chooses, per
  booking, whether she wants faith to be part of her sessions.
- **Sensitive data stays between two people.** What a client writes before a session, and whether she asked for faith,
  are only returned to her and to her therapist; the client's contact only to her therapist. Under LGPD these are
  sensitive personal data (health and religious belief). The calendar file says only "Sessão (Talita Cumi)".
- **Booking needs an account.** Unlike Meczap, every appointment belongs to a signed-in client, and only its two
  participants can see or cancel it (others get 404, so ids can't be probed). Guests who try to book keep their chosen
  time through sign-up or login.
- **Double booking is prevented by the database.** `appointment` has a GiST exclusion constraint on
  `(therapist_id, tstzrange(starts_at, ends_at))` for non-cancelled rows. `PlatformFlowTest` fires 8 simultaneous
  bookings at one time and asserts exactly one wins.
- **Sessions leave a break.** Sessions start on a half-hour grid: a 50-minute session starts every hour, leaving
  10 minutes between clients (`SlotCalculator.step`). Slot generation is a pure function, unit-tested.
- **Sessions and passwords as in Meczap:** opaque token in an HttpOnly, SameSite=Lax cookie (`talitacumi_session`),
  only its SHA-256 stored; `{bcrypt}` password hashes; the web app proxies `/api/*` so there's no CORS or token
  handling in JavaScript. Set `APP_SESSION_SECURE_COOKIE=true` outside localhost.

## Front end

`web/` uses the visual identity of the Projeto Talita Cumi emblem (`web/public/brand/talita-cumi-emblema.jpg`):

- Story: the emblem moves from dusk to dawn (slate watercolor, then golden light, then blush blossoms). The site
  follows it: a hero that warms from a slate edge to a golden glow and blush, gold leaves and rose blossoms in line
  art at its edges (`components/brand/Botanicals.tsx`), and a slate "dusk" footer edged with a gold-to-rose line.
- Colours, sampled from the emblem: paper `#FCF9F3`, olive `#464B2B` ("TALITA"), rose `#BF7567` ("cumi"),
  gold `#B8842E` (ring, "PROJETO", "MENINA LEVANTA!"), slate `#2F3236`, glow `#FBE6C2`, blush `#FBEAE3`.
  Rose and gold in those exact shades are for large script, lines and decoration; small text uses the darker
  `--rose-text` `#9B5144` and `--gold-text` `#8A5E14` (both above 4.5:1).
- Type: Cormorant Garamond (the serif of "TALITA"), Allura (the script of "cumi"), Jost in spaced capitals
  ("PROJETO", "MENINA LEVANTA!") and for the interface. All through `next/font/google`.
- The full emblem appears large on the home page next to the stacked lettering (`BrandLockup`); small places use the
  horizontal live-type wordmark (`Wordmark`), both in `components/brand/Logo.tsx`.

The interface is in Brazilian Portuguese; every string lives in `web/src/lib/copy.ts`.

| Route | What it does |
|---|---|
| `/` | Emblem, verse, search by topic and modality (plain GET form), therapist cards, how it works |
| `/terapeutas/[id]` | Profile: approach, bio, faith note, topics, price, next free times |
| `/terapeutas/[id]/agendar` | Pick day and time, optional note and faith preference, confirm; calendar file |
| `/cadastro` · `/cadastro/terapeuta` · `/entrar` | Client sign-up, therapist sign-up (with CRP and profile), login |
| `/minhas-sessoes` | A client's sessions, with cancel |
| `/painel` | Therapist panel: verification status, agenda with client contact, weekly hours editor, profile editor |

## Not built yet (needed before real users)

1. **Verification workflow.** A real admin area with staff accounts instead of a shared token, and a record of who
   checked each CRP and when. Re-verification if the CRP is cancelled.
2. **Video sessions and notifications.** Therapists contact the client to send a link; there are no e-mails, WhatsApp
   reminders or built-in video yet. Payments are agreed directly with the therapist.
3. **LGPD compliance work:** explicit consent records for sensitive data, privacy policy and terms, data-subject
   requests, retention rules, audit log of who read what. Encrypt `appointment.note` at rest.
4. **Login hardening:** rate limiting and lockout, password reset, e-mail verification.
5. **Safety review** of the copy and flows by licensed psychologists, including what to do when a booking note signals
   risk.
6. Search runs in memory over verified profiles: fine for hundreds, move to SQL or a search engine after that.
7. Production setup: `btree_gist` needs permission on managed Postgres; add a Dockerfile, CI and observability.

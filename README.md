# Rustic Retreat CRM

Custom CRM for Rustic Retreat to manage wedding venue inquiries, bookings, and client planning.

## Getting started

```sh
npm install
npm run dev
```

## Environment variables

Create a `.env.local` with:

```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For integration tests, create `.env.test.local` (see `.env.test.example`) with a service role key:

```sh
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Test strategy (test pyramid)

- Unit tests: pure logic (booking rules, pricing helpers, validators).
- Integration tests: Supabase CRUD hits real endpoints and asserts DB state.
- No-browser smoke tests: in-process UI journeys with MemoryRouter + Testing Library.

### Run tests locally

```sh
npm test
```

### Run by layer

```sh
npm run test:unit
npm run test:integration
```

### Test data seeding

```sh
node scripts/seed-test-data.mjs
node scripts/cleanup-test-data.mjs <testRunId>
```

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - build for production
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run test` - run unit + smoke tests (no real Supabase)
- `npm run test:all` - run unit + smoke + integration tests
- `npm run test:integration` - run real Supabase integration tests
- `npm run test:ci` - CI-friendly full test run

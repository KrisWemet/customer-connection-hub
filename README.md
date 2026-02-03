# Rustic Retreat CRM

Custom CRM for Rustic Retreat to manage wedding venue inquiries, bookings, and client planning.

## Getting started

```sh
npm install
npm run dev
```

## Multi-Day Event Features

The CRM now supports comprehensive management of 3, 5, and 10-day wedding packages across 65 acres:

### Multi-Day Timeline
- Visual timeline view for all event days
- Day-specific activities and schedules
- Resource allocation tracking
- Issue reporting and management

### Day-of Coordination Tools
- Real-time event status dashboard
- Task completion checklists
- Emergency contact directory
- Issue reporting and resolution tracking
- Vendor coordination tools

### Enhanced Communication
- Multi-day event communication threads
- Vendor-specific communication channels
- Guest communication tools
- Automated notifications

### Resource Management
- 65-acre space allocation tracking
- Equipment and facility scheduling
- Capacity management across multiple days
- Setup and breakdown coordination

## Running the Demo

To see the multi-day features in action with sample data:

1. Start the development server:
```sh
npm run dev
```

2. Seed demo data (requires Supabase connection):
```sh
node scripts/seed-multi-day-demo.mjs
```

3. Visit the demo booking:
- Booking Detail: `/bookings/[booking-id]`
- Multi-Day Timeline: `/bookings/[booking-id]/timeline`
- Day-of Coordination: `/bookings/[booking-id]/day-of`

Note: You'll need a working Supabase connection with proper authentication configured to run the demo.

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

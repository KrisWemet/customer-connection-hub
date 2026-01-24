# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React + TypeScript application code.
- `src/pages/` holds route-level screens (e.g., `Dashboard.tsx`, `Leads.tsx`).
- `src/components/` contains shared UI building blocks, with shadcn/Radix primitives in `src/components/ui/`.
- `src/hooks/` and `src/lib/` house reusable hooks and utilities (e.g., `use-toast.ts`, `utils.ts`).
- `src/test/` includes Vitest setup and example tests.
- `public/` stores static assets served as-is (e.g., `favicon.ico`).

## Build, Test, and Development Commands
- `npm run dev`: Start the Vite dev server with hot reload.
- `npm run build`: Create a production build in `dist/`.
- `npm run build:dev`: Build with development mode flags.
- `npm run preview`: Serve the production build locally.
- `npm run lint`: Run ESLint across the codebase.
- `npm run test`: Run the Vitest test suite once.
- `npm run test:watch`: Run tests in watch mode.

## Coding Style & Naming Conventions
- Use TypeScript (`.ts`/`.tsx`) with 2-space indentation and double quotes (match existing files like `src/App.tsx`).
- Prefer functional components and hooks; keep component files PascalCase (e.g., `LeadCard.tsx`).
- Import from `@/` for src-rooted paths (e.g., `@/components/ui/button`).
- Styling uses Tailwind CSS; follow existing utility-first class patterns.
- Linting is enforced via ESLint (`eslint.config.js`); run `npm run lint` before PRs.

## Testing Guidelines
- Tests are written with Vitest + Testing Library and live under `src/**/*.{test,spec}.{ts,tsx}`.
- Use descriptive test names and keep test files close to the feature (e.g., `src/pages/Dashboard.test.tsx`).
- Global test setup lives in `src/test/setup.ts`.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative summaries (e.g., “Rebuild CRM UI components”); follow that style.
- Keep commits focused and scoped to a single change set.
- PRs should include a brief summary, testing notes (`npm run test`/`npm run lint`), and screenshots for UI changes.
- Link related issues or tickets when applicable.

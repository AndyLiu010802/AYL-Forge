# AYL Forge

AYL Forge is an independent project-learning platform. It treats each tutorial as a
complete course project and keeps one local learner profile across all current and future
courses.

It is intentionally a sibling of course repositories, never a folder inside one course:

```text
Desktop/
├── AYL-Forge/                 # Platform, profile, ranks, shop and course registry
└── prism-dash-portfolio/      # One independently deployed course
```

## Current features

- Scalable course registry with Prism Dash as the first embedded project.
- Chinese and English platform UI.
- Cross-origin `postMessage` bridge for course XP, completed levels and badges.
- Persistent rank, crystal currency, inventory and equipped rewards.
- Level-gated reward shop and learner dossier.
- Snapshot-free course player with a new-tab fallback.

## Local development

```bash
pnpm install
pnpm dev
```

The Prism Dash course defaults to
`https://andy-prism-portfolio.netlify.app/build-guide/`. Override it for development:

```bash
NEXT_PUBLIC_PRISM_DASH_COURSE_URL=http://localhost:3000/build-guide/
```

## Verification

```bash
pnpm check
pnpm build
```

The static export is written to `out/` and can be deployed directly to Netlify.

## Adding a course

Add one record to `src/features/academy/academy.config.ts`. A course must expose its
total level count and send the documented `AYL_FORGE_COURSE_PROGRESS` message. The
platform validates both the iframe window and the registered course origin before
accepting progress.

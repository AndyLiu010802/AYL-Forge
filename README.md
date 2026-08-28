# AYL Forge

AYL Forge is an independent project-learning platform. Each tutorial remains an independently deployed course while one local learner profile carries progress, ranks, crystals, inventory and equipped rewards across the whole platform.

It is a sibling of course repositories, never a folder inside one course:

```text
Desktop/
├── AYL-Forge/                 # Platform, profile, ranks, shop and course registry
└── prism-dash-portfolio/      # One independently deployed course
```

## Current features

- Scalable course registry with Prism Dash as the first embedded project.
- Chinese and English platform UI and course routes.
- Secure cross-origin Course Contract v2 bridge for course progress.
- Persistent rank, crystal currency, inventory and equipped rewards.
- Level-gated reward shop and learner dossier.
- Iframe course player with a new-tab fallback.

## Course authors / 课程作者

Start with the Chinese-first [Course Contract v2 authoring guide](docs/course-authoring.md). It explains the manifest, bilingual URLs, iframe/CSP headers, versioned `postMessage` messages, exact-origin security, local testing and the release acceptance checklist.

The copy-ready browser adapter is in [`src/features/academy/course-adapter-template.ts`](src/features/academy/course-adapter-template.ts). Copy it into the course repository and configure an explicit AYL Forge origin; outbound messages never use a wildcard target.

Contract v2 uses two messages, and both include `protocolVersion: 2`:

- `AYL_FORGE_REQUEST_PROGRESS`: platform asks the embedded course for its latest snapshot.
- `AYL_FORGE_COURSE_PROGRESS`: course returns completed levels, cumulative XP and rewards.

Course registration remains reviewed by the platform maintainer. Do not add an unverified remote course only because it exposes a manifest.

## Local development

```bash
pnpm install
pnpm dev
```

The Prism Dash course defaults to `https://andy-prism-portfolio.netlify.app/build-guide/`. Override it for development:

```bash
NEXT_PUBLIC_PRISM_DASH_COURSE_URL=http://localhost:3001/build-guide/
```

Run AYL Forge and the course on different ports so iframe, CSP and origin checks are exercised locally.

## Verification

```bash
pnpm check
pnpm build
```

The static export is written to `out/` and can be deployed directly to Netlify.

Before an author marks a course as available, complete every item in the [Course Contract v2 acceptance checklist](docs/course-authoring.md#最终验收清单acceptance-checklist).

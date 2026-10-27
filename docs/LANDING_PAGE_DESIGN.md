# Landing page design and validation

## Reference inspection

Reference: [Magic UI SaaS demo](https://saas-magicui.vercel.app/), inspected on 2026-10-27 with Chromium at 1440×1000, 768×1024, and 390×844. The linked blog index was also rendered and reviewed for content hierarchy. Screenshots and DOM/computed-style findings are saved locally in `artifacts/landing/`; `scripts/inspect-landing-reference.mjs` reproduces the responsive captures.

The reference uses Inter typography (desktop hero: 60px, weight 500, 75px line height), a white background, black headings, gray body copy, and a red accent. A compact sticky header leads to a centered announcement, two-line hero, primary CTA, and framed product preview. Below are a logo strip, problem/solution sections, feature cards, step controls, testimonials, feature tabs, pricing, FAQ accordion, blog teaser, closing CTA, and footer. Some feature content reveals on viewport entry; initial full-page captures were incomplete, so sections were scrolled into view before comparison.

Desktop navigation has feature/solution menus and account CTAs. At tablet and phone widths it becomes a menu trigger with an overlay drawer. Phone hero type is smaller, CTAs stretch to available width, columns stack, and the reference scales down its product screenshot. Feature controls switch content; FAQs expand; pricing has a billing switch; carousels use directional controls.

## Adaptation

Sticky Mind Grid keeps the reference's centered hierarchy, generous section spacing, framed product showcase, modular feature panels, repeated CTA, and progressive disclosure. It uses its own grid mark, Sora headings, indigo accent, warm task colors, and original copy. Illustrations are rendered with HTML/CSS and existing Lucide icons; no reference images, logos, endorsements, brand names, or marketing copy are reused.

The page explains implemented features: custom board columns, alternate task views, assignments, comments and mentions, real-time board updates, notes, attachments, checklists, and five board roles. Unverified customer logos, testimonials, paid tiers, AI capabilities, and a nonexistent blog are omitted. A clearly labeled sample workspace replaces the reference's video preview. Its board, list, and calendar tabs use static illustrative data and do not mutate application state.

| Viewport | Adapted behavior |
| --- | --- |
| 1440×1000 | Full header navigation, framed workspace with sidebar, three board columns, two-column feature grid, three getting-started steps, split FAQ layout |
| 768×1024 | Disclosure navigation, hidden illustrative sidebar, readable board columns, two-column features, compact spacing |
| 390×844 | Full-width stacked CTAs, disclosure navigation, locally scrollable sample board, stacked feature cards/steps/FAQ/footer |
| 320×740 | Additional narrow-screen regression check for navigation, tabs, overflow, and card readability |

The preview intentionally retains readable card text with contained horizontal scrolling on phones. It does not shrink the whole desktop interface into an unreadable screenshot. Navigation uses a simple disclosure instead of a modal drawer, with Escape-to-close and focus restoration. Existing Radix Tabs/Accordion supply keyboard semantics. A skip link, focus outlines, reduced-motion rules, and unrestricted browser zoom support accessibility. Public colors and font choices are scoped to `.landing-page`; authenticated appearance preferences remain intact.

## Acceptance criteria

1. Guest `/` renders the landing without the private workspace or board/task API requests.
2. Authenticated `/` retains the boards workspace and URL; private board routes still require login.
3. Registration and sign-in CTAs reach the existing account pages; section links reach visible sections.
4. Preview tabs, mobile navigation, and FAQ controls work with keyboard input and meaningful content changes.
5. Desktop, tablet, phone, and narrow-phone layouts have no page-level horizontal overflow; all board columns remain reachable.
6. Reduced-motion users see all content without entrance animation; mobile zoom is enabled.

## Verification

Targeted component tests live in `src/test/pages/LandingPage.test.tsx` and `src/test/components/HomeRouteLayout.test.tsx`. Public browser journeys and responsive screenshots live in `e2e/landing.spec.ts`. They require no database, credentials, or destructive seeding. Full Playwright is only run when explicitly requested, per AGENTS.md.

Final checkpoint (2026-10-27):

| Check | Result |
| --- | --- |
| Landing component tests | PASS — 9 tests in 2 files |
| Targeted browser journeys | PASS on both Vite and the production preview — 9 tests per run, including existing guest-route guards; responsive captures at all four widths |
| Production build | PASS |
| Full frontend coverage | PASS — 80 files, 470 tests; 67.26% line coverage |
| Full backend coverage | FAIL — 211 passed, 14 failed; 78% coverage; isolated in-memory SQLite only |
| Required root `tsc --noEmit` | PASS, but the solution config has no source files to check |
| Explicit app `tsc --noEmit -p tsconfig.app.json` | FAIL — 31 existing diagnostics; none in new landing components/tests |
| Full ESLint | PASS — 0 errors, 37 existing warnings; changed landing files are clean |
| Full Playwright suite | NOT RUN — user-triggered only |
| Landing self-audit / architecture review | PASS |

All 6 landing acceptance criteria are satisfied. Status: **READY FOR FULL VERIFICATION**, with the project-wide recheck blocked by existing backend/typecheck failures. The project cannot be labeled COMPLETE or fully VERIFIED under AGENTS.md until those independent issues are resolved.

The backend failures are confined to existing email service/verification, invitation signup, and email-subject tests. Current non-production logic suppresses test-recipient deliveries before reaching the console outbox, while several tests expect outbox entries. Current registration also auto-verifies development test addresses while older assertions expect unverified accounts. Backend source and tests were not modified for this landing page. The TypeScript diagnostics concern existing board casts, missing settings/icon types, onboarding shapes, date types, and older test fixtures. Logs are retained locally in `artifacts/landing/{vitest-full,pytest-full,eslint-full,typescript-app}.log`.

Visual review compared rendered reference and implementation captures at matching desktop/tablet/mobile viewports. The adaptation retains the centered hero, product frame, section rhythm, modular feature panels, and repeated CTA while improving readable mobile preview controls. Iteration corrected narrow-screen FAQ word spacing, scoped color helpers, preview text contrast, and accessible attachment/comment labels. Production preview is available locally at `http://127.0.0.1:4173/` while its server is running. No deployment was performed.

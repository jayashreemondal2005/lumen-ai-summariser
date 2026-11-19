# Testing

All numbers below were produced by the tools on 19 November 2026 at 10:37 am IST. Raw outputs are written to `reports/raw/` (gitignored) when you run the commands.

| Suite | Command | Result |
| --- | --- | --- |
| Unit (Vitest) | `npm test` | 132/132 passed (6 files) |
| End-to-end (Playwright, live site) | `E2E_BASE_URL=https://lumen-ai-summariser.netlify.app npx playwright test` | 22/22 passed in 115 s |
| Security check (live site) | `node scripts/security-check.mjs https://lumen-ai-summariser.netlify.app` | 69/69 checks passed |
| Dependencies | `npm audit --omit=dev` | 0 known vulnerabilities in production dependencies |

## Unit tests

- `ai-features.test.ts`: 11/11 passed
- `ai-output.test.ts`: 18/18 passed
- `extract.test.ts`: 9/9 passed
- `safe-fetch.test.ts`: 19/19 passed
- `tickets.test.ts`: 20/20 passed
- `url-guard.test.ts`: 55/55 passed

## End-to-end tests

- ✅ Home and summariser › renders the hero, input and length options (desktop, 3.3 s)
- ✅ Home and summariser › validates input on the client before any request (desktop, 3.2 s)
- ✅ Home and summariser › Terms gate requires scrolling to the end before accepting (desktop, 3.7 s)
- ✅ Home and summariser › blocks SSRF targets with a clear message (desktop, 5.1 s)
- ✅ Home and summariser › summarises a real page end to end and saves it to guest history (desktop, 17.2 s)
- ✅ Ask Tara and support › Tara answers from the Help Center and offers a person (desktop, 5.6 s)
- ✅ Ask Tara and support › ticket form validates and shows the ticket ID (email sending mocked) (desktop, 5.1 s)
- ✅ Ask Tara and support › Help Center search finds articles (desktop, 3.7 s)
- ✅ Tour and settings › first-time tour appears and can be skipped (desktop, 5.9 s)
- ✅ Tour and settings › settings persist: avatar, default length and dark theme (desktop, 3.6 s)
- ✅ Legal, security and accessibility › legal pages show version and operator (desktop, 3.9 s)
- ✅ Legal, security and accessibility › security headers are set on pages and APIs (desktop, 1.1 s)
- ✅ Legal, security and accessibility › API rejects cross-site and malformed requests (desktop, 1.8 s)
- ✅ Legal, security and accessibility › no secrets in the client bundle (desktop, 1.8 s)
- ✅ Legal, security and accessibility › theme toggle switches to dark and back (desktop, 3.4 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on / (desktop, 5.1 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on /help (desktop, 7.8 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on /legal/terms (desktop, 5.0 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on /support (desktop, 3.0 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on /history (desktop, 6.9 s)
- ✅ Legal, security and accessibility › axe: no serious accessibility violations on /settings (desktop, 8.0 s)
- ✅ Mobile @mobile › @mobile no horizontal scroll and menu works (mobile, 4.3 s)

The support-ticket UI test mocks only the ticket API so no real emails are sent; email templates are covered by unit tests.

## Lighthouse (live site)

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| home-mobile | 96 | 100 | 96 | 100 | 1.3 s | 190 ms | 0 |
| home-desktop | 99 | 100 | 96 | 100 | 0.4 s | 10 ms | 0.002 |
| help-mobile | 98 | 100 | 96 | 100 | 1.2 s | 150 ms | 0.012 |
| terms-mobile | 98 | 100 | 96 | 100 | 1.1 s | 130 ms | 0 |

## Security check groups

- headers: 15/15
- secrets: 10/10
- ssrf: 27/27
- validation: 8/8
- authz: 9/9

Development-only audit findings: fdir (high), picomatch (high), tinyglobby (high), vite (high), vitest (high) (test tooling, not deployed).

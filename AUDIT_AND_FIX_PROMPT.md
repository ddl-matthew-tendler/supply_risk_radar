# Audit & Fix Prompt — Bring an Existing Domino App Into Spec

Copy the prompt below into any Claude Code session inside an app project folder (msl_field_insights, supply_risk_radar, target_scout, etc.) to audit it against the Domino guidelines and produce a fix plan.

---

## Copy-paste prompt

```
Before doing anything else, read these files in order:

1. /Users/matthewtendler/Library/CloudStorage/Dropbox/Projects/dominoapps/CLAUDE.md
   — the authoritative Domino app guidelines (stack, theme tokens, button hierarchy, UX checklist)

2. /Users/matthewtendler/Library/CloudStorage/Dropbox/Projects/dominoapps/target_scout/etan_workshop_app/.cursor/rules/how-to-build-domino-apps.mdc
   — original tech/API guidelines

3. /Users/matthewtendler/Library/CloudStorage/Dropbox/Projects/dominoapps/target_scout/etan_workshop_app/.cursor/rules/usability_design_principles.mdc
   — full UX principles and color tokens

4. Scan /Users/matthewtendler/Library/CloudStorage/Dropbox/Projects/dominoapps/target_scout/etan_workshop_app/example_uis_to_review/
   for reference screenshots of correct Domino UI patterns

Then invoke the `domino-app` skill, audit this app's frontend against the guidelines, and produce a punch list of what's out of spec before making any changes. Cover specifically:

- **CDN setup** — React 18 + Ant Design 5.11.2 + Day.js + Inter font + Highcharts via CDN, no build step
- **ConfigProvider theme** — is the app wrapped in it with `colorPrimary: '#543FDE'`, Inter font, `borderRadius: 4`?
- **Colors** — are hex values the exact Domino tokens, or custom?
- **Top nav** — 44px height, `#2E2E38` background, `domino-logo.svg` at 32px, white text?
- **Button hierarchy** — exactly one Primary per screen/modal? Cancel as Secondary?
- **Typography** — Inter font everywhere, correct sizes (H1 32 / H2 26 / H3 20 / body 14-16)?
- **Highcharts colors** — using the Domino accent palette?
- **Icon-only buttons** — tooltips present?
- **Empty states** — do they answer what / why / what to do?
- **Tables** — truncated cells have tooltips? Numbers right-aligned?
- **Copy** — sentence case, no exclamation points, no em dashes, specific CTA labels?

Show me the punch list first, grouped by severity (High / Medium / Low). Do NOT start fixing until I approve the list.

After fixes land, run the `ux-review` skill on each major screen to verify before declaring done.
```

---

## How to use

1. `cd` into the app project directory (e.g. `cd msl_field_insights`)
2. Start a Claude Code session
3. Paste the prompt block above
4. Review the punch list Claude produces
5. Approve the list (or narrow the scope) before Claude starts making changes
6. After fixes, verify with a UX review pass

## When to use a different approach

- **App is badly off-spec (wrong theme entirely, no `ConfigProvider`, custom CSS framework)** — consider asking Claude to scaffold a fresh frontend using the guidelines and port the business logic, rather than patching. Tell it: "treat this as a from-scratch rebuild of the frontend, keep the FastAPI backend routes intact."
- **Small tweak to an in-spec app** — skip the audit; just reference the guidelines CLAUDE.md and describe the change.
- **Brand-new app** — don't use this prompt. Just say "build a Domino app that does X" and the global `~/.claude/CLAUDE.md` protocol will kick in.

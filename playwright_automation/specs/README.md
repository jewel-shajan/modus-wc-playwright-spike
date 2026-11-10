# Component test plans

One markdown plan per component: `specs/<slug>.md`.

| Status | Meaning |
| --- | --- |
| `DRAFT` | Generated from graph + PR + sheet; an `add` or `remove` row is still open |
| `READY` | Every automated row is `keep`. `agent:apply` has nothing to stub or delete |
| `NEED CLARIFICATION` | Conflicting sources; block generation |

With no master sheet, a component that already has tests is planned from those titles (`keep`). The three archetype rows are written only when the component has no tests and no sheet rows. A sheet cell of no, manual, or skip is action `manual` and stays out of Playwright.

Generate plans: `npm run agent:plan` (after `npm run agent:scope`).

Plans are the source of truth for **which** scenarios should exist. Cursor (or QA) implements **how** in `tests/components/<slug>/`.

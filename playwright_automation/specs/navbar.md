# modus-wc-navbar

Status: **READY**

## Sources
- PR: https://github.com/jewel-shajan/modus-wc-playwright-spike/pull/8 feat: add the Trimble Developer Console logo
- Issue: n/a
- Master sheet: not loaded (set MASTER_SHEET_CSV or export to .agent/master-sheet.csv)

## Graph scope
- Changed tag: modus-wc-navbar
- reverseImpact parents: none
- compose/slot/hosts children: modus-wc-avatar, modus-wc-button, modus-wc-card, modus-wc-logo, modus-wc-menu, modus-wc-menu-item, modus-wc-text-input, modus-wc-toolbar

## PR context
```
### :page_facing_up: Summary of Changes

### :thought_balloon: Type of Change

- [ ] Bug fix (fixes an issue)
- [ ] New feature (adds functionality)
- [ ] Configuration change (modifies scaling or properties of existing infrastructure & services)
- [ ] Documentation change
- [ ] Other

### :clipboard: Test Plan

[comment]: # 'How do you know the changes are safe to ship to production?'
[comment]: # 'How do you know the changes will function as expected in future releases?'

### :white_check_mark: Self Code Review Checklist

PR authors and reviewers, please verify that all of these items have been completed.

- [ ] My code is clean and readable
- [ ] I followed standard conventions
- [ ] Component code is WCAG 2.2 compliant (if applicable)
- [ ] I have made theme files changes (if applicable)
- [ ] I have made documentation changes (if applicable)
- [ ] I have made Storybook changes including usage documentation (if applicable)
- [ ] I have tested the component thoroughly in Storybook including RTL rendering (if applicable)

### :link: Work Item

Closes #

```

## Issue context
```

```

## Scenarios
| id | action | automate | source | title |
| --- | --- | --- | --- | --- |
| NAVBAR-STORIES | add | yes | archetype | should cover default stories for navbar [navbar-stories] @master |
| NAVBAR-PROPS | add | yes | archetype | should cover public props for navbar [navbar-props] @master |
| NAVBAR-A11Y | add | yes | archetype | should pass axe on interactive state for navbar [navbar-a11y] @master |

## Agent gates
- Set `Status: **READY**` after QA edits scenarios.
- Run `npm run agent:apply` to add stubs / apply removals from `remove` rows.
- Use Cursor **playwright-pr-orchestrator** skill to implement `add` rows as real tests.

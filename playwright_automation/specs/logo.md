# modus-wc-logo

Status: **READY**

## Sources
- PR: https://github.com/jewel-shajan/modus-wc-playwright-spike/pull/8 feat: add the Trimble Developer Console logo
- Issue: n/a
- Master sheet: not loaded (set MASTER_SHEET_CSV or export to .agent/master-sheet.csv)

## Graph scope
- Changed tag: modus-wc-logo
- reverseImpact parents: modus-wc-app-menu, modus-wc-navbar
- compose/slot/hosts children: none

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
| LOGO-A11Y-1 | keep | yes | existing:a11y.spec.ts | should pass axe on full wordmark @master |
| LOGO-A11Y-2 | keep | yes | existing:a11y.spec.ts | should pass axe on emblem variant @master |
| LOGO-A11Y-3 | keep | yes | existing:a11y.spec.ts | should match ARIA snapshot for img role @master |
| LOGO-CSS-1 | keep | yes | existing:css.spec.ts | should resolve logo fill tokens on host for ${theme} @master |
| LOGO-PERFORMANCE-1 | keep | yes | existing:performance.spec.ts | should show the default story within the ready budget @master |
| LOGO-PERFORMANCE-2 | keep | yes | existing:performance.spec.ts | should apply a name change within the update budget @master |
| LOGO-PERFORMANCE-3 | keep | yes | existing:performance.spec.ts | should apply an emblem change within the update budget @master |
| LOGO-PROPS-1 | keep | yes | existing:props.spec.ts | should apply name prop via sync fallback @master |
| LOGO-PROPS-2 | keep | yes | existing:props.spec.ts | should switch to emblem class when emblem is true @master |
| LOGO-PROPS-3 | keep | yes | existing:props.spec.ts | should use alt prop for aria-label when provided @master |
| LOGO-PROPS-4 | keep | yes | existing:props.spec.ts | should default aria-label from name when alt omitted @master |
| LOGO-PROPS-5 | keep | yes | existing:props.spec.ts | should assert emblem viewBox 0 0 32 32 not wordmark @master |
| LOGO-PROPS-6 | keep | yes | existing:props.spec.ts | should assert wordmark viewBox 0 0 106 32 on combined logo @master |
| LOGO-PROPS-7 | keep | yes | existing:props.spec.ts | should load the connect emblem svg and not the wordmark @master |
| LOGO-PROPS-8 | add | yes | pr:developer-console | should render developer_console self-contained wordmark without combined split [tc:LOGO-PROPS-8] @master |
| LOGO-SHADOW-DOM-1 | keep | yes | existing:shadow-dom.spec.ts | should render modus-wc-logo inside logo-shadow-host @master |
| LOGO-SHADOW-DOM-2 | keep | yes | existing:shadow-dom.spec.ts | should propagate data-theme into shadow wrapper @master |
| LOGO-SHOW-CODE-1 | keep | yes | existing:show-code.spec.ts | should render docs snippet containing modus-wc-logo @master |
| LOGO-STORIES-1 | keep | yes | existing:stories.spec.ts | should render default canvas with role img @master |
| LOGO-STORIES-2 | keep | yes | existing:stories.spec.ts | should apply custom size classes on CustomSizeWithClass @master |
| LOGO-STORIES-3 | keep | yes | existing:stories.spec.ts | should render ShadowDomParent with logo-shadow-host @master |
| LOGO-STORIES-4 | keep | yes | existing:stories.spec.ts | should load autodocs describing Trimble logos @master |

## Agent gates
- Set `Status: **READY**` after QA edits scenarios.
- Run `npm run agent:apply` to add stubs / apply removals from `remove` rows.
- Use Cursor **playwright-pr-orchestrator** skill to implement `add` rows as real tests.

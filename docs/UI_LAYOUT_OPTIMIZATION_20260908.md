# Workspace layout QA — 2026-09-08

Scope: shared heading hierarchy, list-first application records, compact radar/resume/practice/interview layouts, mobile access, disclosure controls and keyboard focus. Existing public/private data models unchanged.

- Shared page titles: 28px desktop / 24px at 760px and below; body 16px, questions 18px.
- Browser geometry checked at 320, 390, 620, 1024, 1280 and 1440px for home, practice, radar, resume, interviews, applications, rules and exam. No document horizontal overflow; answer-grid overflow 0.
- Synthetic application edited by clicking position; saved title visible, modal closed and focus returned to editor trigger. Secondary fields expanded without modifying records.
- Mobile radar selection opens detail, hides controls/list; return restores the list and focuses selected item.
- Modal focus wrapping, return focus, tab selection and arrow activation covered by tests.
- Home retains exactly one quote/wooden-fish row; stage counts and actionable reminders retained. At 390px, agenda begins around 485px instead of the audited 801px.
- Mobile application main card measured 341px, down from audited 755px; all remaining fields available under Details.
- Public build and release scanner passed. Tests: 68 passed.
- Merged concurrent company grouping / role-category work and removal of the duplicate next-action module from main (13d3af7). No private user data used in fixtures or committed.
- Browser testing used synthetic records; no production records modified. 200% browser zoom was not separately simulated; 320px reflow tested.

# Luma UI visual acceptance — Phase 3

Issue: #15. Prior frontend PRs: #14 and #16. This pass exercises Chromium production preview against entirely synthetic /txapi fixtures.

## Browser and screenshot coverage

- Authenticated React purchase dialog with 140+ Chinese characters in plan title at 375×667, plus 320×480 with reduced motion.
- Order detail dialog at 375×667, with no payment request.
- Ticket creation dialog at 375×480, including keyboard focus and labels.
- Sidebar expanded/collapsed and dark mode at 320, 390, 768, 1024 and 1440.
- Modal viewport bounds, 44×44 close targets, reachable confirmation controls, Escape/focus restoration, document overflow and scroll lock.
- Screenshots are retained for manual visual inspection by CI in the artifact named luma-mocked-visual-qa (seven-day retention); never point this test at real users or a staging account.

## UI changes

- Raise modal close target to 44px; wrap overly long modal headings.
- Set wide-dialog maximum heights in dvh units for short-screen access.
- Properly link ticket creation labels to their form fields.
- Do not alter checkout or session business behavior.

## Explicit boundaries

These UI tests do not prove real gateway callbacks, server-side entitlement, or theme rollback. Those are part of #13 and require an isolated staging operator.

## Local commands

- npm test
- TXBOARD_THEME=true TXBOARD_THEME_PREVIEW=true npm run build
- npm run test:live
- TXBOARD_THEME=true npm run build
- npm run check:theme-package

Review all generated images in Chromium before closing #15; a green automation alone is not a substitute for visual inspection.

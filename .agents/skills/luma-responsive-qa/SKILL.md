---
name: luma-responsive-qa
description: Verify Luma Theme's desktop, tablet and mobile layouts with Playwright, including keyboard, tap target, overflow, dark mode and checkout dialogs.
---

# Luma responsive QA

## Test matrix
- Widths: 320, 375, 390, 720, 768, 1024, 1440; include at least one 667px-tall mobile viewport.
- Modes: top navigation and sidebar; light and dark; comfortable and compact densities.
- Routes: login/register, dashboard, subscription import, shop, purchase dialog, pending order, profile/security, tickets and menu.
- States: missing subscription, long brand name, long plan titles, many navigation items, a hidden page, loading and error.
- Input: keyboard-only focus cycle, Escape in dialogs, small touch targets, text enlargement, reduced-motion preference.

## Browser acceptance
- `document.documentElement.scrollWidth <= window.innerWidth + 1` (except consciously scrollable inner tables, where the page itself must not overflow).
- Top-bar icon buttons and critical form buttons are at least 44px in both dimensions at mobile sizes.
- Bottom navigation labels stay legible and never overlap the safe area.
- Modal controls are reachable in short viewports, the page behind stays locked, and focus returns on close.
- No icon-only button without an accessible name, no hover-only action, no placeholders masquerading as labels.
- Confirm keyboard focus and both theme contrasts.
- Do not generate real users or payment orders in CI: mock `/txapi/**`; reserve real gateway checks for approved staging.

## Commands
```sh
npm run test:live
npm run test:e2e
npm test
```

Run screenshots for visual inspection if a Chromium environment is available; computed geometry assertions are not a substitute for looking at the page. For any production source change, regenerate and check `theme-package/` before merge.

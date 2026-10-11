---
name: luma-ui-audit
description: Review and polish Luma Theme's visual hierarchy, design tokens, responsive layout, accessibility and dark mode without changing TXBoard business behavior.
---

# Luma visual/UI audit

## Context and constraints
- Project: React 19 + Vite 6, CSS tokens in `src/tokens.css`, foundational styles in `src/base.css`, component styles in `src/components.css`, responsive rules in `src/responsive.css`.
- Maintain Luma's existing cool-teal, uncluttered card-based visual language. Do not replace it with a generic theme or import external fonts/assets without reviewing loading, privacy and license.
- Real mode lives in `src/live/`, demo mode in `src/main.jsx`; both share CSS. Changes must work in both.
- Never change authentication, payment, subscription entitlement or server-derived pricing while performing a visual-only pass.

## Review order
1. Usability: headings and actions explain each step; purchasing and subscribing remain obvious.
2. Accessibility: 4.5:1 contrast for ordinary text; keyboard focus is visible; all functional icon buttons have accessible labels; mobile touch targets aim for at least 44×44 CSS pixels.
3. Responsiveness: verify 320, 375, 390, 720, 768, 1024 and 1440 CSS-pixel widths and landscape/short heights; no horizontal page overflow.
4. Layout: keep one spacing scale, consistent card padding/rounding, readable plan price hierarchy and well-spaced forms.
5. Dark mode and reduced motion: verify both themes without depending on hover; honor `prefers-reduced-motion`.
6. Performance: avoid unnecessary external fonts, images, large libraries, repaint-heavy decorative animation and cumulative layout shift.

## Procedure
- Start with a code audit and describe the existing components/selectors involved.
- Prefer editing existing variables over adding more one-off hex colors. Check overrides in responsive CSS and selector precedence before changing a base style.
- Make small, independently testable modifications. Add Node or Playwright regression tests.
- Follow `npm test`, `npm run test:e2e`, `TXBOARD_THEME=true npm run build`, `npm run check:theme-package` and `npm run test:live`. The committed `theme-package/` MUST match the built source.
- For CSS or JSX changes, regenerate all hashed `theme-package/` resources before allowing merge. Preview both regular and TXBOARD_THEME modes.
- Do not merge when tests, build artifacts or staging checks are pending.

## References (read-only external guidance)
- UI/UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Vercel Web Interface Guidelines: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- Frontend design guidance: https://github.com/vercel-labs/open-agents/tree/main/.agents/skills/frontend-design

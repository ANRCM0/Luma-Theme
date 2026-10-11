---
name: luma-react-performance
description: Improve Luma's React rendering and interaction responsiveness without changing TXBoard API contracts, session safety or payment side effects.
---

# Luma React frontend performance

1. Inspect `src/live/LiveApp.jsx`, components and `src/live/api.js` before optimizing. Identify actual waterfalls, repeated data requests, expensive renders and large bundles; don't optimize speculatively.
2. Fetch independent server data concurrently, guard old-account responses by token/epoch and preserve current error handling. Keep payment status reads server-authoritative and bounded.
3. Avoid using effects for values that can be derived during render; avoid redundant state and unnecessary re-render cascades. Keep stable keys on lists.
4. Consider splitting heavy route components and lazy-loading rarely used screens only after a measurable build/bundle or interaction benefit, with loading/error UI.
5. Avoid eager third-party scripts in login and dashboard. Do not preload sensitive subscription URLs or store payment card data in state.
6. Preserve Vite's production `TXBOARD_THEME` base path and hashed assets; generated `theme-package/` files must be checked into the same PR as every functional/UI source change.
7. Add tests for concurrency, unmount cleanup, empty results, network errors, keyboard/touch operation and backward compatibility.

Reference: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices

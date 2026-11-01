# Current code reading order

This map describes the active source at the current `main`-based revision. Read the Vue client first, then the JSON API; the older EJS path is retained for compatibility but is marked `LEGACY` in source comments.

1. `client/src/main.js` - browser entry point, global styles, and router mount.
2. `client/src/App.vue` - persistent navbar, route page transition, minimap, and comparison tray.
3. `client/src/router.js` - route table and authentication/role guard.
4. `client/src/views/` - page-level flows, starting with `HomeView.vue`, `BuildingView.vue`, `FloorView.vue`, and `SpotDetailView.vue`.
5. `client/src/components/` - shared navigation, maps, floor plans, reviews, favourites, and comparison UI.
6. `client/src/stores/` and `client/src/api.js` - session state, comparison state, and the JSON request boundary.
7. `client/src/style.css` - notebook theme, responsive layout, focus styles, and route transition rules.
8. `routes/api/` - active JSON endpoints; then their controllers, models, middleware, and services.
9. `scripts/synthetic-preview.cjs` - isolated in-memory preview adapter and its fixture data.
10. `test/` - focused comparison, directions, authentication, and theme checks.

`server.js` is the backend entry point. Its `/api` mount is active; the root EJS route mounts, `views/`, and the related legacy controller sections remain only as compatibility paths and are labelled in source. `public/styles.css` is the legacy EJS stylesheet.

Excluded from source annotation coverage: `node_modules/`, `client/dist/`, package lockfiles, binary assets, `.DS_Store`, `config.env`, and generated/build output. JSON files remain valid and are not given comment syntax.

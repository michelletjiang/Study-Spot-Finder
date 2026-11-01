# Isolated synthetic preview

This preview is for review only. It uses invented in-memory users and spots, blocks outbound requests, and never connects to MongoDB or OneMap. Changes disappear when the backend restarts.

From the repository root, install dependencies normally, then run two terminals:

```sh
PORT=8011 node -r ./scripts/synthetic-preview.cjs server.js
npm --prefix client exec vite -- --config "$PWD/scripts/vite.synthetic.config.mjs" --host 127.0.0.1 --port 5184 --strictPort
```

Open http://127.0.0.1:5184/login. Synthetic accounts are `demo.student@local.test` / `CompareDemo123!` and `demo.admin@local.test` / `AdminDemo123!`. To try registration, create a new account with a username of at least five characters, a valid email, an eight-character password, and one school. The new account remains available until the preview backend restarts.

After login, open Demo Library, choose two or three spots, and select Compare selected. The fourth selection is rejected. This preview is not production deployment, does not prove persistence, and does not use real accounts or provider credentials.

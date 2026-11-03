const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

process.env.SECRET = 'frontend-serving-test-secret';
const app = require('../server');

test('Express serves the Vue build and deep links without swallowing API routes', async (t) => {
    const html = await fs.readFile(path.join(__dirname, '../client/dist/index.html'), 'utf8');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}`;

    for (const route of ['/', '/index.html', '/login', '/register', '/find', '/building/SCIS%201/floor/2', '/spots/507f1f77bcf86cd799439011', '/compare?ids=a,b']) {
        const res = await fetch(base + route);
        assert.equal(res.status, 200, route);
        assert.match(res.headers.get('content-type'), /text\/html/);
        assert.equal(await res.text(), html, route);
    }

    for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
        const res = await fetch(base + asset[1]);
        assert.equal(res.status, 200, asset[1]);
        assert.doesNotMatch(res.headers.get('content-type'), /text\/html/);
        assert.ok((await res.arrayBuffer()).byteLength > 0);
    }

    assert.deepEqual(await (await fetch(base + '/api/health')).json(), { ok: true });
    assert.deepEqual(await (await fetch(base + '/api/me')).json(), { user: null });
    const protectedRoute = await fetch(base + '/api/spots');
    assert.equal(protectedRoute.status, 401);
    assert.match(protectedRoute.headers.get('content-type'), /application\/json/);
    const missing = await fetch(base + '/api/not-a-route');
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type'), /application\/json/);
    const legacyPost = await fetch(base + '/login', { method: 'POST' });
    assert.equal(legacyPost.status, 404);
});

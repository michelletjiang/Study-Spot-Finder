const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../server');

test('live health endpoint does not require the database', async () => {
  const response = await request(createApp()).get('/health/live');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('direct navigation has a consistent not-found response', async () => {
  const response = await request(createApp()).get('/does-not-exist');
  assert.equal(response.status, 404);
  assert.match(response.text, /Page not found/);
});

test('state-changing requests require CSRF protection', async () => {
  const response = await request(createApp()).post('/login').send({ email: 'nobody@example.com', password: 'wrong' });
  assert.equal(response.status, 403);
});

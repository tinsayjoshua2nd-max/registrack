import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionToken, hashPassword, hashSessionToken, makeTemporaryPassword, verifyPassword } from './security';

test('passwords are salted hashes and exact credentials are required', async () => {
  const password = makeTemporaryPassword();
  const [a, b] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.notEqual(a, b);
  assert(!a.includes(password));
  assert(await verifyPassword(password, a));
  assert.equal(await verifyPassword(`${password}-wrong`, a), false);
});

test('malformed password hashes fail closed', async () => {
  for (const value of ['', 'plaintext', 'scrypt$salt$!', 'other$salt$key']) {
    assert.equal(await verifyPassword('any-password', value), false);
  }
});

test('session tokens and temporary passwords have independent cryptographic randomness', () => {
  const a = createSessionToken();
  const b = createSessionToken();
  assert.notEqual(a, b);
  assert.notEqual(hashSessionToken(a), a);
  assert.equal(hashSessionToken(a).length, 64);
  assert.notEqual(makeTemporaryPassword(), makeTemporaryPassword());
});
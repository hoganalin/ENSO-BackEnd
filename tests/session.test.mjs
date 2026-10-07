import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSessionToken, createSessionCookie, authenticationErrorMessage } from '../src/service/session.js';

test('session reads primary and legacy cookies without confusing cookie names', () => {
  assert.equal(readSessionToken('othermyToken=x; hexToken=old; myToken=new'), 'new');
  assert.equal(readSessionToken('myToken=; hexToken=old'), 'old');
  assert.equal(readSessionToken('othermyToken=x'), '');
});
test('remembered login supports seconds and milliseconds while session login omits expiry', () => {
  const now = 1800000000000;
  const future = now + 3600000;
  const expected = new Date(future).toUTCString();
  for (const expired of [future, future / 1000]) {
    assert.ok(createSessionCookie({ token: 'test-token', expired }, true, now).includes(expected));
  }
  assert.equal(createSessionCookie({ token: 'test-token' }, false), 'myToken=test-token;path=/;SameSite=Lax');
});
test('failed or malformed login cannot create an authenticated cookie', () => {
  for (const data of [null, {}, { success: false, token: 'test' }, { token: 'bad;cookie' }, { token: '' }]) {
    assert.throws(() => createSessionCookie(data, false));
  }
  for (const expired of [0, undefined, 'invalid', Infinity]) {
    assert.throws(() => createSessionCookie({ token: 'test', expired }, true));
  }
});
test('login distinguishes offline, timeout, throttling and service outage', () => {
  assert.match(authenticationErrorMessage({ isAxiosError: true }), /無法連線/);
  assert.match(authenticationErrorMessage({ code: 'ECONNABORTED' }), /逾時/);
  assert.match(authenticationErrorMessage({ response: { status: 429 } }), /次數過多/);
  assert.match(authenticationErrorMessage({ response: { status: 503 } }), /暫時無法使用/);
});

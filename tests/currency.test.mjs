import assert from 'node:assert/strict';
import { test } from 'node:test';

import { currency, formatTwd } from '../src/assets/utils/filter.js';

test('TWD is explicit and numbers are formatted without exchange-rate conversion', () => {
  assert.equal(formatTwd(980), 'NT$ 980');
  assert.equal(formatTwd('1280'), 'NT$ 1,280');
  assert.equal(formatTwd(1980), 'NT$ 1,980');
  assert.equal(formatTwd(0), 'NT$ 0');
  assert.equal(currency(1234.5), '1,234.5');
});

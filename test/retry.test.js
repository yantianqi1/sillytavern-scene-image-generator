import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeRetryCount, runWithRetries } from '../src/retry.js';

test('normalizes retry count to a safe non-negative integer', () => {
    assert.equal(normalizeRetryCount('3'), 3);
    assert.equal(normalizeRetryCount(2.8), 2);
    assert.equal(normalizeRetryCount(-1), 0);
    assert.equal(normalizeRetryCount('nope'), 0);
});

test('retries a failing operation until it succeeds', async () => {
    let calls = 0;

    const result = await runWithRetries(async () => {
        calls += 1;
        if (calls < 3) {
            throw new Error(`fail ${calls}`);
        }
        return 'ok';
    }, { retries: 3 });

    assert.equal(result, 'ok');
    assert.equal(calls, 3);
});

test('throws the last error after retry attempts are exhausted', async () => {
    let calls = 0;

    await assert.rejects(
        runWithRetries(async () => {
            calls += 1;
            throw new Error(`fail ${calls}`);
        }, { retries: 2 }),
        /fail 3/,
    );

    assert.equal(calls, 3);
});

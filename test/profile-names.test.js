import test from 'node:test';
import assert from 'node:assert/strict';

import { getProfileNameForProvider } from '../src/profile-names.js';

test('derives profile names from provider type', () => {
    assert.equal(getProfileNameForProvider('openai-compatible'), 'OpenAI 兼容生图');
    assert.equal(getProfileNameForProvider('novelai-newapi'), 'NovelAI NewAPI 生图');
    assert.equal(getProfileNameForProvider('unknown'), '生图 API');
});


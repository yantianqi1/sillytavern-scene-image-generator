import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchOpenAICompatibleModels } from '../src/providers/openai-compatible.js';

test('fetches OpenAI compatible models from the models endpoint', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.example.com/v1/models');
        assert.equal(options.method, 'GET');
        assert.equal(options.headers.Authorization, 'Bearer sk-test');

        return {
            ok: true,
            async json() {
                return {
                    data: [
                        { id: 'gpt-image-1' },
                        { id: 'gpt-image-1' },
                        { id: 'gpt-image-2' },
                        { id: '' },
                    ],
                };
            },
        };
    };

    try {
        const models = await fetchOpenAICompatibleModels({
            apiUrl: 'https://api.example.com/v1/',
            apiKey: 'sk-test',
        });

        assert.deepEqual(models, ['gpt-image-1', 'gpt-image-2']);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('falls back to /v1/models for OpenAI compatible root URLs', async () => {
    const previousFetch = globalThis.fetch;
    const requestedUrls = [];
    globalThis.fetch = async (url) => {
        requestedUrls.push(url);
        if (url === 'https://api.example.com/models') {
            return {
                ok: false,
                status: 404,
                async json() {
                    return { error: { message: 'not found' } };
                },
                async text() {
                    return 'not found';
                },
            };
        }

        return {
            ok: true,
            async json() {
                return { data: [{ id: 'gpt-image-2' }] };
            },
        };
    };

    try {
        const models = await fetchOpenAICompatibleModels({
            apiUrl: 'https://api.example.com/',
            apiKey: '',
        });

        assert.deepEqual(requestedUrls, [
            'https://api.example.com/models',
            'https://api.example.com/v1/models',
        ]);
        assert.deepEqual(models, ['gpt-image-2']);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

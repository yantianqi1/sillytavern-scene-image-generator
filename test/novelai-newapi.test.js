import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildNovelAIRequestBody,
    fetchNovelAIModels,
    generateNovelAIImage,
    getNovelAIModelSize,
    NOVELAI_MODEL_PRESETS,
    normalizeNovelAISteps,
    parseNovelAIParams,
} from '../src/providers/novelai-newapi.js';

test('provides the requested default NovelAI model presets', () => {
    assert.deepEqual(NOVELAI_MODEL_PRESETS, [
        'nai-diffusion-4-5-full-1024x1024',
        'nai-diffusion-4-5-full-1832x1216',
        'nai-diffusion-4-5-full-11216x832',
    ]);
});

test('builds a NewAPI NovelAI image request body with recommended defaults', () => {
    const body = buildNovelAIRequestBody('1girl, solo', {
        negativePrompt: 'lowres, bad anatomy',
        size: '832x1216',
        responseFormat: 'b64_json',
    });

    assert.deepEqual(body, {
        model: 'nai-diffusion-4-5-full-1024x1024',
        prompt: '1girl, solo',
        negative_prompt: 'lowres, bad anatomy',
        size: '1024x1024',
        n: 1,
        response_format: 'b64_json',
        steps: 28,
        scale: 5,
        sampler: 'k_euler_ancestral',
        novelai: {
            qualityToggle: true,
            ucPreset: 0,
        },
    });
});

test('extracts fixed image size from NovelAI model names', () => {
    assert.equal(getNovelAIModelSize('nai-diffusion-4-5-full-1832x1216'), '1832x1216');
    assert.equal(getNovelAIModelSize('nai-diffusion-4-5-full-11216x832'), '11216x832');
    assert.equal(getNovelAIModelSize('nai-v45-full'), '');
});

test('uses the fixed size from the selected NovelAI model over manual size settings', () => {
    const body = buildNovelAIRequestBody('prompt', {
        model: 'nai-diffusion-4-5-full-1832x1216',
        size: '1024x1024',
    });

    assert.equal(body.size, '1832x1216');
});

test('allows only the supported NovelAI step presets', () => {
    assert.equal(normalizeNovelAISteps(20), 20);
    assert.equal(normalizeNovelAISteps(28), 28);
    assert.equal(normalizeNovelAISteps(22), 28);
    assert.equal(normalizeNovelAISteps('20'), 20);
    assert.equal(normalizeNovelAISteps('bad'), 28);
});

test('includes advanced NovelAI parameters when configured', () => {
    const body = buildNovelAIRequestBody('prompt', {
        model: 'nai-v45-full',
        steps: 20,
        scale: 7,
        sampler: 'k_dpmpp_2m',
        seed: '123456',
        novelaiParams: '{"qualityToggle":true,"ucPreset":0,"cfg_rescale":0,"sm":false,"sm_dyn":false,"noise_schedule":"karras"}',
        extraParams: '{"extra_body":{"novelai":{"noise_schedule":"karras"}}}',
    });

    assert.equal(body.steps, 20);
    assert.equal(body.scale, 7);
    assert.equal(body.sampler, 'k_dpmpp_2m');
    assert.equal(body.seed, 123456);
    assert.equal(body.novelai.noise_schedule, 'karras');
    assert.equal(body.extra_body.novelai.noise_schedule, 'karras');
});

test('rejects invalid NovelAI JSON parameters', () => {
    assert.throws(
        () => parseNovelAIParams('{bad json'),
        /NovelAI 参数 JSON 无效/,
    );
});

test('generates a data image URL from NewAPI NovelAI b64 response', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://api.example.com/v1/images/generations');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, 'Bearer sk-test');
        assert.equal(JSON.parse(options.body).model, 'nai-v45-full');

        return {
            ok: true,
            async json() {
                return { data: [{ b64_json: 'abc123' }] };
            },
        };
    };

    try {
        const imageUrl = await generateNovelAIImage('prompt', {
            apiUrl: 'https://api.example.com/v1/',
            apiKey: 'sk-test',
            model: 'nai-v45-full',
        });

        assert.equal(imageUrl, 'data:image/png;base64,abc123');
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('uses OpenAI-style NewAPI error messages', async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: false,
        status: 402,
        async json() {
            return { error: { message: '账户余额不足，请充值' } };
        },
    });

    try {
        await assert.rejects(
            () => generateNovelAIImage('prompt', {
                apiUrl: 'https://api.example.com/v1',
                apiKey: 'sk-test',
                model: 'nai-v45-full',
            }),
            /账户余额不足，请充值/,
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('fetches NovelAI models from the NewAPI models endpoint', async () => {
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
                        { id: 'nai-diffusion-4-5-full-1024x1024' },
                        { id: 'nai-diffusion-4-5-full-1024x1024' },
                        { id: 'nai-diffusion-4-5-full-1832x1216' },
                        { id: '' },
                    ],
                };
            },
        };
    };

    try {
        const models = await fetchNovelAIModels({
            apiUrl: 'https://api.example.com/v1/',
            apiKey: 'sk-test',
        });

        assert.deepEqual(models, [
            'nai-diffusion-4-5-full-1024x1024',
            'nai-diffusion-4-5-full-1832x1216',
        ]);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('falls back to /v1/models when a root NewAPI URL does not expose /models', async () => {
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
            };
        }

        return {
            ok: true,
            async json() {
                return { data: [{ id: 'nai-diffusion-4-5-full-11216x832' }] };
            },
        };
    };

    try {
        const models = await fetchNovelAIModels({
            apiUrl: 'https://api.example.com/',
            apiKey: 'sk-test',
        });

        assert.deepEqual(requestedUrls, [
            'https://api.example.com/models',
            'https://api.example.com/v1/models',
        ]);
        assert.deepEqual(models, ['nai-diffusion-4-5-full-11216x832']);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

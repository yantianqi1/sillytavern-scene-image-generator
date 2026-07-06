import test from 'node:test';
import assert from 'node:assert/strict';

import {
    resolveSceneGenerationPrompt,
    resolveSceneGenerationProfile,
} from '../src/generation-prompt.js';

test('reuses the last prompt for image-only generation without rewriting', async () => {
    let rewriteCalls = 0;
    const result = await resolveSceneGenerationPrompt({
        reusePrompt: true,
        lastPrompt: 'cached prompt',
        lastBasePrompt: 'cached prompt',
        sceneText: 'current scene',
        settings: {},
        profile: { provider: 'openai-compatible' },
        rewritePromptFn: async () => {
            rewriteCalls += 1;
            return 'rewritten prompt';
        },
    });

    assert.deepEqual(result, {
        prompt: 'cached prompt',
        basePrompt: 'cached prompt',
        reusedPrompt: true,
    });
    assert.equal(rewriteCalls, 0);
});

test('reapplies the current NovelAI style when image-only generation reuses a base prompt', async () => {
    let rewriteCalls = 0;
    const result = await resolveSceneGenerationPrompt({
        reusePrompt: true,
        lastPrompt: 'old style\nbase prompt',
        lastBasePrompt: 'base prompt',
        sceneText: 'current scene',
        settings: {},
        profile: { provider: 'novelai-newapi' },
        rewritePromptFn: async () => {
            rewriteCalls += 1;
            return 'rewritten prompt';
        },
        applyNovelAIStylePromptFn: prompt => `current style\n${prompt}`,
    });

    assert.deepEqual(result, {
        prompt: 'current style\nbase prompt',
        basePrompt: 'base prompt',
        reusedPrompt: true,
    });
    assert.equal(rewriteCalls, 0);
});

test('requires an existing prompt for image-only generation', async () => {
    await assert.rejects(
        () => resolveSceneGenerationPrompt({
            reusePrompt: true,
            lastPrompt: '',
            lastBasePrompt: '',
            sceneText: 'current scene',
            settings: {},
            profile: { provider: 'openai-compatible' },
            rewritePromptFn: async () => 'rewritten prompt',
        }),
        /当前还没有可复用的提示词/,
    );
});

test('rewrites the scene prompt for normal generation', async () => {
    const result = await resolveSceneGenerationPrompt({
        reusePrompt: false,
        lastPrompt: 'cached prompt',
        sceneText: 'current scene',
        settings: {},
        profile: { provider: 'openai-compatible' },
        rewritePromptFn: async sceneText => `rewritten from ${sceneText}`,
    });

    assert.deepEqual(result, {
        prompt: 'rewritten from current scene',
        basePrompt: 'rewritten from current scene',
        reusedPrompt: false,
    });
});

test('applies NovelAI style after rewriting a normal NovelAI generation prompt', async () => {
    const result = await resolveSceneGenerationPrompt({
        reusePrompt: false,
        lastPrompt: 'cached prompt',
        sceneText: 'current scene',
        settings: {},
        profile: { provider: 'novelai-newapi' },
        rewritePromptFn: async () => 'rewritten prompt',
        applyNovelAIStylePromptFn: prompt => `style prompt\n${prompt}`,
    });

    assert.deepEqual(result, {
        prompt: 'style prompt\nrewritten prompt',
        basePrompt: 'rewritten prompt',
        reusedPrompt: false,
    });
});

test('binds the selected NovelAI style negative prompt to the generation profile', () => {
    const profile = {
        provider: 'novelai-newapi',
        negativePrompt: 'legacy profile negative',
    };
    const result = resolveSceneGenerationProfile({
        profile,
        settings: {},
        getNovelAIStyleNegativePromptFn: () => 'style negative',
    });

    assert.equal(result.negativePrompt, 'style negative');
    assert.equal(profile.negativePrompt, 'legacy profile negative');
});

test('keeps non-NovelAI generation profiles unchanged', () => {
    const profile = {
        provider: 'openai-compatible',
        negativePrompt: 'profile negative',
    };

    assert.equal(resolveSceneGenerationProfile({ profile }), profile);
});

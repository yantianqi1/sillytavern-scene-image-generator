import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_PROMPT_PRESETS,
    createPromptPreset,
    getSelectedPromptPreset,
    normalizePromptPresets,
} from '../src/prompt-presets.js';

test('provides multiple author preset prompts', () => {
    assert.ok(DEFAULT_PROMPT_PRESETS.length >= 3);
    assert.ok(DEFAULT_PROMPT_PRESETS.every(preset => preset.id && preset.name && preset.prompt));
});

test('uses the requested author preset display names', () => {
    assert.equal(
        DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-cinematic-realistic')?.name,
        'NSFW特化',
    );
    assert.equal(
        DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-anime-illustration')?.name,
        'gpt-image-2专属',
    );
    assert.equal(
        DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-novelai')?.name,
        'novelai',
    );
});

test('uses a clean 2D anime prompt for the default scene preset', () => {
    const preset = DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-default-scene');
    const prompt = preset?.prompt || '';

    assert.equal(preset?.name, '通用剧情生图');
    assert.match(prompt, /纯二次元动漫风格/);
    assert.match(prompt, /2D anime illustration/);
    assert.match(prompt, /anime screenshot style/);
    assert.match(prompt, /clean cel shading/);
    assert.match(prompt, /不要使用电影摄影、写实摄影、真人照片、3D 渲染或真实画风/);
    assert.match(prompt, /Prompt 必须使用英文/);
    assert.doesNotMatch(prompt, /新海诚/);
    assert.doesNotMatch(prompt, /cinematic/i);
    assert.doesNotMatch(prompt, /photorealistic/i);
});

test('uses the NovelAI specialized author prompt', () => {
    const prompt = DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-novelai')?.prompt || '';

    assert.match(prompt, /NovelAI/);
    assert.match(prompt, /comma-separated English prompt/i);
    assert.match(prompt, /Do not output Chinese/);
});

test('uses the NovelAI standard tag author prompt based on the tag guide', () => {
    const preset = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'author-novelai-standard-tags');
    const prompt = preset?.prompt || '';

    assert.equal(preset?.name, 'NovelAI标准Tag');
    assert.match(prompt, /NovelAI Tag 大全/);
    assert.match(prompt, /1girl, 1boy, 2girls/);
    assert.match(prompt, /masterpiece, best quality/);
    assert.match(prompt, /loli、shota、little girl、little boy/);
    assert.match(prompt, /只返回一行英文 tag/);
});

test('embeds the full NovelAI tag guide into the standard tag prompt', () => {
    const prompt = DEFAULT_PROMPT_PRESETS.find(item => item.id === 'author-novelai-standard-tags')?.prompt || '';

    assert.match(prompt, /完整可用 tag 词库/);
    assert.match(prompt, /共 1024 个 tag/);
    assert.match(prompt, /masterpiece — 大师作品/);
    assert.match(prompt, /vibrator_in_thighhighs — 震动开关在过膝袜里/);
    assert.match(prompt, /transformation — 肉体变形/);
    assert.match(prompt, /总计: 1024 个 tag/);
});

test('uses the requested NSFW specialized author prompt', () => {
    const prompt = DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-cinematic-realistic')?.prompt || '';

    assert.match(prompt, /顶级情色电影视觉导演与AI成人内容生图提示词工程师/);
    assert.match(prompt, /Prompt必须使用英文/);
    assert.match(prompt, /禁止在prompt中包含任何中文或emoji/);
});

test('uses the requested gpt-image-2 specialized author prompt', () => {
    const prompt = DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-anime-illustration')?.prompt || '';

    assert.match(prompt, /内容判定机制/);
    assert.match(prompt, /电影级隐喻与视觉转移/);
    assert.match(prompt, /Fluent Natural Language Paragraph/);
    assert.match(prompt, /Negative prompt: \(nsfw, nude, naked, deformed, ugly, bad anatomy:1\.3\)/);
});

test('uses the comic page author prompt preset', () => {
    const preset = DEFAULT_PROMPT_PRESETS.find(preset => preset.id === 'author-comic-page');
    const prompt = preset?.prompt || '';

    assert.equal(preset?.name, '漫画');
    assert.match(prompt, /漫画分镜导演和视觉提示词工程师/);
    assert.match(prompt, /一张不规则分镜漫画页/);
    assert.match(prompt, /3–4 个不规则分镜/);
    assert.match(prompt, /保持画面克制，不要色情化/);
    assert.match(prompt, /第一格：/);
    assert.match(prompt, /第二格：/);
    assert.match(prompt, /第三格：/);
    assert.match(prompt, /第四格：/);
    assert.match(prompt, /整体风格：/);
});

test('syncs existing author preset content from the latest defaults', () => {
    const settings = {
        selectedPromptPresetId: 'author-cinematic-realistic',
        promptPresets: [
            {
                id: 'author-cinematic-realistic',
                name: 'NSFW特化',
                prompt: '旧作者提示词',
                isAuthor: true,
            },
        ],
    };

    normalizePromptPresets(settings);

    assert.equal(settings.promptPresets[0].prompt, DEFAULT_PROMPT_PRESETS[1].prompt);
    assert.equal(settings.presetPrompt, DEFAULT_PROMPT_PRESETS[1].prompt);
});

test('adds newly bundled author presets to existing user settings', () => {
    const settings = {
        selectedPromptPresetId: 'custom',
        promptPresets: [
            { id: 'custom', name: '我的预设', prompt: 'custom prompt', isUser: true },
            { id: DEFAULT_PROMPT_PRESETS[0].id, name: DEFAULT_PROMPT_PRESETS[0].name, prompt: DEFAULT_PROMPT_PRESETS[0].prompt, isAuthor: true },
        ],
    };

    normalizePromptPresets(settings);

    assert.ok(settings.promptPresets.some(preset => preset.id === 'author-novelai-standard-tags'));
    assert.equal(getSelectedPromptPreset(settings).id, 'custom');
    assert.equal(settings.presetPrompt, 'custom prompt');
});

test('normalizes missing prompt presets from author defaults', () => {
    const settings = {};

    normalizePromptPresets(settings);

    assert.equal(settings.promptPresets.length, DEFAULT_PROMPT_PRESETS.length);
    assert.equal(settings.selectedPromptPresetId, DEFAULT_PROMPT_PRESETS[0].id);
    assert.equal(settings.presetPrompt, DEFAULT_PROMPT_PRESETS[0].prompt);
});

test('migrates a legacy presetPrompt into the selected preset content', () => {
    const settings = {
        presetPrompt: '用户旧提示词',
    };

    normalizePromptPresets(settings);

    assert.equal(settings.promptPresets[0].prompt, '用户旧提示词');
    assert.equal(settings.presetPrompt, '用户旧提示词');
});

test('returns the selected prompt preset', () => {
    const settings = {
        selectedPromptPresetId: 'custom',
        promptPresets: [
            { id: 'default', name: '默认', prompt: 'default prompt' },
            { id: 'custom', name: '自定义', prompt: 'custom prompt' },
        ],
    };

    assert.deepEqual(getSelectedPromptPreset(settings), settings.promptPresets[1]);
});

test('creates a user prompt preset with a stable shape', () => {
    const preset = createPromptPreset({
        name: '我的提示词',
        prompt: 'custom prompt',
        createId: () => 'custom-id',
    });

    assert.deepEqual(preset, {
        id: 'custom-id',
        name: '我的提示词',
        prompt: 'custom prompt',
        isUser: true,
    });
});

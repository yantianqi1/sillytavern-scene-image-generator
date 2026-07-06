import test from 'node:test';
import assert from 'node:assert/strict';

import {
    applyNovelAIStylePrompt,
    createNovelAIStylePreset,
    DEFAULT_NOVELAI_STYLE_PRESETS,
    getNovelAIStyleNegativePrompt,
    getSelectedNovelAIStylePreset,
    normalizeNovelAIStylePresets,
} from '../src/novelai-style-presets.js';

test('provides multiple default NovelAI style prompt presets', () => {
    assert.ok(DEFAULT_NOVELAI_STYLE_PRESETS.length >= 3);
    assert.ok(DEFAULT_NOVELAI_STYLE_PRESETS.every(preset => preset.id && preset.name));
    assert.ok(DEFAULT_NOVELAI_STYLE_PRESETS.some(preset => preset.prompt.includes('masterpiece')));
    assert.ok(DEFAULT_NOVELAI_STYLE_PRESETS.every(preset => typeof preset.negativePrompt === 'string'));
});

test('bundles the current NovelAI style presets for new users', () => {
    assert.deepEqual(
        DEFAULT_NOVELAI_STYLE_PRESETS.map(preset => preset.name),
        ['通用增强', '二次元精修', '电影光影', '油腻画风', '3D风格', '武侠水墨风', '浮世绘', '精美', '3D 风格2'],
    );

    for (const name of ['武侠水墨风', '浮世绘', '精美', '3D 风格2']) {
        const preset = DEFAULT_NOVELAI_STYLE_PRESETS.find(item => item.name === name);
        assert.ok(preset?.isAuthor);
        assert.ok(preset.prompt.length > 20);
        assert.ok(preset.negativePrompt.length > 20);
    }
});

test('includes the oily NovelAI style preset bundled by the author', () => {
    const preset = DEFAULT_NOVELAI_STYLE_PRESETS.find(item => item.id === 'author-novelai-style-oily');

    assert.equal(preset?.name, '油腻画风');
    assert.ok(preset.prompt.includes('0.7::sora 72-iro::'));
    assert.ok(preset.prompt.includes('5::masterpiece'));
    assert.ok(preset.prompt.includes('-3::multiple views'));
    assert.ok(preset.prompt.includes('year 2025'));
});

test('uses the requested universal enhanced NovelAI style prompt', () => {
    const preset = DEFAULT_NOVELAI_STYLE_PRESETS.find(item => item.id === 'author-novelai-style-quality');

    assert.equal(preset?.name, '通用增强');
    assert.equal(
        preset?.prompt,
        '1.45::minaba_hideo ::, 0.6::ogipote ::, 0.75::casino_(casinoep)  ::, 0.7::houkisei ::, 0.7::haku89 ::, 0.7::asteroid_ill ::, 1.05::maccha (mochancc) ::, 1.25::betabeet ::, 1.15::akipeko ::, {{{masterpiece}}},{{{best quality}}}, {official art, official style, year2025}, wallpaper, highres, absurdres, very aesthetic, amazing quality, amazing extremely detailed 8k, newest, no text,',
    );
});

test('includes the bundled 3D NovelAI style prompt exactly as requested', () => {
    const preset = DEFAULT_NOVELAI_STYLE_PRESETS.find(item => item.id === 'author-novelai-style-3d');

    assert.equal(preset?.name, '3D风格');
    assert.equal(
        preset?.prompt,
        `best quality, masterpiece, realistic,
2.00::3D ::,
1.20::Artist:jagercoke ::,
1.40::Artist:yinse_qi_ji ::,
1.50::Artist:nixeu ::,
0.50::Artist:ria_(baka-neearts) ::,
1.40::artist：seven_(sixplusone) ::,
very aesthetic, masterpiece, no text,photorealistic, hyperrealistic, realistic skin texture, skin pores,
volumetric lighting, soft shadows,
detailed eyes with reflections, eyelash details,
8k,sharp focus, depth of field`,
    );
});

test('normalizes NovelAI style presets and selects the default author style', () => {
    const settings = {};

    normalizeNovelAIStylePresets(settings);

    assert.equal(settings.novelAIStylePresets.length, DEFAULT_NOVELAI_STYLE_PRESETS.length);
    assert.equal(settings.selectedNovelAIStylePresetId, DEFAULT_NOVELAI_STYLE_PRESETS[0].id);
});

test('keeps user NovelAI style presets while syncing author presets', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'custom',
        novelAIStylePresets: [
            { id: DEFAULT_NOVELAI_STYLE_PRESETS[0].id, name: '旧名称', prompt: 'old', isAuthor: true },
            { id: 'custom', name: '我的风格', prompt: 'custom style', isUser: true },
        ],
    };

    normalizeNovelAIStylePresets(settings);

    assert.equal(settings.novelAIStylePresets[0].prompt, DEFAULT_NOVELAI_STYLE_PRESETS[0].prompt);
    assert.equal(getSelectedNovelAIStylePreset(settings).prompt, 'custom style');
});

test('keeps customized bundled NovelAI style prompts while normalizing', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'author-novelai-style-oily',
        novelAIStylePresets: [
            {
                id: 'author-novelai-style-oily',
                name: '我的油腻画风',
                prompt: 'custom positive style',
                negativePrompt: 'custom negative style',
                isAuthor: true,
                isUser: true,
            },
        ],
    };

    normalizeNovelAIStylePresets(settings);

    const selected = getSelectedNovelAIStylePreset(settings);
    assert.equal(selected.name, '我的油腻画风');
    assert.equal(selected.prompt, 'custom positive style');
    assert.equal(selected.negativePrompt, 'custom negative style');
    assert.equal(selected.isUser, true);
    assert.equal(selected.isAuthor, undefined);
    assert.equal(
        settings.novelAIStylePresets.filter(preset => preset.id === 'author-novelai-style-oily').length,
        1,
    );
});

test('creates a user NovelAI style preset with a stable shape', () => {
    const preset = createNovelAIStylePreset({
        name: '厚涂风格',
        prompt: 'painterly style',
        createId: () => 'style-id',
    });

    assert.deepEqual(preset, {
        id: 'style-id',
        name: '厚涂风格',
        prompt: 'painterly style',
        negativePrompt: '',
        isUser: true,
    });
});

test('prepends the selected NovelAI style prompt to the generated prompt', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'custom',
        novelAIStylePresets: [
            { id: 'custom', name: '我的风格', prompt: 'masterpiece, cinematic lighting', isUser: true },
        ],
    };

    assert.equal(
        applyNovelAIStylePrompt('adult woman standing by a window', settings),
        'masterpiece, cinematic lighting\nadult woman standing by a window',
    );
});

test('does not change the prompt when the selected NovelAI style prompt is empty', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'none',
        novelAIStylePresets: [
            { id: 'none', name: '无风格', prompt: '', isUser: true },
        ],
    };

    assert.equal(applyNovelAIStylePrompt('scene prompt', settings), 'scene prompt');
});

test('returns the selected NovelAI style negative prompt', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'custom',
        novelAIStylePresets: [
            { id: 'custom', name: '我的风格', prompt: 'style', negativePrompt: 'lowres, bad hands', isUser: true },
        ],
    };

    assert.equal(getNovelAIStyleNegativePrompt(settings), 'lowres, bad hands');
});

test('normalizes legacy NovelAI style presets with a negative prompt field', () => {
    const settings = {
        selectedNovelAIStylePresetId: 'legacy',
        novelAIStylePresets: [
            { id: 'legacy', name: '旧风格', prompt: 'style' },
        ],
    };

    normalizeNovelAIStylePresets(settings);

    assert.equal(settings.novelAIStylePresets[0].negativePrompt, '');
});

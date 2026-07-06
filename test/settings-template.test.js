import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('does not show profile add save delete buttons in the image API tab', () => {
    const html = readFileSync(new URL('../settings.html', import.meta.url), 'utf8');

    assert.doesNotMatch(html, /sig_add_profile/);
    assert.doesNotMatch(html, /sig_save_profile/);
    assert.doesNotMatch(html, /sig_delete_profile/);
});

test('provides a real select control for choosing fetched NovelAI models', () => {
    const html = readFileSync(new URL('../settings.html', import.meta.url), 'utf8');

    assert.match(html, /<select id="sig_image_model_select"/);
});

test('binds NovelAI positive and negative prompts to style presets instead of params', () => {
    const html = readFileSync(new URL('../settings.html', import.meta.url), 'utf8');

    assert.match(html, /id="sig_novelai_style_prompt"/);
    assert.match(html, /id="sig_novelai_style_negative_prompt"/);
    assert.match(html, /正面风格提示词/);
    assert.match(html, /负面提示词/);
    assert.doesNotMatch(html, /<label>\s*反向提示词\s*<textarea id="sig_negative_prompt"/);
});

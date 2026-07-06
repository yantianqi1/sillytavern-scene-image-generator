import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createQuickButton,
    QUICK_BUTTON_ID,
    QUICK_IMAGE_ONLY_BUTTON_ID,
    QUICK_PROMPT_BUTTON_ID,
    findQuickButtonMount,
    getQuickButtonProgressLabel,
    setQuickImageOnlyButtonVisible,
    setQuickPromptButtonVisible,
} from '../src/quick-button.js';

function createFakeDocument(selectors) {
    return {
        querySelector(selector) {
            return selectors[selector] || null;
        },
    };
}

test('uses right send form as the preferred quick button mount', () => {
    const right = { id: 'rightSendForm' };
    const left = { id: 'leftSendForm' };
    const send = { id: 'send_form' };

    const mount = findQuickButtonMount(createFakeDocument({
        '#rightSendForm': right,
        '#leftSendForm': left,
        '#send_form': send,
    }));

    assert.equal(mount, right);
});

test('falls back to the main send form when side holders are missing', () => {
    const send = { id: 'send_form' };

    const mount = findQuickButtonMount(createFakeDocument({
        '#send_form': send,
    }));

    assert.equal(mount, send);
});

test('quick button id is stable for duplicate prevention', () => {
    assert.equal(QUICK_BUTTON_ID, 'sig_quick_generate');
});

test('quick prompt button id is stable for duplicate prevention', () => {
    assert.equal(QUICK_PROMPT_BUTTON_ID, 'sig_quick_prompt');
});

test('quick image-only button id is stable for duplicate prevention', () => {
    assert.equal(QUICK_IMAGE_ONLY_BUTTON_ID, 'sig_quick_image_only');
});

test('maps generation phases to compact progress labels', () => {
    assert.equal(getQuickButtonProgressLabel('prompt'), '生成提示词中');
    assert.equal(getQuickButtonProgressLabel('image'), '生成图片中');
    assert.equal(getQuickButtonProgressLabel(null), '');
});

test('quick button includes a hidden prompt capsule', () => {
    const button = createQuickButton({
        createElement(tagName) {
            return {
                tagName,
                id: '',
                title: '',
                innerHTML: '',
                classList: { add() {} },
                setAttribute() {},
            };
        },
    });

    assert.match(button.innerHTML, new RegExp(`id="${QUICK_PROMPT_BUTTON_ID}"`));
    assert.match(button.innerHTML, />\s*提示词\s*</);
    assert.match(button.innerHTML, new RegExp(`id="${QUICK_IMAGE_ONLY_BUTTON_ID}"`));
    assert.match(button.innerHTML, />\s*仅生图\s*</);
    assert.match(button.innerHTML, /displayNone/);
});

test('can show and hide the quick prompt button', () => {
    const state = { hidden: true };
    const button = {
        querySelector(selector) {
            if (selector !== `#${QUICK_PROMPT_BUTTON_ID}`) return null;
            return {
                classList: {
                    toggle(className, shouldAdd) {
                        if (className === 'displayNone') state.hidden = shouldAdd;
                    },
                },
                setAttribute(name, value) {
                    if (name === 'aria-hidden') state.ariaHidden = value;
                },
            };
        },
    };

    setQuickPromptButtonVisible(button, true);
    assert.equal(state.hidden, false);
    assert.equal(state.ariaHidden, 'false');

    setQuickPromptButtonVisible(button, false);
    assert.equal(state.hidden, true);
    assert.equal(state.ariaHidden, 'true');
});

test('can show and hide the quick image-only button', () => {
    const state = { hidden: true };
    const button = {
        querySelector(selector) {
            if (selector !== `#${QUICK_IMAGE_ONLY_BUTTON_ID}`) return null;
            return {
                classList: {
                    toggle(className, shouldAdd) {
                        if (className === 'displayNone') state.hidden = shouldAdd;
                    },
                },
                setAttribute(name, value) {
                    if (name === 'aria-hidden') state.ariaHidden = value;
                },
            };
        },
    };

    setQuickImageOnlyButtonVisible(button, true);
    assert.equal(state.hidden, false);
    assert.equal(state.ariaHidden, 'false');

    setQuickImageOnlyButtonVisible(button, false);
    assert.equal(state.hidden, true);
    assert.equal(state.ariaHidden, 'true');
});

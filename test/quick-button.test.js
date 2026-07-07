import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createQuickButton,
    createQuickImageOnlyButton,
    createQuickPromptButton,
    mountQuickButton,
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

function createFakeElement(tagName) {
    return {
        tagName,
        id: '',
        title: '',
        innerHTML: '',
        textContent: '',
        parentElement: null,
        attributes: {},
        classList: {
            classes: [],
            add(...classNames) {
                this.classes.push(...classNames);
            },
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    };
}

test('quick action buttons are separate input controls', () => {
    const button = createQuickButton({
        createElement: createFakeElement,
    });
    const promptButton = createQuickPromptButton({
        createElement: createFakeElement,
    });
    const imageOnlyButton = createQuickImageOnlyButton({
        createElement: createFakeElement,
    });

    assert.equal(button.id, QUICK_BUTTON_ID);
    assert.doesNotMatch(button.innerHTML, new RegExp(QUICK_PROMPT_BUTTON_ID));
    assert.equal(promptButton.id, QUICK_PROMPT_BUTTON_ID);
    assert.equal(promptButton.textContent, '提示词');
    assert.equal(promptButton.attributes['aria-hidden'], 'true');
    assert.equal(imageOnlyButton.id, QUICK_IMAGE_ONLY_BUTTON_ID);
    assert.equal(imageOnlyButton.textContent, '仅生图');
    assert.equal(imageOnlyButton.attributes['aria-hidden'], 'true');
});

test('mounts prompt and image-only buttons beside the generate button before send', () => {
    const children = [];
    const right = {
        id: 'rightSendForm',
        append(element) {
            children.push(element);
            element.parentElement = right;
        },
        insertBefore(element, reference) {
            const index = children.indexOf(reference);
            children.splice(index, 0, element);
            element.parentElement = right;
        },
    };
    const sendButton = { id: 'send_but', parentElement: right };
    children.push(sendButton);

    const root = {
        querySelector(selector) {
            if (selector === `#${QUICK_BUTTON_ID}`) return null;
            if (selector === '#rightSendForm') return right;
            if (selector === '#send_but') return sendButton;
            return null;
        },
        createElement(tagName) {
            return createFakeElement(tagName);
        },
    };

    mountQuickButton(root);

    assert.deepEqual(children.map(child => child.id), [
        QUICK_PROMPT_BUTTON_ID,
        QUICK_IMAGE_ONLY_BUTTON_ID,
        QUICK_BUTTON_ID,
        'send_but',
    ]);
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

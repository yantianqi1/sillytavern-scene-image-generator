import test from 'node:test';
import assert from 'node:assert/strict';

import {
    appendImageMarkdownToMessage,
    buildImageMarkdown,
    findLastAssistantMessageIndex,
} from '../src/chat-markdown.js';

test('builds a markdown image line for generated scene images', () => {
    assert.equal(
        buildImageMarkdown('https://example.com/image.png'),
        '![剧情生图](https://example.com/image.png)',
    );
});

test('finds the latest assistant message as the insertion target', () => {
    const chat = [
        { mes: 'system', is_system: true },
        { mes: 'user', is_user: true },
        { mes: 'assistant 1' },
        { mes: 'assistant 2' },
    ];

    assert.equal(findLastAssistantMessageIndex(chat), 3);
});

test('falls back to the latest non-system message when no assistant message exists', () => {
    const chat = [
        { mes: 'system', is_system: true },
        { mes: 'user only', is_user: true },
    ];

    assert.equal(findLastAssistantMessageIndex(chat), 1);
});

test('appends generated image markdown to the end of a message once', () => {
    const message = { mes: '当前剧情内容\n' };

    appendImageMarkdownToMessage(message, 'https://example.com/image.png');
    appendImageMarkdownToMessage(message, 'https://example.com/image.png');

    assert.equal(
        message.mes,
        '当前剧情内容\n\n![剧情生图](https://example.com/image.png)',
    );
});

test('replaces previous generated scene image markdown with the new image', () => {
    const message = {
        mes: '当前剧情内容\n\n![剧情生图](https://example.com/old.png)',
    };

    appendImageMarkdownToMessage(message, 'https://example.com/new.png');

    assert.equal(
        message.mes,
        '当前剧情内容\n\n![剧情生图](https://example.com/new.png)',
    );
});

test('does not remove other markdown images when replacing generated scene images', () => {
    const message = {
        mes: [
            '当前剧情内容',
            '',
            '![参考图](https://example.com/reference.png)',
            '',
            '![剧情生图](https://example.com/old-1.png)',
            '',
            '![剧情生图](https://example.com/old-2.png)',
        ].join('\n'),
    };

    appendImageMarkdownToMessage(message, 'https://example.com/new.png');

    assert.equal(
        message.mes,
        [
            '当前剧情内容',
            '',
            '![参考图](https://example.com/reference.png)',
            '',
            '![剧情生图](https://example.com/new.png)',
        ].join('\n'),
    );
});

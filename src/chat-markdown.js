export function buildImageMarkdown(imageUrl) {
    if (!imageUrl) {
        throw new Error('缺少图片地址，无法插入聊天。');
    }

    return `![剧情生图](${imageUrl})`;
}

export function removeGeneratedImageMarkdown(text) {
    return text
        .split('\n')
        .filter(line => !/^!\[剧情生图\]\(.+\)$/.test(line.trim()))
        .join('\n')
        .trimEnd();
}

function isInsertableMessage(message) {
    return Boolean(message)
        && !message.is_system
        && typeof message.mes === 'string';
}

export function findLastAssistantMessageIndex(chat) {
    if (!Array.isArray(chat)) {
        return -1;
    }

    for (let index = chat.length - 1; index >= 0; index -= 1) {
        const message = chat[index];
        if (isInsertableMessage(message) && !message.is_user) {
            return index;
        }
    }

    for (let index = chat.length - 1; index >= 0; index -= 1) {
        if (isInsertableMessage(chat[index])) {
            return index;
        }
    }

    return -1;
}

export function appendImageMarkdownToMessage(message, imageUrl) {
    if (!isInsertableMessage(message)) {
        throw new Error('找不到可插入图片的聊天消息。');
    }

    const markdown = buildImageMarkdown(imageUrl);
    const nextMessage = `${removeGeneratedImageMarkdown(message.mes)}\n\n${markdown}`;
    if (message.mes === nextMessage) {
        return false;
    }

    message.mes = nextMessage;
    return true;
}

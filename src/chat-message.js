import {
    chat,
    chatElement,
    eventSource,
    event_types,
    reloadCurrentChat,
    saveChatConditional,
    updateMessageElement,
} from '../../../../../script.js';

import { appendImageMarkdownToMessage, findLastAssistantMessageIndex } from './chat-markdown.js';

export async function appendGeneratedImageToLatestMessage(imageUrl) {
    const messageId = findLastAssistantMessageIndex(chat);
    if (messageId < 0) {
        throw new Error('找不到可插入图片的聊天消息。');
    }

    const message = chat[messageId];
    appendImageMarkdownToMessage(message, imageUrl);

    await eventSource.emit(event_types.MESSAGE_EDITED, messageId);

    const existingMessage = chatElement.find(`.mes[mesid="${messageId}"]`);
    if (existingMessage.length) {
        const newMessageElement = updateMessageElement(message, { messageId });
        existingMessage.after(newMessageElement);
        existingMessage.remove();
    } else {
        await reloadCurrentChat();
    }

    await eventSource.emit(event_types.MESSAGE_UPDATED, messageId);
    await saveChatConditional();
}

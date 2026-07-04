import { generateOpenAICompatibleImage } from './openai-compatible.js';

const providers = {
    'openai-compatible': generateOpenAICompatibleImage,
};

export async function generateImage(prompt, profile) {
    const provider = providers[profile.provider];
    if (!provider) {
        throw new Error(`不支持的生图服务类型：${profile.provider}`);
    }

    return provider(prompt, profile);
}

const PROFILE_NAMES = Object.freeze({
    'openai-compatible': 'OpenAI 兼容生图',
    'novelai-newapi': 'NovelAI NewAPI 生图',
});

export function getProfileNameForProvider(provider) {
    return PROFILE_NAMES[provider] || '生图 API';
}


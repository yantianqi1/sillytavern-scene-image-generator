export async function resolveSceneGenerationPrompt({
    reusePrompt = false,
    lastPrompt = '',
    lastBasePrompt = '',
    sceneText = '',
    settings,
    profile,
    rewritePromptFn,
    applyNovelAIStylePromptFn = prompt => prompt,
} = {}) {
    if (reusePrompt) {
        const basePrompt = String(lastBasePrompt || lastPrompt || '').trim();
        if (!basePrompt) {
            throw new Error('当前还没有可复用的提示词，请先生成一次提示词。');
        }

        const prompt = profile?.provider === 'novelai-newapi'
            ? applyNovelAIStylePromptFn(basePrompt, settings)
            : basePrompt;

        return { prompt, basePrompt, reusedPrompt: true };
    }

    const basePrompt = await rewritePromptFn(sceneText, settings);
    const prompt = profile?.provider === 'novelai-newapi'
        ? applyNovelAIStylePromptFn(basePrompt, settings)
        : basePrompt;

    return { prompt, basePrompt, reusedPrompt: false };
}

export function resolveSceneGenerationProfile({
    profile,
    settings,
    getNovelAIStyleNegativePromptFn = () => '',
} = {}) {
    if (profile?.provider !== 'novelai-newapi') {
        return profile;
    }

    return {
        ...profile,
        negativePrompt: getNovelAIStyleNegativePromptFn(settings),
    };
}

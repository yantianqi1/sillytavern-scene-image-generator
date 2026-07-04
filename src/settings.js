import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';

export const MODULE_NAME = 'sceneImageGenerator';

const OLD_DEFAULT_REWRITE_PROMPT = `You are an art director for story-driven image generation.
Read the current roleplay scene and produce one image prompt.
Focus on visible subjects, location, lighting, mood, composition, clothing, expression, action, and cinematic detail.
Avoid dialogue, meta commentary, spoilers, UI text, and unsupported facts.
Return only the final image prompt.`;

export const DEFAULT_REWRITE_PROMPT = `你是负责剧情生图的视觉导演。
请阅读当前角色扮演剧情，将场景整理成一个适合生图模型使用的提示词。
重点描述可见主体、地点、光线、氛围、构图、服装、表情、动作和镜头感。
不要输出对话、解释、元信息、剧透、界面文字或剧情中没有出现的事实。
只返回最终生图提示词，不要添加其他说明。`;

export const DEFAULT_SETTINGS = Object.freeze({
    selectedProfileId: '',
    contextTurns: 4,
    presetPrompt: DEFAULT_REWRITE_PROMPT,
    rewrite: {
        mode: 'current',
        apiUrl: '',
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.4,
    },
    profiles: [
        {
            id: 'default-openai-compatible',
            name: 'OpenAI 兼容生图',
            provider: 'openai-compatible',
            apiUrl: '',
            apiKey: '',
            model: 'gpt-image-1',
            size: '1024x1024',
            responseFormat: 'b64_json',
            extraParams: '{}',
        },
    ],
    lastPrompt: '',
    lastImageUrl: '',
});

export function getSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
    }

    const settings = extension_settings[MODULE_NAME];
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[key] === undefined) {
            settings[key] = structuredClone(value);
        }
    }

    if (!settings.rewrite) {
        settings.rewrite = structuredClone(DEFAULT_SETTINGS.rewrite);
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS.rewrite)) {
        if (settings.rewrite[key] === undefined) {
            settings.rewrite[key] = structuredClone(value);
        }
    }

    if (!Array.isArray(settings.profiles)) {
        settings.profiles = structuredClone(DEFAULT_SETTINGS.profiles);
    }

    if (!settings.selectedProfileId && settings.profiles.length > 0) {
        settings.selectedProfileId = settings.profiles[0].id;
    }

    if (settings.presetPrompt === OLD_DEFAULT_REWRITE_PROMPT) {
        settings.presetPrompt = DEFAULT_REWRITE_PROMPT;
    }

    for (const profile of settings.profiles) {
        if (profile.name === 'OpenAI Compatible') {
            profile.name = 'OpenAI 兼容生图';
        }
        if (profile.name === 'New Image API') {
            profile.name = '新的生图 API';
        }
    }

    return settings;
}

export function saveSettings() {
    saveSettingsDebounced();
}

export function createProfile() {
    return {
        id: crypto.randomUUID(),
        name: '新的生图 API',
        provider: 'openai-compatible',
        apiUrl: '',
        apiKey: '',
        model: 'gpt-image-1',
        size: '1024x1024',
        responseFormat: 'b64_json',
        extraParams: '{}',
    };
}

export function getSelectedProfile() {
    const settings = getSettings();
    return settings.profiles.find(profile => profile.id === settings.selectedProfileId) || settings.profiles[0] || null;
}

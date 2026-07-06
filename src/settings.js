import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import {
    DEFAULT_PROMPT_PRESETS,
    DEFAULT_REWRITE_PROMPT,
    createPromptPreset as createPromptPresetData,
    getSelectedPromptPreset as getSelectedPromptPresetData,
    normalizePromptPresets,
} from './prompt-presets.js';
import {
    DEFAULT_NOVELAI_STYLE_PRESETS,
    createNovelAIStylePreset as createNovelAIStylePresetData,
    getSelectedNovelAIStylePreset as getSelectedNovelAIStylePresetData,
    normalizeNovelAIStylePresets,
} from './novelai-style-presets.js';
import { getProfileNameForProvider } from './profile-names.js';

export const MODULE_NAME = 'sceneImageGenerator';

const OLD_DEFAULT_REWRITE_PROMPT = `You are an art director for story-driven image generation.
Read the current roleplay scene and produce one image prompt.
Focus on visible subjects, location, lighting, mood, composition, clothing, expression, action, and cinematic detail.
Avoid dialogue, meta commentary, spoilers, UI text, and unsupported facts.
Return only the final image prompt.`;

export { DEFAULT_REWRITE_PROMPT };

export const DEFAULT_SETTINGS = Object.freeze({
    selectedProfileId: '',
    contextTurns: 4,
    imageRetryCount: 0,
    presetPrompt: DEFAULT_REWRITE_PROMPT,
    selectedPromptPresetId: DEFAULT_PROMPT_PRESETS[0].id,
    promptPresets: structuredClone(DEFAULT_PROMPT_PRESETS),
    selectedNovelAIStylePresetId: DEFAULT_NOVELAI_STYLE_PRESETS[0].id,
    novelAIStylePresets: structuredClone(DEFAULT_NOVELAI_STYLE_PRESETS),
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
            negativePrompt: '',
            steps: 28,
            scale: 5,
            sampler: 'k_euler_ancestral',
            seed: '',
            novelaiParams: '{"qualityToggle":true,"ucPreset":0}',
        },
    ],
    lastPrompt: '',
    lastBasePrompt: '',
    lastImageUrl: '',
    gallery: [],
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

    if (!Array.isArray(settings.gallery)) {
        settings.gallery = [];
    }

    if (settings.presetPrompt === OLD_DEFAULT_REWRITE_PROMPT) {
        settings.presetPrompt = DEFAULT_REWRITE_PROMPT;
    }

    normalizePromptPresets(settings);
    normalizeNovelAIStylePresets(settings);

    if (!settings.selectedProfileId && settings.profiles.length > 0) {
        settings.selectedProfileId = settings.profiles[0].id;
    }

    for (const profile of settings.profiles) {
        if (profile.name === 'OpenAI Compatible') {
            profile.name = 'OpenAI 兼容生图';
        }
        if (profile.name === 'New Image API') {
            profile.name = '新的生图 API';
        }
        if (!profile.name || profile.name === '生图 API' || profile.name === '新的生图 API') {
            profile.name = getProfileNameForProvider(profile.provider);
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
        name: getProfileNameForProvider('openai-compatible'),
        provider: 'openai-compatible',
        apiUrl: '',
        apiKey: '',
        model: 'gpt-image-1',
        size: '1024x1024',
        responseFormat: 'b64_json',
        extraParams: '{}',
        negativePrompt: '',
        steps: 28,
        scale: 5,
        sampler: 'k_euler_ancestral',
        seed: '',
        novelaiParams: '{"qualityToggle":true,"ucPreset":0}',
    };
}

export function getSelectedProfile() {
    const settings = getSettings();
    return settings.profiles.find(profile => profile.id === settings.selectedProfileId) || settings.profiles[0] || null;
}

export function createPromptPreset() {
    return createPromptPresetData();
}

export function getSelectedPromptPreset() {
    return getSelectedPromptPresetData(getSettings());
}

export function createNovelAIStylePreset() {
    return createNovelAIStylePresetData();
}

export function getSelectedNovelAIStylePreset() {
    return getSelectedNovelAIStylePresetData(getSettings());
}

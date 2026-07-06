export const DEFAULT_NOVELAI_NEGATIVE_PROMPT = 'lowres, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, logo, worst quality, bad quality';

export const DEFAULT_NOVELAI_STYLE_PRESETS = Object.freeze([
    Object.freeze({
        id: 'author-novelai-style-quality',
        name: '通用增强',
        prompt: '1.45::minaba_hideo ::, 0.6::ogipote ::, 0.75::casino_(casinoep)  ::, 0.7::houkisei ::, 0.7::haku89 ::, 0.7::asteroid_ill ::, 1.05::maccha (mochancc) ::, 1.25::betabeet ::, 1.15::akipeko ::, {{{masterpiece}}},{{{best quality}}}, {official art, official style, year2025}, wallpaper, highres, absurdres, very aesthetic, amazing quality, amazing extremely detailed 8k, newest, no text,',
        negativePrompt: 'low quality, worst quality, anime, cartoon,painting, drawing, oversaturated, deformed hands, extra fingers, mutated hands, unnatural lighting, unrealistic eyes, plastic skin, doll-like, symmetry, blurry background, poorly drawn face, text, watermark, abstract background, low resolution',
        isAuthor: true,
    }),
    Object.freeze({
        id: 'author-novelai-style-anime',
        name: '二次元精修',
        prompt: `masterpiece, best quality,year2025,anime style, official art style,
1.55::artist:nobusawa_osamu ::,
1.35::artist:tedain ::,
0.95::artist:asou_(asabu202) ::,
1.05::Artist:kcccc ::,
1.05::Artist:nixeu ::,
0.75::Artist:rella ::,
desaturated, muted colors, pastel palette, soft lighting,
low contrast, gentle shading, matte background,
overcast sky, natural lighting, cinematic atmosphere,
soft focus, delicate details, ambient occlusion,no text`,
        negativePrompt: `worst quality,low quality,vibrant colors, neon, saturated, high contrast,
vivid, colorful, pop art, fluorescent,
hard lighting, harsh shadows, glare, bloom,
photorealistic, 3D render, realistic,lowres,signature,username,bad id,bad twitter id,english commentary,logo,bad hands,mutated hands,mammal,anthro,furry,text`,
        isAuthor: true,
    }),
    Object.freeze({
        id: 'author-novelai-style-cinematic',
        name: '电影光影',
        prompt: 'masterpiece, best quality, cinematic lighting, dramatic shadows, depth of field, atmospheric composition, rich texture detail',
        negativePrompt: DEFAULT_NOVELAI_NEGATIVE_PROMPT,
        isAuthor: true,
    }),
    Object.freeze({
        id: 'author-novelai-style-oily',
        name: '油腻画风',
        prompt: '0.7::sora 72-iro::, 0.8::shinjiro, yuyu (yuyuworks), b.sa (bbbs)::, 0.9::momo no sukebe, choujiroo::, dk.senie, blue gk, 1.2::rourou (been), lunch (shin new)::, 1.3::katsura harufumi, poper (arin sel)::, 5::masterpiece, best quality, amazing quality, very aesthetic, absurdres::, 2.8::detailed skin, realistic rendering, detailed textures, intricate details, skindentation, depth of field, curvy, body blush, smell, steaming body::, -3::multiple views, upscaled, blurry, watermark::, -4::artist collaboration::, year 2025, newest, 2.5::super fine illustration, ideal ratio body proportions, realistic material rendering, fine fabric emphasis::,',
        negativePrompt: `-3::multiple views, upscaled, blurry, watermark::
-4::artist collaboration::`,
        isAuthor: true,
    }),
    Object.freeze({
        id: 'author-novelai-style-3d',
        name: '3D风格',
        prompt: `best quality, masterpiece, realistic,
2.00::3D ::,
1.20::Artist:jagercoke ::,
1.40::Artist:yinse_qi_ji ::,
1.50::Artist:nixeu ::,
0.50::Artist:ria_(baka-neearts) ::,
1.40::artist：seven_(sixplusone) ::,
very aesthetic, masterpiece, no text,photorealistic, hyperrealistic, realistic skin texture, skin pores,
volumetric lighting, soft shadows,
detailed eyes with reflections, eyelash details,
8k,sharp focus, depth of field`,
        negativePrompt: DEFAULT_NOVELAI_NEGATIVE_PROMPT,
        isAuthor: true,
    }),
    Object.freeze({
        id: '83bc00de-68f6-4284-ba6c-e16154b7e182',
        name: '武侠水墨风',
        prompt: `masterpiece, ultra-detailed, 
2.0::ink_wash_painting ::,
1.5::greyscale ::,
1.5::spot color ::,
1.75::Artist:xuedaixun(ink_wash_painting) ::,
1.22::Artist:haban_(haban35)(ink_wash_painting) ::,
0.7::Artist:jagercoke ::,
0.7::Artist:kcccc ::,
inkblot,ink,ink (medium),
dynamic brushstroke texture, intentional blank space,
soft ink bleeding effect, wuxia atmosphere, traditional shan shui composition,no text`,
        negativePrompt: `low quality, cartoonish, modern clothing,
photorealistic details, vibrant colors,
crowded elements, English text, anime eyes,
mechanical parts, perfect symmetry, oversaturated,text`,
        isAuthor: true,
    }),
    Object.freeze({
        id: '4241c74f-4dd8-4f91-be5e-44c65a2f021b',
        name: '浮世绘',
        prompt: `2.0::Ukiyo-e ::,
1.5::Japanese woodblock print ::,
1.5::woodblock texture ::,
1.5::bijin-ga (beauty painting) ::,
1.5::Artist:Kitagawa Utamaro ::,
0.7::Artist:tedain ::,
Traditional Japanese art, flat colors, bold colors, strong outline, minimal shading, textured background,  intricate patterns, gold leaf accents, Edo period, muted colors, asymmetrical composition`,
        negativePrompt: `low quality, cartoonish, modern clothing,
photorealistic details, vibrant colors,
crowded elements, English text, anime eyes,
mechanical parts, perfect symmetry, oversaturated`,
        isAuthor: true,
    }),
    Object.freeze({
        id: '4dcd5580-9de2-4827-a79c-216aa39caf15',
        name: '精美',
        prompt: '4::masterpiece, best quality ::, 2::official art, year2025 ::, 1.55::artist:nobusawa_osamu ::, 1.55::artist:tedain ::, 0.65::artist:houkisei ::, -2::3D, chibi,realistic ::, no text',
        negativePrompt: 'low quality, worst quality, anime, cartoon,painting, drawing, oversaturated, deformed hands, extra fingers, mutated hands, unnatural lighting, unrealistic eyes, plastic skin, doll-like, symmetry, blurry background, poorly drawn face, text, watermark, abstract background, low resolution',
        isAuthor: true,
    }),
    Object.freeze({
        id: 'b15b35f4-bbde-44bb-b370-a3a11cf39a72',
        name: '3D 风格2',
        prompt: '5::masterpiece, best quality ::, 3.65::3D, realistic, photorealistic ::, 1.75::Artist:jagercoke ::,1.55::Artist:tangerine_(dudu) ::, 1.15::Artist:nixeu ::, 0.65::Artist:naohiro_ito ::,1.25::Artist:bm94199 ::,1.05::artist:seven_(sixplusone) ::,-5::2D ::, year2025,cinematic lighting,volumetric lighting, soft shadows,no text,',
        negativePrompt: DEFAULT_NOVELAI_NEGATIVE_PROMPT,
        isAuthor: true,
    }),
]);

function defaultCreateId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneDefaultStylePresets() {
    return DEFAULT_NOVELAI_STYLE_PRESETS.map(preset => ({ ...preset }));
}

export function createNovelAIStylePreset({
    name = '新的风格提示词',
    prompt = '',
    negativePrompt = '',
    createId = defaultCreateId,
} = {}) {
    return {
        id: createId(),
        name: String(name || '新的风格提示词'),
        prompt: String(prompt || ''),
        negativePrompt: String(negativePrompt || ''),
        isUser: true,
    };
}

export function normalizeNovelAIStylePresets(settings) {
    if (!Array.isArray(settings.novelAIStylePresets) || settings.novelAIStylePresets.length === 0) {
        settings.novelAIStylePresets = cloneDefaultStylePresets();
    }

    settings.novelAIStylePresets = settings.novelAIStylePresets
        .filter(preset => preset && preset.id && typeof preset.prompt === 'string')
        .map(preset => {
            const isUser = Boolean(preset.isUser);
            return {
                id: String(preset.id),
                name: String(preset.name || '未命名风格'),
                prompt: String(preset.prompt),
                negativePrompt: String(preset.negativePrompt || ''),
                ...(preset.isAuthor && !isUser ? { isAuthor: true } : {}),
                ...(isUser ? { isUser: true } : {}),
            };
        });

    for (const defaultPreset of DEFAULT_NOVELAI_STYLE_PRESETS) {
        const existing = settings.novelAIStylePresets.find(preset => preset.id === defaultPreset.id);
        if (existing?.isAuthor) {
            existing.name = defaultPreset.name;
            existing.prompt = defaultPreset.prompt;
            existing.negativePrompt = defaultPreset.negativePrompt;
            continue;
        }

        if (!existing) {
            settings.novelAIStylePresets.push({ ...defaultPreset });
        }
    }

    if (!settings.selectedNovelAIStylePresetId || !settings.novelAIStylePresets.some(preset => preset.id === settings.selectedNovelAIStylePresetId)) {
        settings.selectedNovelAIStylePresetId = settings.novelAIStylePresets[0]?.id || DEFAULT_NOVELAI_STYLE_PRESETS[0].id;
    }

    return settings.novelAIStylePresets;
}

export function getSelectedNovelAIStylePreset(settings) {
    if (!Array.isArray(settings.novelAIStylePresets)) {
        return null;
    }

    return settings.novelAIStylePresets.find(preset => preset.id === settings.selectedNovelAIStylePresetId) || settings.novelAIStylePresets[0] || null;
}

export function applyNovelAIStylePrompt(prompt, settings) {
    normalizeNovelAIStylePresets(settings);
    const stylePrompt = getSelectedNovelAIStylePreset(settings)?.prompt?.trim() || '';
    const imagePrompt = String(prompt || '').trim();

    if (!stylePrompt) {
        return imagePrompt;
    }

    if (!imagePrompt) {
        return stylePrompt;
    }

    return `${stylePrompt}\n${imagePrompt}`;
}

export function getNovelAIStyleNegativePrompt(settings) {
    normalizeNovelAIStylePresets(settings);
    return getSelectedNovelAIStylePreset(settings)?.negativePrompt?.trim() || '';
}

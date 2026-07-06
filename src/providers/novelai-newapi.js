const DEFAULT_NEGATIVE_PROMPT = 'lowres, bad anatomy, bad hands, extra fingers, missing fingers, text, watermark, logo, worst quality, bad quality';
export const NOVELAI_MODEL_PRESETS = Object.freeze([
    'nai-diffusion-4-5-full-1024x1024',
    'nai-diffusion-4-5-full-1832x1216',
    'nai-diffusion-4-5-full-11216x832',
]);

const DEFAULT_NOVELAI_PARAMS = Object.freeze({
    qualityToggle: true,
    ucPreset: 0,
});

function parseJsonObject(value, label) {
    if (!value?.trim()) {
        return {};
    }

    try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(`${label}必须是 JSON 对象。`);
        }
        return parsed;
    } catch (error) {
        throw new Error(`${label} JSON 无效：${error.message}`);
    }
}

export function parseNovelAIParams(value) {
    return parseJsonObject(value, 'NovelAI 参数');
}

export function parseExtraParams(value) {
    return parseJsonObject(value, '额外参数');
}

function normalizePositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function normalizeNovelAISteps(value) {
    const steps = Number(value);
    return steps === 20 || steps === 28 ? steps : 28;
}

function normalizeSeed(seed) {
    if (seed === undefined || seed === null || String(seed).trim() === '') {
        return undefined;
    }

    const number = Number(seed);
    return Number.isFinite(number) ? Math.trunc(number) : undefined;
}

export function getNovelAIModelSize(model) {
    const match = String(model || '').match(/(\d+x\d+)$/);
    return match?.[1] || '';
}

function validateNovelAIRequest(prompt, body) {
    if (!prompt?.trim()) {
        throw new Error('当前生图提示词为空。');
    }
    if (prompt.length > 5000) {
        throw new Error('提示词过长，请控制在 5000 字以内。');
    }
    if (!/^\d+x\d+$/.test(body.size)) {
        throw new Error('图片尺寸格式必须类似 832x1216。');
    }

    const [width, height] = body.size.split('x').map(Number);
    if (width <= 0 || height <= 0) {
        throw new Error('图片尺寸无效。');
    }
    if (body.steps !== 20 && body.steps !== 28) {
        throw new Error('NovelAI steps 只能选择 20 或 28。');
    }
    if (body.scale < 1 || body.scale > 12) {
        throw new Error('NovelAI scale 建议在 1-12 之间。');
    }
}

function extractImageUrl(data) {
    const first = data?.data?.[0];
    if (!first) {
        return '';
    }

    if (first.b64_json) {
        return `data:image/png;base64,${first.b64_json}`;
    }

    return first.url || '';
}

function getModelListUrlCandidates(apiUrl) {
    const baseUrl = apiUrl?.trim()?.replace(/\/$/, '');
    if (!baseUrl) {
        throw new Error('请填写 NewAPI Base URL。');
    }

    if (/\/models$/.test(baseUrl)) {
        return [baseUrl];
    }

    if (/\/v1$/.test(baseUrl)) {
        return [`${baseUrl}/models`];
    }

    return [`${baseUrl}/models`, `${baseUrl}/v1/models`];
}

function extractModelIds(data) {
    const source = Array.isArray(data) ? data : data?.data || data?.models || [];
    const seen = new Set();
    const models = [];

    for (const item of source) {
        const id = typeof item === 'string' ? item : item?.id;
        if (!id || seen.has(id)) {
            continue;
        }

        seen.add(id);
        models.push(id);
    }

    return models;
}

export function buildNovelAIRequestBody(prompt, profile) {
    const model = profile.model || NOVELAI_MODEL_PRESETS[0];
    const novelai = {
        ...DEFAULT_NOVELAI_PARAMS,
        ...parseNovelAIParams(profile.novelaiParams),
    };
    const body = {
        model,
        prompt,
        negative_prompt: profile.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
        size: getNovelAIModelSize(model) || profile.size || '832x1216',
        n: 1,
        response_format: profile.responseFormat || 'b64_json',
        steps: normalizeNovelAISteps(profile.steps),
        scale: normalizePositiveNumber(profile.scale, 5),
        sampler: profile.sampler || 'k_euler_ancestral',
        novelai,
        ...parseExtraParams(profile.extraParams),
    };

    const seed = normalizeSeed(profile.seed);
    if (seed !== undefined) {
        body.seed = seed;
    }

    validateNovelAIRequest(prompt, body);
    return body;
}

async function parseErrorMessage(response) {
    const json = await response.json().catch(() => null);
    if (json?.error?.message) {
        return json.error.message;
    }

    return `NovelAI 生图请求失败：HTTP ${response.status}`;
}

export async function generateNovelAIImage(prompt, profile) {
    if (!profile.apiUrl) {
        throw new Error('请填写 NewAPI Base URL。');
    }
    if (!profile.apiKey) {
        throw new Error('请填写 NewAPI Key。');
    }
    if (!profile.model) {
        throw new Error('请填写 NovelAI 模型名。');
    }

    const response = await fetch(profile.apiUrl.replace(/\/$/, '') + '/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${profile.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildNovelAIRequestBody(prompt, profile)),
    });

    if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    const imageUrl = extractImageUrl(data);
    if (!imageUrl) {
        throw new Error('NewAPI NovelAI 没有返回图片 URL 或 base64 图片数据。');
    }

    return imageUrl;
}

export async function fetchNovelAIModels({ apiUrl, apiKey } = {}) {
    const headers = {};
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    let lastErrorMessage = '';
    for (const url of getModelListUrlCandidates(apiUrl)) {
        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            lastErrorMessage = await parseErrorMessage(response);
            continue;
        }

        const models = extractModelIds(await response.json());
        if (!models.length) {
            throw new Error('NewAPI 没有返回可用模型。');
        }

        return models;
    }

    throw new Error(lastErrorMessage || '拉取 NovelAI 模型列表失败。');
}

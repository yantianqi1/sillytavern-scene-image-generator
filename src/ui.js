import { appendGeneratedImageToLatestMessage } from './chat-message.js';
import { collectSceneContext, getLastSceneText } from './context.js';
import { callGenericPopup, POPUP_TYPE } from '../../../../../scripts/popup.js';
import {
    addGalleryItem,
    clearGallery,
    GALLERY_MAX_STORAGE_BYTES,
    getGalleryStorageBytes,
    removeGalleryItem,
    trimGalleryToStorageLimit,
} from './gallery.js';
import {
    resolveSceneGenerationProfile,
    resolveSceneGenerationPrompt,
} from './generation-prompt.js';
import {
    applyNovelAIStylePrompt,
    getNovelAIStyleNegativePrompt,
} from './novelai-style-presets.js';
import { rewritePrompt } from './prompt-rewriter.js';
import { getProfileNameForProvider } from './profile-names.js';
import { generateImage } from './providers/index.js';
import { fetchOpenAICompatibleModels } from './providers/openai-compatible.js';
import {
    QUICK_IMAGE_ONLY_BUTTON_ID,
    QUICK_PROMPT_BUTTON_ID,
    mountQuickButton,
    setQuickButtonBusy,
    setQuickImageOnlyButtonVisible,
    setQuickButtonProgress,
    setQuickPromptButtonVisible,
} from './quick-button.js';
import { normalizeRetryCount, runWithRetries } from './retry.js';
import {
    fetchNovelAIModels,
    getNovelAIModelSize,
    normalizeNovelAISteps,
    NOVELAI_MODEL_PRESETS,
} from './providers/novelai-newapi.js';
import {
    createNovelAIStylePreset,
    createPromptPreset,
    getSelectedNovelAIStylePreset,
    getSelectedProfile,
    getSelectedPromptPreset,
    getSettings,
    saveSettings,
} from './settings.js';

const TEMPLATE_URL = new URL('../settings.html', import.meta.url);
let initialized = false;
let generationInProgress = false;
let quickButton = null;
let lastQuickPrompt = '';
let lastQuickBasePrompt = '';

async function loadTemplate() {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
        throw new Error(`无法加载设置面板：HTTP ${response.status}`);
    }
    return response.text();
}

function setStatus(message, type = 'info') {
    const status = document.querySelector('#sig_status');
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
}

function getImageModelValue(provider = $('#sig_provider').val()?.toString() || 'openai-compatible') {
    const select = document.querySelector('#sig_image_model_select');
    const selectVisible = select && !select.classList.contains('displayNone') && select.dataset.provider === provider;
    if (selectVisible || provider === 'novelai-newapi') {
        return select?.value?.toString().trim()
            || $('#sig_image_model').val()?.toString().trim()
            || '';
    }

    return $('#sig_image_model').val()?.toString().trim() || '';
}

function getProfileFormData() {
    const provider = $('#sig_provider').val()?.toString() || 'openai-compatible';
    const model = getImageModelValue(provider);
    const modelSize = provider === 'novelai-newapi' ? getNovelAIModelSize(model) : '';
    return {
        name: getProfileNameForProvider(provider),
        provider,
        apiUrl: $('#sig_image_api_url').val()?.toString().trim() || '',
        apiKey: $('#sig_image_api_key').val()?.toString() || '',
        model,
        size: modelSize || $('#sig_image_size').val()?.toString().trim() || '1024x1024',
        responseFormat: $('#sig_response_format').val()?.toString() || 'b64_json',
        extraParams: $('#sig_extra_params').val()?.toString() || '{}',
        negativePrompt: $('#sig_negative_prompt').val()?.toString() || '',
        steps: normalizeNovelAISteps($('#sig_novelai_steps').val()),
        scale: Number($('#sig_novelai_scale').val()) || 5,
        sampler: $('#sig_novelai_sampler').val()?.toString().trim() || 'k_euler_ancestral',
        seed: $('#sig_novelai_seed').val()?.toString().trim() || '',
        novelaiParams: $('#sig_novelai_params').val()?.toString() || '{"qualityToggle":true,"ucPreset":0}',
    };
}

function fillProfileForm(profile) {
    $('#sig_provider').val(profile?.provider || 'openai-compatible');
    $('#sig_image_api_url').val(profile?.apiUrl || '');
    $('#sig_image_api_key').val(profile?.apiKey || '');
    $('#sig_image_model').val(profile?.model || '');
    $('#sig_image_size').val(profile?.size || '1024x1024');
    $('#sig_response_format').val(profile?.responseFormat || 'b64_json');
    $('#sig_extra_params').val(profile?.extraParams || '{}');
    $('#sig_negative_prompt').val(profile?.negativePrompt || '');
    $('#sig_novelai_steps').val(normalizeNovelAISteps(profile?.steps));
    $('#sig_novelai_scale').val(profile?.scale || 5);
    $('#sig_novelai_sampler').val(profile?.sampler || 'k_euler_ancestral');
    $('#sig_novelai_seed').val(profile?.seed || '');
    $('#sig_novelai_params').val(profile?.novelaiParams || '{"qualityToggle":true,"ucPreset":0}');
    renderNovelAIModelOptions(undefined, profile?.model || '');
    renderProviderFields();
}

function renderProviderFields() {
    const provider = $('#sig_provider').val()?.toString() || 'openai-compatible';
    const isNovelAI = provider === 'novelai-newapi';
    const modelSelect = document.querySelector('#sig_image_model_select');
    const canUseModelSelect = isNovelAI || (modelSelect?.dataset.provider === provider && modelSelect.options.length > 0);
    $('#sig_novelai_fields').toggleClass('displayNone', provider !== 'novelai-newapi');
    $('#sig_fetch_novelai_models').removeClass('displayNone');
    $('#sig_image_model').toggleClass('displayNone', canUseModelSelect);
    $('#sig_image_model_select').toggleClass('displayNone', !canUseModelSelect);
    $('#sig_image_size_label').toggleClass('displayNone', isNovelAI);
    if (isNovelAI) {
        syncNovelAIModelSelectFromInput();
    }
    syncNovelAIModelSize();
}

function ensureSelectOption(select, model) {
    if (!select || !model || Array.from(select.options).some(option => option.value === model)) {
        return;
    }

    select.append(new Option(model, model));
}

function syncNovelAIModelSelectFromInput() {
    const select = document.querySelector('#sig_image_model_select');
    if (!select) {
        return;
    }

    if (!select.options.length) {
        renderNovelAIModelOptions();
    }

    const model = $('#sig_image_model').val()?.toString().trim() || select.value || NOVELAI_MODEL_PRESETS[0];
    ensureSelectOption(select, model);
    select.value = model;
    $('#sig_image_model').val(model);
}

function syncNovelAIModelSize() {
    if ($('#sig_provider').val()?.toString() !== 'novelai-newapi') {
        return;
    }

    const modelSize = getNovelAIModelSize(getImageModelValue('novelai-newapi'));
    if (modelSize) {
        $('#sig_image_size').val(modelSize);
    }
}

function renderNovelAIModelOptions(models = NOVELAI_MODEL_PRESETS, selectedModel = '', provider = 'novelai-newapi') {
    const list = document.querySelector('#sig_novelai_model_presets');
    const select = document.querySelector('#sig_image_model_select');
    const currentModel = selectedModel || $('#sig_image_model').val()?.toString().trim() || select?.value || '';
    const modelValues = Array.from(new Set([
        ...models,
        currentModel,
    ].filter(Boolean)));

    if (list) {
        list.replaceChildren();
        for (const model of modelValues) {
            const option = document.createElement('option');
            option.value = model;
            list.append(option);
        }
    }

    if (select) {
        select.dataset.provider = provider;
        select.replaceChildren();
        for (const model of modelValues) {
            select.append(new Option(model, model));
        }

        const nextValue = modelValues.includes(currentModel) ? currentModel : modelValues[0] || '';
        select.value = nextValue;
        if (nextValue) {
            $('#sig_image_model').val(nextValue);
        }
    }
}

async function fetchImageModelOptions() {
    const provider = $('#sig_provider').val()?.toString() || 'openai-compatible';
    const button = $('#sig_fetch_novelai_models');
    const originalHtml = button.html();
    button.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 拉取中');
    setStatus('正在拉取模型列表...', 'info');

    try {
        const request = {
            apiUrl: $('#sig_image_api_url').val()?.toString().trim() || '',
            apiKey: $('#sig_image_api_key').val()?.toString() || '',
        };
        const models = provider === 'novelai-newapi'
            ? await fetchNovelAIModels(request)
            : await fetchOpenAICompatibleModels(request);

        renderNovelAIModelOptions(models, getImageModelValue(provider) || models[0], provider);
        $('#sig_image_model').val($('#sig_image_model_select').val()?.toString() || models[0] || '');
        $('#sig_image_model').addClass('displayNone');
        $('#sig_image_model_select').removeClass('displayNone');
        syncNovelAIModelSize();
        saveCurrentProfile({ silent: true, rerender: false });

        setStatus(`已拉取 ${models.length} 个模型。`, 'success');
        globalThis.toastr?.success?.(`已拉取 ${models.length} 个模型。`, '剧情生图');
    } catch (error) {
        console.error('[剧情生图]', error);
        const message = error.message || String(error);
        setStatus(message, 'error');
        globalThis.toastr?.error?.(message, '剧情生图');
    } finally {
        button.prop('disabled', false).html(originalHtml);
    }
}

function renderProfiles() {
    const settings = getSettings();
    const select = $('#sig_profile_select');
    select.empty();

    for (const profile of settings.profiles) {
        select.append($('<option />', {
            value: profile.id,
            text: profile.name,
            selected: profile.id === settings.selectedProfileId,
        }));
    }

    fillProfileForm(getSelectedProfile());
}

function fillPromptPresetForm(preset) {
    $('#sig_prompt_preset_name').val(preset?.name || '');
    $('#sig_preset_prompt').val(preset?.prompt || '');
}

function renderPromptPresets() {
    const settings = getSettings();
    const select = $('#sig_prompt_preset_select');
    select.empty();

    for (const preset of settings.promptPresets) {
        select.append($('<option />', {
            value: preset.id,
            text: preset.name,
            selected: preset.id === settings.selectedPromptPresetId,
        }));
    }

    fillPromptPresetForm(getSelectedPromptPreset());
}

function saveCurrentPromptPreset({ silent = false } = {}) {
    const settings = getSettings();
    const selected = getSelectedPromptPreset();
    if (!selected) {
        return;
    }

    selected.name = $('#sig_prompt_preset_name').val()?.toString().trim() || '未命名提示词';
    selected.prompt = $('#sig_preset_prompt').val()?.toString() || selected.prompt;
    settings.presetPrompt = selected.prompt;
    saveSettings();
    renderPromptPresets();
    if (!silent) {
        setStatus('提示词预设已保存。', 'success');
    }
}

function addPromptPreset() {
    const settings = getSettings();
    const preset = createPromptPreset();
    settings.promptPresets.push(preset);
    settings.selectedPromptPresetId = preset.id;
    settings.presetPrompt = preset.prompt;
    saveSettings();
    renderPromptPresets();
    setStatus('已新增提示词预设。', 'success');
}

function deletePromptPreset() {
    const settings = getSettings();
    if (settings.promptPresets.length <= 1) {
        setStatus('至少需要保留一个提示词预设。', 'warning');
        return;
    }

    settings.promptPresets = settings.promptPresets.filter(preset => preset.id !== settings.selectedPromptPresetId);
    settings.selectedPromptPresetId = settings.promptPresets[0]?.id || '';
    settings.presetPrompt = settings.promptPresets[0]?.prompt || settings.presetPrompt;
    saveSettings();
    renderPromptPresets();
    setStatus('提示词预设已删除。', 'success');
}

function fillNovelAIStyleForm(preset) {
    $('#sig_novelai_style_name').val(preset?.name || '');
    $('#sig_novelai_style_prompt').val(preset?.prompt || '');
    $('#sig_novelai_style_negative_prompt').val(preset?.negativePrompt || '');
}

function renderNovelAIStylePresets() {
    const settings = getSettings();
    const select = $('#sig_novelai_style_select');
    select.empty();

    for (const preset of settings.novelAIStylePresets) {
        select.append($('<option />', {
            value: preset.id,
            text: preset.name,
            selected: preset.id === settings.selectedNovelAIStylePresetId,
        }));
    }

    fillNovelAIStyleForm(getSelectedNovelAIStylePreset());
}

function saveCurrentNovelAIStylePreset({ silent = false } = {}) {
    const settings = getSettings();
    const selected = getSelectedNovelAIStylePreset();
    if (!selected) {
        return;
    }

    selected.name = $('#sig_novelai_style_name').val()?.toString().trim() || '未命名风格';
    selected.prompt = $('#sig_novelai_style_prompt').val()?.toString() || '';
    selected.negativePrompt = $('#sig_novelai_style_negative_prompt').val()?.toString() || '';
    if (selected.isAuthor) {
        delete selected.isAuthor;
        selected.isUser = true;
    }
    saveSettings();
    renderNovelAIStylePresets();
    if (!silent) {
        setStatus('NovelAI 风格已保存。', 'success');
    }
}

function addNovelAIStylePreset() {
    const settings = getSettings();
    const preset = createNovelAIStylePreset();
    settings.novelAIStylePresets.push(preset);
    settings.selectedNovelAIStylePresetId = preset.id;
    saveSettings();
    renderNovelAIStylePresets();
    setStatus('已新增 NovelAI 风格。', 'success');
}

function deleteNovelAIStylePreset() {
    const settings = getSettings();
    if (settings.novelAIStylePresets.length <= 1) {
        setStatus('至少需要保留一个 NovelAI 风格。', 'warning');
        return;
    }

    settings.novelAIStylePresets = settings.novelAIStylePresets.filter(preset => preset.id !== settings.selectedNovelAIStylePresetId);
    settings.selectedNovelAIStylePresetId = settings.novelAIStylePresets[0]?.id || '';
    saveSettings();
    renderNovelAIStylePresets();
    setStatus('NovelAI 风格已删除。', 'success');
}

function saveCurrentProfile({ silent = false, rerender = true } = {}) {
    const settings = getSettings();
    const selected = getSelectedProfile();
    if (!selected) {
        return;
    }

    Object.assign(selected, getProfileFormData());
    saveSettings();
    if (rerender) {
        renderProfiles();
    }
    if (!silent) {
        setStatus('配置已保存。', 'success');
    }
}

function saveGeneralSettings() {
    const settings = getSettings();
    settings.contextTurns = Number($('#sig_context_turns').val()) || 4;
    settings.imageRetryCount = normalizeRetryCount($('#sig_image_retry_count').val());
    saveCurrentPromptPreset({ silent: true });
    saveCurrentNovelAIStylePreset({ silent: true });
    settings.rewrite.mode = $('#sig_rewrite_mode').val()?.toString() || 'current';
    settings.rewrite.apiUrl = $('#sig_rewrite_api_url').val()?.toString().trim() || '';
    settings.rewrite.apiKey = $('#sig_rewrite_api_key').val()?.toString() || '';
    settings.rewrite.model = $('#sig_rewrite_model').val()?.toString().trim() || '';
    settings.rewrite.temperature = Number($('#sig_rewrite_temperature').val()) || 0.4;
    saveSettings();
}

function renderGeneralSettings() {
    const settings = getSettings();
    $('#sig_context_turns').val(settings.contextTurns);
    $('#sig_image_retry_count').val(normalizeRetryCount(settings.imageRetryCount));
    renderPromptPresets();
    renderNovelAIStylePresets();
    $('#sig_rewrite_mode').val(settings.rewrite.mode);
    $('#sig_rewrite_api_url').val(settings.rewrite.apiUrl);
    $('#sig_rewrite_api_key').val(settings.rewrite.apiKey);
    $('#sig_rewrite_model').val(settings.rewrite.model);
    $('#sig_rewrite_temperature').val(settings.rewrite.temperature);
    $('#sig_last_prompt').val(settings.lastPrompt || '');
    lastQuickPrompt = settings.lastPrompt || '';
    lastQuickBasePrompt = settings.lastBasePrompt || settings.lastPrompt || '';
    if (settings.lastImageUrl) {
        $('#sig_result_image').attr('src', settings.lastImageUrl);
        $('#sig_result').removeClass('displayNone');
    }
}

function renderResult(prompt, imageUrl, basePrompt = prompt) {
    $('#sig_last_prompt').val(prompt);
    $('#sig_result_image').attr('src', imageUrl);
    $('#sig_result').removeClass('displayNone');
    lastQuickPrompt = prompt;
    lastQuickBasePrompt = basePrompt || prompt;
    setQuickPromptButtonVisible(quickButton, Boolean(prompt));
    setQuickImageOnlyButtonVisible(quickButton, Boolean(prompt));
}

function createPromptPopupContent(prompt) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sig-prompt-popup';

    const title = document.createElement('h3');
    title.textContent = '本次生图提示词';

    const textarea = document.createElement('textarea');
    textarea.className = 'text_pole';
    textarea.readOnly = true;
    textarea.rows = 12;
    textarea.value = prompt;

    wrapper.append(title, textarea);
    return wrapper;
}

async function showLastPromptPopup() {
    const prompt = lastQuickPrompt || getSettings().lastPrompt || '';
    if (!prompt) {
        globalThis.toastr?.warning?.('当前还没有生成过提示词。', '剧情生图');
        return;
    }

    await callGenericPopup(createPromptPopupContent(prompt), POPUP_TYPE.TEXT, '', {
        wide: true,
        allowVerticalScrolling: true,
        leftAlign: true,
        okButton: '关闭',
    });
}

function formatBytes(bytes) {
    const megabytes = bytes / 1024 / 1024;
    return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)} MB`;
}

function formatGalleryTime(createdAt) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function createGalleryCard(item) {
    const card = document.createElement('article');
    card.className = 'sig-gallery-card';
    card.dataset.galleryId = item.id;

    const image = document.createElement('img');
    image.src = item.imageUrl;
    image.alt = '图库图片';

    const meta = document.createElement('div');
    meta.className = 'sig-gallery-meta';

    const title = document.createElement('div');
    title.className = 'sig-gallery-title';
    title.textContent = item.profileName || item.model || '剧情生图';

    const subTitle = document.createElement('div');
    subTitle.className = 'sig-gallery-subtitle';
    subTitle.textContent = [formatGalleryTime(item.createdAt), item.model, item.size].filter(Boolean).join(' · ');

    const prompt = document.createElement('div');
    prompt.className = 'sig-gallery-prompt';
    prompt.textContent = item.prompt || '无提示词记录';

    const actions = document.createElement('div');
    actions.className = 'sig-actions sig-gallery-actions';
    actions.innerHTML = `
        <button class="menu_button sig-button sig-gallery-insert" type="button">
            <i class="fa-solid fa-plus"></i>
            插入
        </button>
        <button class="menu_button sig-button sig-gallery-delete" type="button">
            <i class="fa-solid fa-trash"></i>
            删除
        </button>
    `;

    meta.append(title, subTitle, prompt, actions);
    card.append(image, meta);
    return card;
}

function renderGallery() {
    const settings = getSettings();
    const gallery = Array.isArray(settings.gallery) ? settings.gallery : [];
    const container = document.querySelector('#sig_gallery');
    const empty = document.querySelector('#sig_gallery_empty');
    const usage = document.querySelector('#sig_gallery_usage');
    if (!container || !empty) {
        return;
    }

    container.replaceChildren();
    empty.classList.toggle('displayNone', gallery.length > 0);
    if (usage) {
        usage.textContent = `已用 ${formatBytes(getGalleryStorageBytes(gallery))} / ${formatBytes(GALLERY_MAX_STORAGE_BYTES)}`;
    }

    for (const item of gallery) {
        container.append(createGalleryCard(item));
    }
}

function getGalleryItemFromEvent(event) {
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest('.sig-gallery-card');
    if (!card) {
        return null;
    }

    const settings = getSettings();
    return settings.gallery.find(item => item.id === card.dataset.galleryId) || null;
}

function setGenerationBusy(isBusy) {
    $('#sig_generate').prop('disabled', isBusy);
    setQuickButtonBusy(quickButton, isBusy);
}

async function runSceneGeneration({ reusePrompt = false } = {}) {
    if (generationInProgress) {
        return;
    }

    const settings = getSettings();
    const profile = getSelectedProfile();
    if (!profile) {
        setStatus('请先创建一个生图 API 配置。', 'warning');
        globalThis.toastr?.warning?.('请先创建一个生图 API 配置。', '剧情生图');
        return;
    }

    saveGeneralSettings();
    saveCurrentProfile();

    const sceneText = collectSceneContext(settings.contextTurns) || getLastSceneText();
    setStatus(reusePrompt ? '正在使用上次提示词生成图片...' : '正在将当前剧情改写为生图提示词...', 'info');

    try {
        generationInProgress = true;
        setGenerationBusy(true);
        if (!reusePrompt) {
            setQuickButtonProgress(quickButton, 'prompt');
        }
        const { prompt, basePrompt } = await resolveSceneGenerationPrompt({
            reusePrompt,
            lastPrompt: lastQuickPrompt || settings.lastPrompt || '',
            lastBasePrompt: lastQuickBasePrompt || settings.lastBasePrompt || '',
            sceneText,
            settings,
            profile,
            rewritePromptFn: rewritePrompt,
            applyNovelAIStylePromptFn: applyNovelAIStylePrompt,
        });
        setStatus('正在生成图片...', 'info');
        setQuickButtonProgress(quickButton, 'image');
        const generationProfile = resolveSceneGenerationProfile({
            profile,
            settings,
            getNovelAIStyleNegativePromptFn: getNovelAIStyleNegativePrompt,
        });
        const imageUrl = await runWithRetries(
            () => generateImage(prompt, generationProfile),
            {
                retries: settings.imageRetryCount,
                onAttempt: ({ attempt, maxAttempts }) => {
                    const suffix = maxAttempts > 1 ? `（第 ${attempt}/${maxAttempts} 次）` : '';
                    setStatus(`正在生成图片${suffix}...`, 'info');
                },
            },
        );

        settings.lastPrompt = prompt;
        settings.lastBasePrompt = basePrompt;
        settings.lastImageUrl = imageUrl;
        const galleryResult = addGalleryItem(settings, { imageUrl, prompt, sceneText, profile: generationProfile });
        saveSettings();
        renderResult(prompt, imageUrl, basePrompt);
        renderGallery();
        await appendGeneratedImageToLatestMessage(imageUrl);
        if (!galleryResult.retained) {
            setStatus('图片已插入当前聊天；图片超过 100 MB，未保存到图库。', 'warning');
            globalThis.toastr?.warning?.('图片超过 100 MB，未保存到图库。', '剧情生图');
        } else if (galleryResult.removedItems.length > 0) {
            const message = `图片已插入当前聊天；图库超过 100 MB，已自动删除 ${galleryResult.removedItems.length} 张旧图。`;
            setStatus(message, 'success');
            globalThis.toastr?.success?.(message, '剧情生图');
        } else {
            setStatus('图片已插入当前聊天，并已保存到图库。', 'success');
            globalThis.toastr?.success?.('图片已插入当前聊天，并已保存到图库。', '剧情生图');
        }
    } catch (error) {
        console.error('[剧情生图]', error);
        setStatus(error.message || String(error), 'error');
        globalThis.toastr?.error?.(error.message || String(error), '剧情生图');
    } finally {
        generationInProgress = false;
        setGenerationBusy(false);
    }
}

function bindQuickButton() {
    quickButton = mountQuickButton();
    if (!quickButton) {
        setTimeout(bindQuickButton, 500);
        return;
    }

    quickButton.addEventListener('click', runSceneGeneration);
    quickButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            runSceneGeneration();
        }
    });

    setQuickPromptButtonVisible(quickButton, Boolean(lastQuickPrompt));
    setQuickImageOnlyButtonVisible(quickButton, Boolean(lastQuickPrompt));
    const promptButton = quickButton.querySelector(`#${QUICK_PROMPT_BUTTON_ID}`);
    promptButton?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        showLastPromptPopup();
    });
    promptButton?.addEventListener('keydown', event => {
        event.stopPropagation();
    });

    const imageOnlyButton = quickButton.querySelector(`#${QUICK_IMAGE_ONLY_BUTTON_ID}`);
    imageOnlyButton?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        runSceneGeneration({ reusePrompt: true });
    });
    imageOnlyButton?.addEventListener('keydown', event => {
        event.stopPropagation();
    });
}

function bindEvents() {
    $('.scene-image-generator .sig-tab').on('click', function () {
        const tab = this.dataset.tab;
        $('.scene-image-generator .sig-tab')
            .removeClass('active')
            .attr('aria-selected', 'false');
        $(this)
            .addClass('active')
            .attr('aria-selected', 'true');
        $('.scene-image-generator .sig-tab-panel').removeClass('active');
        $(`.scene-image-generator .sig-tab-panel[data-tab-panel="${tab}"]`).addClass('active');
    });

    $('.scene-image-generator .sig-mini-tab').on('click', function () {
        const tab = this.dataset.novelaiTab;
        $('.scene-image-generator .sig-mini-tab')
            .removeClass('active')
            .attr('aria-selected', 'false');
        $(this)
            .addClass('active')
            .attr('aria-selected', 'true');
        $('.scene-image-generator .sig-novelai-panel').removeClass('active');
        $(`.scene-image-generator .sig-novelai-panel[data-novelai-panel="${tab}"]`).addClass('active');
    });

    $('#sig_profile_select').on('change', function () {
        const settings = getSettings();
        settings.selectedProfileId = this.value;
        saveSettings();
        renderProfiles();
    });
    $('#sig_provider').on('change', function () {
        if (this.value === 'novelai-newapi') {
            if (!$('#sig_image_model').val()) $('#sig_image_model').val('nai-diffusion-4-5-full-1024x1024');
            syncNovelAIModelSize();
        }
        renderProviderFields();
    });
    $('#sig_image_model').on('input change', syncNovelAIModelSize);
    $('#sig_image_model_select').on('change', function () {
        $('#sig_image_model').val(this.value);
        syncNovelAIModelSize();
    });
    $('#sig_provider, #sig_image_api_url, #sig_image_api_key, #sig_image_model, #sig_image_model_select, #sig_image_size, #sig_response_format, #sig_negative_prompt, #sig_novelai_steps, #sig_novelai_scale, #sig_novelai_sampler, #sig_novelai_seed')
        .on('input change', () => saveCurrentProfile({ silent: true, rerender: false }));
    $('#sig_prompt_preset_select').on('change', function () {
        const settings = getSettings();
        settings.selectedPromptPresetId = this.value;
        settings.presetPrompt = getSelectedPromptPreset()?.prompt || settings.presetPrompt;
        saveSettings();
        renderPromptPresets();
    });
    $('#sig_novelai_style_select').on('change', function () {
        const settings = getSettings();
        settings.selectedNovelAIStylePresetId = this.value;
        saveSettings();
        renderNovelAIStylePresets();
    });

    $('#sig_fetch_novelai_models').on('click', fetchImageModelOptions);
    $('#sig_add_prompt_preset').on('click', addPromptPreset);
    $('#sig_delete_prompt_preset').on('click', deletePromptPreset);
    $('#sig_save_prompt_preset').on('click', () => saveCurrentPromptPreset());
    $('#sig_add_novelai_style').on('click', addNovelAIStylePreset);
    $('#sig_delete_novelai_style').on('click', deleteNovelAIStylePreset);
    $('#sig_save_novelai_style').on('click', () => saveCurrentNovelAIStylePreset());
    $('#sig_generate').on('click', runSceneGeneration);
    $('#sig_save_general').on('click', () => {
        saveGeneralSettings();
        setStatus('设置已保存。', 'success');
    });
    $('#sig_copy_prompt').on('click', async () => {
        await navigator.clipboard.writeText($('#sig_last_prompt').val()?.toString() || '');
        setStatus('提示词已复制。', 'success');
    });
    $('#sig_open_image').on('click', () => {
        const src = $('#sig_result_image').attr('src');
        if (src) window.open(src, '_blank', 'noopener,noreferrer');
    });
    $('#sig_refresh_gallery').on('click', () => {
        const settings = getSettings();
        trimGalleryToStorageLimit(settings);
        saveSettings();
        renderGallery();
        setStatus('图库已刷新。', 'success');
    });
    $('#sig_clear_gallery').on('click', () => {
        const settings = getSettings();
        clearGallery(settings);
        saveSettings();
        renderGallery();
        setStatus('图库已清空。', 'success');
    });
    $('#sig_gallery').on('click', async event => {
        const item = getGalleryItemFromEvent(event);
        if (!item) {
            return;
        }

        const target = event.target instanceof Element ? event.target : null;

        if (target?.closest('.sig-gallery-insert')) {
            await appendGeneratedImageToLatestMessage(item.imageUrl);
            setStatus('图库图片已插入当前聊天。', 'success');
            return;
        }

        if (target?.closest('.sig-gallery-delete')) {
            const settings = getSettings();
            removeGalleryItem(settings, item.id);
            saveSettings();
            renderGallery();
            setStatus('图库图片已删除。', 'success');
        }
    });
}

export async function initSceneImageGenerator() {
    if (initialized) {
        return;
    }
    initialized = true;

    const html = await loadTemplate();
    const target = document.querySelector('#sd_container') || document.querySelector('#extensions_settings2') || document.querySelector('#extensions_settings');
    if (!target) {
        throw new Error('找不到 SillyTavern 扩展设置容器。');
    }

    target.insertAdjacentHTML('beforeend', html);
    renderNovelAIModelOptions();
    document.querySelector('#sig_chat_preview')?.remove();
    renderGeneralSettings();
    renderProfiles();
    renderGallery();
    bindEvents();
    bindQuickButton();
}

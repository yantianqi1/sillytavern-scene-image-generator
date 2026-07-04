import { collectSceneContext, getLastSceneText } from './context.js';
import { rewritePrompt } from './prompt-rewriter.js';
import { generateImage } from './providers/index.js';
import { createProfile, getSelectedProfile, getSettings, saveSettings } from './settings.js';

const TEMPLATE_URL = new URL('../settings.html', import.meta.url);
let initialized = false;

async function loadTemplate() {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
        throw new Error(`Could not load settings template: HTTP ${response.status}`);
    }
    return response.text();
}

function setStatus(message, type = 'info') {
    const status = document.querySelector('#sig_status');
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
}

function getProfileFormData() {
    return {
        name: $('#sig_profile_name').val()?.toString() || 'Image API',
        provider: $('#sig_provider').val()?.toString() || 'openai-compatible',
        apiUrl: $('#sig_image_api_url').val()?.toString().trim() || '',
        apiKey: $('#sig_image_api_key').val()?.toString() || '',
        model: $('#sig_image_model').val()?.toString().trim() || '',
        size: $('#sig_image_size').val()?.toString().trim() || '1024x1024',
        responseFormat: $('#sig_response_format').val()?.toString() || 'b64_json',
        extraParams: $('#sig_extra_params').val()?.toString() || '{}',
    };
}

function fillProfileForm(profile) {
    $('#sig_profile_name').val(profile?.name || '');
    $('#sig_provider').val(profile?.provider || 'openai-compatible');
    $('#sig_image_api_url').val(profile?.apiUrl || '');
    $('#sig_image_api_key').val(profile?.apiKey || '');
    $('#sig_image_model').val(profile?.model || '');
    $('#sig_image_size').val(profile?.size || '1024x1024');
    $('#sig_response_format').val(profile?.responseFormat || 'b64_json');
    $('#sig_extra_params').val(profile?.extraParams || '{}');
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

function saveCurrentProfile() {
    const settings = getSettings();
    const selected = getSelectedProfile();
    if (!selected) {
        return;
    }

    Object.assign(selected, getProfileFormData());
    saveSettings();
    renderProfiles();
    setStatus('Profile saved.', 'success');
}

function addProfile() {
    const settings = getSettings();
    const profile = createProfile();
    settings.profiles.push(profile);
    settings.selectedProfileId = profile.id;
    saveSettings();
    renderProfiles();
    setStatus('New profile added.', 'success');
}

function deleteProfile() {
    const settings = getSettings();
    if (settings.profiles.length <= 1) {
        setStatus('Keep at least one image profile.', 'warning');
        return;
    }

    settings.profiles = settings.profiles.filter(profile => profile.id !== settings.selectedProfileId);
    settings.selectedProfileId = settings.profiles[0]?.id || '';
    saveSettings();
    renderProfiles();
    setStatus('Profile deleted.', 'success');
}

function saveGeneralSettings() {
    const settings = getSettings();
    settings.contextTurns = Number($('#sig_context_turns').val()) || 4;
    settings.presetPrompt = $('#sig_preset_prompt').val()?.toString() || settings.presetPrompt;
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
    $('#sig_preset_prompt').val(settings.presetPrompt);
    $('#sig_rewrite_mode').val(settings.rewrite.mode);
    $('#sig_rewrite_api_url').val(settings.rewrite.apiUrl);
    $('#sig_rewrite_api_key').val(settings.rewrite.apiKey);
    $('#sig_rewrite_model').val(settings.rewrite.model);
    $('#sig_rewrite_temperature').val(settings.rewrite.temperature);
    $('#sig_last_prompt').val(settings.lastPrompt || '');
    if (settings.lastImageUrl) {
        $('#sig_result_image').attr('src', settings.lastImageUrl);
        $('#sig_result').removeClass('displayNone');
    }
}

function renderResult(prompt, imageUrl) {
    $('#sig_last_prompt').val(prompt);
    $('#sig_result_image').attr('src', imageUrl);
    $('#sig_result').removeClass('displayNone');
}

async function runSceneGeneration() {
    const settings = getSettings();
    const profile = getSelectedProfile();
    if (!profile) {
        setStatus('Create an image API profile first.', 'warning');
        return;
    }

    saveGeneralSettings();
    saveCurrentProfile();

    const sceneText = collectSceneContext(settings.contextTurns) || getLastSceneText();
    setStatus('Rewriting current scene into an image prompt...', 'info');

    try {
        $('#sig_generate').prop('disabled', true);
        const prompt = await rewritePrompt(sceneText, settings);
        setStatus('Generating image...', 'info');
        const imageUrl = await generateImage(prompt, profile);

        settings.lastPrompt = prompt;
        settings.lastImageUrl = imageUrl;
        saveSettings();
        renderResult(prompt, imageUrl);
        setStatus('Image generated.', 'success');
    } catch (error) {
        console.error('[Scene Image Generator]', error);
        setStatus(error.message || String(error), 'error');
        globalThis.toastr?.error?.(error.message || String(error), 'Scene Image Generator');
    } finally {
        $('#sig_generate').prop('disabled', false);
    }
}

function bindEvents() {
    $('#sig_profile_select').on('change', function () {
        const settings = getSettings();
        settings.selectedProfileId = this.value;
        saveSettings();
        renderProfiles();
    });

    $('#sig_add_profile').on('click', addProfile);
    $('#sig_delete_profile').on('click', deleteProfile);
    $('#sig_save_profile').on('click', saveCurrentProfile);
    $('#sig_generate').on('click', runSceneGeneration);
    $('#sig_save_general').on('click', () => {
        saveGeneralSettings();
        setStatus('Settings saved.', 'success');
    });
    $('#sig_copy_prompt').on('click', async () => {
        await navigator.clipboard.writeText($('#sig_last_prompt').val()?.toString() || '');
        setStatus('Prompt copied.', 'success');
    });
    $('#sig_open_image').on('click', () => {
        const src = $('#sig_result_image').attr('src');
        if (src) window.open(src, '_blank', 'noopener,noreferrer');
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
        throw new Error('Could not find SillyTavern extensions settings container.');
    }

    target.insertAdjacentHTML('beforeend', html);
    renderGeneralSettings();
    renderProfiles();
    bindEvents();
}

export const QUICK_BUTTON_ID = 'sig_quick_generate';
export const QUICK_PROMPT_BUTTON_ID = 'sig_quick_prompt';
export const QUICK_IMAGE_ONLY_BUTTON_ID = 'sig_quick_image_only';

const PROGRESS_LABELS = Object.freeze({
    prompt: '生成提示词中',
    image: '生成图片中',
});

export function getQuickButtonProgressLabel(phase) {
    return PROGRESS_LABELS[phase] || '';
}

export function findQuickButtonMount(root = document) {
    return root.querySelector('#rightSendForm')
        || root.querySelector('#leftSendForm')
        || root.querySelector('#send_form');
}

export function createQuickButton(root = document) {
    const button = root.createElement('div');
    button.id = QUICK_BUTTON_ID;
    button.classList.add('interactable', 'sig-quick-generate');
    button.title = '根据当前剧情生图';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', '根据当前剧情生图');
    button.innerHTML = `
        <span class="sig-quick-progress" aria-live="polite"></span>
        <i class="fa-solid fa-image"></i>
        <span class="sig-quick-label">生图</span>
    `;
    return button;
}

function createQuickAuxButton(root, { id, className, label, title }) {
    const button = root.createElement('div');
    button.id = id;
    button.classList.add('interactable', 'sig-quick-pill', className, 'displayNone');
    button.title = title;
    button.textContent = label;
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', title);
    button.setAttribute('aria-hidden', 'true');
    return button;
}

export function createQuickPromptButton(root = document) {
    return createQuickAuxButton(root, {
        id: QUICK_PROMPT_BUTTON_ID,
        className: 'sig-quick-prompt',
        label: '提示词',
        title: '查看本次生图提示词',
    });
}

export function createQuickImageOnlyButton(root = document) {
    return createQuickAuxButton(root, {
        id: QUICK_IMAGE_ONLY_BUTTON_ID,
        className: 'sig-quick-image-only',
        label: '仅生图',
        title: '使用当前提示词重新生图',
    });
}

function getOrCreateButton(root, id, createButton) {
    return root.querySelector(`#${id}`) || createButton(root);
}

function insertControls(mount, controls, sendButton = null) {
    for (const control of controls) {
        if (sendButton?.parentElement === mount) {
            mount.insertBefore(control, sendButton);
        } else {
            mount.append(control);
        }
    }
}

export function mountQuickButton(root = document) {
    const mount = findQuickButtonMount(root);
    if (!mount) {
        return null;
    }

    const promptButton = getOrCreateButton(root, QUICK_PROMPT_BUTTON_ID, createQuickPromptButton);
    const imageOnlyButton = getOrCreateButton(root, QUICK_IMAGE_ONLY_BUTTON_ID, createQuickImageOnlyButton);
    const button = getOrCreateButton(root, QUICK_BUTTON_ID, createQuickButton);
    const sendButton = root.querySelector('#send_but');
    insertControls(mount, [promptButton, imageOnlyButton, button], sendButton);

    return button;
}

function findQuickControl(button, id) {
    return button?.parentElement?.querySelector?.(`#${id}`)
        || button?.querySelector?.(`#${id}`)
        || null;
}

export function setQuickButtonBusy(button, isBusy) {
    if (!button) {
        return;
    }

    button.classList.toggle('sig-quick-busy', isBusy);
    button.setAttribute('aria-disabled', isBusy ? 'true' : 'false');
    button.title = isBusy ? '正在生成剧情图片...' : '根据当前剧情生图';

    const label = button.querySelector('.sig-quick-label');
    if (label) {
        label.textContent = isBusy ? '生成中' : '生图';
    }

    const icon = button.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-image', !isBusy);
        icon.classList.toggle('fa-spinner', isBusy);
        icon.classList.toggle('fa-spin', isBusy);
    }

    if (!isBusy) {
        setQuickButtonProgress(button, null);
    }
}

export function setQuickButtonProgress(button, phase) {
    if (!button) {
        return;
    }

    const progress = button.querySelector('.sig-quick-progress');
    if (!progress) {
        return;
    }

    const label = getQuickButtonProgressLabel(phase);
    progress.textContent = label;
    button.classList.toggle('sig-quick-has-progress', Boolean(label));
}

export function setQuickPromptButtonVisible(button, isVisible) {
    if (!button) {
        return;
    }

    const promptButton = findQuickControl(button, QUICK_PROMPT_BUTTON_ID);
    if (!promptButton) {
        return;
    }

    promptButton.classList.toggle('displayNone', !isVisible);
    promptButton.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

export function setQuickImageOnlyButtonVisible(button, isVisible) {
    if (!button) {
        return;
    }

    const imageOnlyButton = findQuickControl(button, QUICK_IMAGE_ONLY_BUTTON_ID);
    if (!imageOnlyButton) {
        return;
    }

    imageOnlyButton.classList.toggle('displayNone', !isVisible);
    imageOnlyButton.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

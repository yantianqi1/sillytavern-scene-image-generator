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
        <span class="sig-quick-tools">
            <button id="${QUICK_PROMPT_BUTTON_ID}" class="sig-quick-pill sig-quick-prompt displayNone" type="button" aria-hidden="true">
                提示词
            </button>
            <button id="${QUICK_IMAGE_ONLY_BUTTON_ID}" class="sig-quick-pill sig-quick-image-only displayNone" type="button" aria-hidden="true">
                仅生图
            </button>
        </span>
        <span class="sig-quick-progress" aria-live="polite"></span>
        <i class="fa-solid fa-image"></i>
        <span class="sig-quick-label">生图</span>
    `;
    return button;
}

export function mountQuickButton(root = document) {
    const existing = root.querySelector(`#${QUICK_BUTTON_ID}`);
    if (existing) {
        return existing;
    }

    const mount = findQuickButtonMount(root);
    if (!mount) {
        return null;
    }

    const button = createQuickButton(root);
    const sendButton = root.querySelector('#send_but');
    if (mount.id === 'rightSendForm' && sendButton?.parentElement === mount) {
        mount.insertBefore(button, sendButton);
    } else {
        mount.append(button);
    }

    return button;
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

    const promptButton = button.querySelector(`#${QUICK_PROMPT_BUTTON_ID}`);
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

    const imageOnlyButton = button.querySelector(`#${QUICK_IMAGE_ONLY_BUTTON_ID}`);
    if (!imageOnlyButton) {
        return;
    }

    imageOnlyButton.classList.toggle('displayNone', !isVisible);
    imageOnlyButton.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

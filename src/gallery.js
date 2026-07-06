function defaultCreateId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultNow() {
    return new Date().toISOString();
}

export const GALLERY_MAX_STORAGE_BYTES = 100 * 1024 * 1024;

export function getGalleryStorageBytes(gallery) {
    return new TextEncoder().encode(JSON.stringify(Array.isArray(gallery) ? gallery : [])).length;
}

export function createGalleryItem({
    imageUrl,
    prompt,
    sceneText,
    profile,
    now = defaultNow,
    createId = defaultCreateId,
} = {}) {
    if (!imageUrl) {
        throw new Error('缺少图片地址，无法保存到图库。');
    }

    return {
        id: createId(),
        imageUrl,
        prompt: prompt || '',
        sceneText: sceneText || '',
        profileName: profile?.name || '',
        model: profile?.model || '',
        size: profile?.size || '',
        createdAt: now(),
    };
}

export function normalizeGallery(settings) {
    if (!Array.isArray(settings.gallery)) {
        settings.gallery = [];
    }

    settings.gallery = settings.gallery.filter(item => item && item.id && item.imageUrl);
    return settings.gallery;
}

export function trimGalleryToStorageLimit(settings, maxBytes = GALLERY_MAX_STORAGE_BYTES) {
    const gallery = normalizeGallery(settings);
    const removedItems = [];
    let bytes = getGalleryStorageBytes(gallery);

    while (bytes > maxBytes && gallery.length > 0) {
        const removed = gallery.pop();
        if (removed) {
            removedItems.push(removed);
        }
        bytes = getGalleryStorageBytes(gallery);
    }

    return { bytes, maxBytes, removedItems };
}

export function addGalleryItem(settings, itemData, { maxBytes = GALLERY_MAX_STORAGE_BYTES } = {}) {
    const gallery = normalizeGallery(settings);
    const item = createGalleryItem(itemData);
    gallery.unshift(item);
    const trimResult = trimGalleryToStorageLimit(settings, maxBytes);

    return {
        item,
        retained: settings.gallery.some(entry => entry.id === item.id),
        ...trimResult,
    };
}

export function removeGalleryItem(settings, itemId) {
    normalizeGallery(settings);
    settings.gallery = settings.gallery.filter(item => item.id !== itemId);
}

export function clearGallery(settings) {
    settings.gallery = [];
}

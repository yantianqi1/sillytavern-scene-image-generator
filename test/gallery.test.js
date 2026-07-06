import test from 'node:test';
import assert from 'node:assert/strict';

import {
    addGalleryItem,
    clearGallery,
    createGalleryItem,
    GALLERY_MAX_STORAGE_BYTES,
    getGalleryStorageBytes,
    removeGalleryItem,
    trimGalleryToStorageLimit,
} from '../src/gallery.js';

test('creates a gallery item with image, prompt, scene, and profile metadata', () => {
    const item = createGalleryItem({
        imageUrl: 'data:image/png;base64,abc',
        prompt: 'cinematic scene',
        sceneText: '当前剧情',
        profile: { name: '测试配置', model: 'gpt-image-1', size: '1024x1024' },
        now: () => '2026-07-04T12:00:00.000Z',
        createId: () => 'gallery-id',
    });

    assert.deepEqual(item, {
        id: 'gallery-id',
        imageUrl: 'data:image/png;base64,abc',
        prompt: 'cinematic scene',
        sceneText: '当前剧情',
        profileName: '测试配置',
        model: 'gpt-image-1',
        size: '1024x1024',
        createdAt: '2026-07-04T12:00:00.000Z',
    });
});

test('adds generated images to the front of a user gallery', () => {
    const settings = {
        gallery: [{ id: 'old', imageUrl: 'old.png' }],
    };

    const result = addGalleryItem(settings, {
        imageUrl: 'new.png',
        prompt: 'prompt',
        sceneText: 'scene',
        profile: { name: '配置' },
        now: () => '2026-07-04T12:00:00.000Z',
        createId: () => 'new',
    });

    assert.equal(result.item.id, 'new');
    assert.equal(result.retained, true);
    assert.deepEqual(settings.gallery.map(entry => entry.id), ['new', 'old']);
});

test('normalizes missing gallery data before adding an item', () => {
    const settings = {};

    addGalleryItem(settings, {
        imageUrl: 'new.png',
        prompt: '',
        sceneText: '',
        profile: {},
        createId: () => 'new',
    });

    assert.equal(settings.gallery.length, 1);
    assert.equal(settings.gallery[0].id, 'new');
});

test('uses a 100 MB gallery storage limit by default', () => {
    assert.equal(GALLERY_MAX_STORAGE_BYTES, 100 * 1024 * 1024);
});

test('estimates gallery storage from serialized user data bytes', () => {
    const gallery = [{ id: 'one', imageUrl: 'data:image/png;base64,abc', prompt: '中文' }];

    assert.equal(getGalleryStorageBytes(gallery), new TextEncoder().encode(JSON.stringify(gallery)).length);
});

test('trims the oldest gallery items when storage exceeds the limit', () => {
    const settings = {
        gallery: [
            { id: 'new', imageUrl: '12345' },
            { id: 'middle', imageUrl: '12345' },
            { id: 'old', imageUrl: '12345' },
        ],
    };

    const newestOnlyBytes = getGalleryStorageBytes([{ id: 'new', imageUrl: '12345' }]);
    const result = trimGalleryToStorageLimit(settings, newestOnlyBytes);

    assert.deepEqual(settings.gallery.map(item => item.id), ['new']);
    assert.deepEqual(result.removedItems.map(item => item.id), ['old', 'middle']);
    assert.ok(result.bytes <= newestOnlyBytes);
});

test('addGalleryItem returns removed old items when enforcing storage limit', () => {
    const oldItem = { id: 'old', imageUrl: 'old-image-data' };
    const settings = {
        gallery: [oldItem],
    };
    const newestOnlyBytes = getGalleryStorageBytes([{
        id: 'new',
        imageUrl: 'new-image-data',
        prompt: '',
        sceneText: '',
        profileName: '',
        model: '',
        size: '',
        createdAt: '2026-07-04T12:00:00.000Z',
    }]);

    const result = addGalleryItem(settings, {
        imageUrl: 'new-image-data',
        prompt: '',
        sceneText: '',
        profile: {},
        now: () => '2026-07-04T12:00:00.000Z',
        createId: () => 'new',
    }, { maxBytes: newestOnlyBytes });

    assert.equal(result.retained, true);
    assert.deepEqual(result.removedItems.map(item => item.id), ['old']);
    assert.deepEqual(settings.gallery.map(item => item.id), ['new']);
});

test('removes a single gallery item by id', () => {
    const settings = {
        gallery: [
            { id: 'keep', imageUrl: 'keep.png' },
            { id: 'remove', imageUrl: 'remove.png' },
        ],
    };

    removeGalleryItem(settings, 'remove');

    assert.deepEqual(settings.gallery, [{ id: 'keep', imageUrl: 'keep.png' }]);
});

test('clears the gallery', () => {
    const settings = {
        gallery: [{ id: 'one' }],
    };

    clearGallery(settings);

    assert.deepEqual(settings.gallery, []);
});

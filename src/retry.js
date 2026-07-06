export function normalizeRetryCount(value) {
    const count = Math.floor(Number(value));
    if (!Number.isFinite(count) || count < 0) {
        return 0;
    }
    return Math.min(count, 10);
}

export async function runWithRetries(operation, { retries = 0, onAttempt } = {}) {
    const retryCount = normalizeRetryCount(retries);
    let lastError;

    for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
        try {
            onAttempt?.({ attempt, maxAttempts: retryCount + 1, retryCount });
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt > retryCount) {
                throw lastError;
            }
        }
    }

    throw lastError || new Error('操作失败。');
}

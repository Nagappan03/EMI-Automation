export async function withRetry(fn, {
    retries = 3,
    delayMs = 1000,
    label = "operation"
} = {}) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            console.log(
                `[RETRY] ${label} failed (attempt ${attempt}/${retries})`
            );

            if (attempt < retries) {
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
    }

    throw lastError;
}
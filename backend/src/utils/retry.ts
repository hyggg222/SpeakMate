/**
 * Retries an async function up to maxAttempts times with linear backoff.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

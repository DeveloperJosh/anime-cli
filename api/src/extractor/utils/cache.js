const cache = new Map();

export function setCache(key, value, ttl = 300000) { // Default TTL 5 minutes
    const expireAt = Date.now() + ttl;
    cache.set(key, { value, expireAt });
}

export function getCache(key) {
    const cachedItem = cache.get(key);
    if (cachedItem && cachedItem.expireAt > Date.now()) {
        return cachedItem.value;
    }
    cache.delete(key);
    return null;
}

// Cleanup expired cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, { expireAt }] of cache.entries()) {
        if (expireAt <= now) {
            cache.delete(key);
        }
    }
}, 60000); // Every 1 minute

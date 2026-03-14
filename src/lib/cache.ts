import { LRUCache } from 'lru-cache'

// Single shared LRU cache — lives in Node module scope (persistent per worker process)
const cache = new LRUCache<string, unknown>({
  max: 500,
  ttl: 1000 * 30, // 30 second default TTL
})

export function cacheGet<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined
}

export function cacheSet<T>(key: string, value: T, ttlMs?: number): void {
  if (ttlMs !== undefined) {
    cache.set(key, value, { ttl: ttlMs })
  } else {
    cache.set(key, value)
  }
}

export function cacheDelete(key: string): void {
  cache.delete(key)
}

/** Delete all keys that start with a given prefix */
export function cacheClear(prefix: string): void {
  const keys = Array.from(cache.keys())
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

// ── Typed cache key helpers ────────────────────────────────────────────────
// Centralising key names prevents typos across the codebase.

export const CK = {
  users:          () => 'users:all',
  user:           (id: string) => `user:${id}`,
  userByEmail:    (email: string) => `user:email:${email}`,
  tasks:          (projectId?: string) => projectId ? `tasks:p:${projectId}` : 'tasks:all',
  task:           (id: string) => `task:${id}`,
  subtasks:       (taskId: string) => `subtasks:${taskId}`,
  attachments:    (taskId: string) => `attachments:${taskId}`,
  submissions:    () => 'submissions:all',
  reviews:        (userId: string) => `reviews:user:${userId}`,
  notifications:  (userId: string) => `notifs:user:${userId}`,
  org:            (id: string) => `org:${id}`,
  workflows:      () => 'workflows:all',
}

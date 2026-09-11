export interface StorageArea {
  get<T = unknown>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

class MemoryStorage implements StorageArea {
  private m = new Map<string, unknown>()
  async get<T>(k: string): Promise<T | undefined> {
    return this.m.get(k) as T | undefined
  }
  async set<T>(k: string, v: T): Promise<void> {
    this.m.set(k, v)
  }
  async remove(k: string): Promise<void> {
    this.m.delete(k)
  }
  async clear(): Promise<void> {
    this.m.clear()
  }
}

class ChromeStorage implements StorageArea {
  async get<T>(k: string): Promise<T | undefined> {
    const r = await chrome.storage.local.get(k)
    return r[k] as T | undefined
  }
  async set<T>(k: string, v: T): Promise<void> {
    await chrome.storage.local.set({ [k]: v })
  }
  async remove(k: string): Promise<void> {
    await chrome.storage.local.remove(k)
  }
  async clear(): Promise<void> {
    await chrome.storage.local.clear()
  }
}

export function createStorage(): StorageArea {
  return typeof chrome !== 'undefined' && chrome.storage?.local
    ? new ChromeStorage()
    : new MemoryStorage()
}

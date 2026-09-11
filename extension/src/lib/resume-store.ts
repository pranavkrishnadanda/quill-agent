import { createStorage } from './storage.js'

export interface StoredResume {
  fullName: string
  email: string
  phone: string
  linkedin?: string
  github?: string
  portfolio?: string
  location?: string
  summary?: string
  experience: unknown[]
  education: unknown[]
  skills: string[]
}

export async function loadStoredResume(): Promise<StoredResume | null> {
  const store = createStorage()
  const raw = await store.get<string>('resumeJson')
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredResume
  } catch {
    return null
  }
}

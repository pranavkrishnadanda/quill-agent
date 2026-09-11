import { createStorage } from '../lib/storage.js'

const store = createStorage()
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const serverUrl = $<HTMLInputElement>('server-url')
const authToken = $<HTMLInputElement>('auth-token')
const anthropicKey = $<HTMLInputElement>('anthropic-key')
const resumeJson = $<HTMLTextAreaElement>('resume-json')
const form = $<HTMLFormElement>('options-form')
const status = $<HTMLSpanElement>('status-message')
const resumeError = $<HTMLParagraphElement>('resume-error')

async function load(): Promise<void> {
  serverUrl.value = (await store.get<string>('serverUrl')) ?? 'http://127.0.0.1:8787'
  authToken.value = (await store.get<string>('authToken')) ?? ''
  anthropicKey.value = (await store.get<string>('anthropicKey')) ?? ''
  resumeJson.value = (await store.get<string>('resumeJson')) ?? ''
}
void load()

function showResumeError(msg: string | null): void {
  if (!resumeError) return
  if (msg) {
    resumeError.textContent = msg
    resumeError.hidden = false
  } else {
    resumeError.textContent = ''
    resumeError.hidden = true
  }
}

async function save(): Promise<void> {
  showResumeError(null)
  const trimmed = resumeJson.value.trim()
  if (trimmed) {
    try { JSON.parse(trimmed) }
    catch (e) { showResumeError('Invalid JSON: ' + (e instanceof Error ? e.message : String(e))); return }
  }
  await store.set('serverUrl', serverUrl.value.trim())
  await store.set('authToken', authToken.value.trim())
  await store.set('anthropicKey', anthropicKey.value.trim())
  await store.set('resumeJson', trimmed)
  status.textContent = 'Saved'
  setTimeout(() => { status.textContent = '' }, 2000)
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  void save()
})

import { sendToBackground } from '../lib/messaging.js'
import { friendlyMessage } from '../lib/errors.js'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const fillBtn = $<HTMLButtonElement>('fillTab')
const fillOut = $<HTMLPreElement>('fillOut')
const healthBtn = $<HTMLButtonElement>('checkHealth')
const healthOut = $<HTMLPreElement>('healthOut')
const codeBtn = $<HTMLButtonElement>('requestCode')
const codeOut = $<HTMLPreElement>('codeOut')
const autoVerifyBtn = $<HTMLButtonElement>('autoVerify')
const autoVerifyOut = $<HTMLPreElement>('autoVerifyOut')
const openOptions = $<HTMLAnchorElement>('openOptions')
const openQueue = $<HTMLAnchorElement>('openQueue')

autoVerifyBtn.addEventListener('click', async () => {
  autoVerifyOut.textContent = 'auto-filling verification code...'
  autoVerifyBtn.disabled = true
  try {
    const r = await sendToBackground({ type: 'auto-verify', payload: {} })
    autoVerifyOut.textContent = JSON.stringify(r, null, 2)
  } catch (e) {
    autoVerifyOut.textContent = 'error: ' + friendlyMessage(e)
  } finally {
    autoVerifyBtn.disabled = false
  }
})

fillBtn.addEventListener('click', async () => {
  fillOut.textContent = 'planning fill via Claude...'
  fillBtn.disabled = true
  try {
    const r = await sendToBackground({ type: 'fill-current-tab', payload: {} })
    fillOut.textContent = JSON.stringify(r, null, 2)
  } catch (e) {
    fillOut.textContent = 'error: ' + friendlyMessage(e)
  } finally {
    fillBtn.disabled = false
  }
})

healthBtn.addEventListener('click', async () => {
  healthOut.textContent = 'checking...'
  try {
    healthOut.textContent = JSON.stringify(await sendToBackground({ type: 'health', payload: {} }), null, 2)
  } catch (e) {
    healthOut.textContent = 'error: ' + friendlyMessage(e)
  }
})

codeBtn.addEventListener('click', async () => {
  codeOut.textContent = 'waiting...'
  try {
    codeOut.textContent = JSON.stringify(
      await sendToBackground({ type: 'get-verification-code', payload: { pattern: 'verify', timeout_seconds: 30 } }),
      null,
      2,
    )
  } catch (e) {
    codeOut.textContent = 'error: ' + friendlyMessage(e)
  }
})

openOptions.addEventListener('click', (e) => {
  e.preventDefault()
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  }
})

openQueue.addEventListener('click', (e) => {
  e.preventDefault()
  chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/queue-view.html') })
})

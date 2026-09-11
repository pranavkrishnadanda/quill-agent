export interface Message<T extends string = string, P = unknown> {
  type: T
  payload: P
}

export function makeMessage<T extends string, P>(type: T, payload: P): Message<T, P> {
  return { type, payload }
}

export async function sendToBackground<R = unknown>(msg: Message): Promise<R> {
  return chrome.runtime.sendMessage(msg) as Promise<R>
}

export function onMessage<R>(
  handler: (msg: Message, sender: chrome.runtime.MessageSender) => Promise<R> | R,
): void {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    Promise.resolve(handler(msg as Message, sender)).then(sendResponse)
    return true // keep the message channel open for async response
  })
}

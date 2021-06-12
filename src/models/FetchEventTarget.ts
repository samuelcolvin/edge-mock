export class EdgeEventTarget implements EventTarget {
  protected readonly listeners: Set<EventListener>

  constructor() {
    this.listeners = new Set()
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type != 'fetch') {
      throw new Error(`only "fetch" events are supported, not "${type}"`)
    } else if (options) {
      throw new Error('"options" is not supported for addEventListener')
    }

    if (listener == null) {
      return
    } else if ('handleEvent' in listener) {
      this.listeners.add(listener.handleEvent)
    } else {
      this.listeners.add(listener)
    }
  }

  dispatchEvent(event: FetchEvent): boolean {
    for (const listener of this.listeners) {
      listener(event)
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
    // dispatchEvent mostly returns true
    return true
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type != 'fetch') {
      throw new Error(`only "fetch" events are supported, not "${type}"`)
    }
    if (listener == null) {
      return
    } else if ('handleEvent' in listener) {
      this.listeners.delete(listener.handleEvent)
    } else {
      this.listeners.delete(listener)
    }
  }

  _resetEventListeners(): void {
    this.listeners.clear()
  }
}

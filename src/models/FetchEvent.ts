export class EdgeFetchEvent implements FetchEvent {
  readonly type: 'fetch'
  readonly request: Request
  _response: Response | Promise<Response> | null = null
  readonly _wait_until_promises: Promise<any>[] = []

  constructor(type: 'fetch', init: FetchEventInit) {
    if (type != 'fetch') {
      throw new Error('only "fetch" events are supported')
    }
    this.type = type
    this.request = init.request
  }

  respondWith(response: Response | Promise<Response>): void {
    this._response = response
  }

  waitUntil(f: any): void {
    this._wait_until_promises.push(f as Promise<any>)
  }

  // all these values/methods are required to be a valid FetchEvent but are not implemented by FetchEvents
  // in CloudFlare workers, hence returning undefined
  get clientId(): string {
    return undefined as any
  }
  get resultingClientId(): string {
    return undefined as any
  }
  get bubbles(): boolean {
    return undefined as any
  }
  get cancelBubble(): boolean {
    return undefined as any
  }
  get cancelable(): boolean {
    return undefined as any
  }
  get composed(): boolean {
    return undefined as any
  }
  get currentTarget(): EventTarget | null {
    return undefined as any
  }
  get defaultPrevented(): boolean {
    return undefined as any
  }
  get isTrusted(): boolean {
    return undefined as any
  }
  get returnValue(): boolean {
    return undefined as any
  }
  get srcElement(): EventTarget | null {
    return undefined as any
  }
  get target(): EventTarget | null {
    return undefined as any
  }
  get timeStamp(): number {
    return undefined as any
  }
  get eventPhase(): number {
    return undefined as any
  }
  get AT_TARGET(): number {
    return undefined as any
  }
  get BUBBLING_PHASE(): number {
    return undefined as any
  }
  get CAPTURING_PHASE(): number {
    return undefined as any
  }
  get NONE(): number {
    return undefined as any
  }
  get preloadResponse(): Promise<any> {
    return undefined as any
  }
  get initEvent(): (_type: string, _bubbles?: boolean, _cancelable?: boolean) => void {
    return undefined as any
  }
  get passThroughOnException(): () => void {
    return undefined as any
  }
  get composedPath(): () => EventTarget[] {
    return undefined as any
  }
  get preventDefault(): () => void {
    return undefined as any
  }
  get stopImmediatePropagation(): () => void {
    return undefined as any
  }
  get stopPropagation(): () => void {
    return undefined as any
  }
}

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

  waitUntil(f: Promise<any>): void {
    this._wait_until_promises.push(f)
  }

  // all these values/methods are required to be a valid FetchEvent but are not implemented by FetchEvents
  // in CloudFlare workers, hence returning undefined
  /* istanbul ignore next */
  get clientId(): string {
    return undefined as any
  }
  /* istanbul ignore next */
  get resultingClientId(): string {
    return undefined as any
  }
  /* istanbul ignore next */
  get bubbles(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get cancelBubble(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get cancelable(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get composed(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get currentTarget(): EventTarget | null {
    return undefined as any
  }
  /* istanbul ignore next */
  get defaultPrevented(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get isTrusted(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get returnValue(): boolean {
    return undefined as any
  }
  /* istanbul ignore next */
  get srcElement(): EventTarget | null {
    return undefined as any
  }
  /* istanbul ignore next */
  get target(): EventTarget | null {
    return undefined as any
  }
  /* istanbul ignore next */
  get timeStamp(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get eventPhase(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get AT_TARGET(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get BUBBLING_PHASE(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get CAPTURING_PHASE(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get NONE(): number {
    return undefined as any
  }
  /* istanbul ignore next */
  get preloadResponse(): Promise<any> {
    return undefined as any
  }
  /* istanbul ignore next */
  get initEvent(): (_type: string, _bubbles?: boolean, _cancelable?: boolean) => void {
    return undefined as any
  }
  /* istanbul ignore next */
  get passThroughOnException(): () => void {
    return undefined as any
  }
  /* istanbul ignore next */
  get composedPath(): () => EventTarget[] {
    return undefined as any
  }
  /* istanbul ignore next */
  get preventDefault(): () => void {
    return undefined as any
  }
  /* istanbul ignore next */
  get stopImmediatePropagation(): () => void {
    return undefined as any
  }
  /* istanbul ignore next */
  get stopPropagation(): () => void {
    return undefined as any
  }
}

import {EdgeFetchEvent, EdgeRequest} from '../src'

describe('EdgeFetchEvent', () => {
  test('wrong-types', async () => {
    const efe = EdgeFetchEvent as any
    const t = () => new efe('not-fetch', null)
    expect(t).toThrow('only "fetch" events are supported')
  })

  test('waitUntil', async () => {
    const request = new EdgeRequest('/')
    const event = new EdgeFetchEvent('fetch', {request})
    expect(event._wait_until_promises).toHaveLength(0)
    expect(event.clientId).toStrictEqual(undefined)

    const f = async () => 123
    event.waitUntil(f())
    expect(event._wait_until_promises).toHaveLength(1)
    expect(await event._wait_until_promises[0]).toEqual(123)
  })
})

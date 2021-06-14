export async function handleRequest(event: FetchEvent): Promise<Response> {
  const {request} = event
  const method = request.method
  let body: string | null = null
  if (method == 'POST') {
    body = await request.text()
  }
  const url = new URL(request.url)
  const response_info = {
    method,
    headers: Object.fromEntries(request.headers.entries()),
    searchParams: Object.fromEntries(url.searchParams.entries()),
    body,
  }
  const headers = {'content-type': 'application/json'}
  return new Response(JSON.stringify(response_info, null, 2), {headers})
}

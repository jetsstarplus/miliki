import { GRAPHQL_UPSTREAM_URL } from '@/constants/api';

function buildForwardHeaders(request: Request): Headers {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const companyId = request.headers.get('x-company-id');
  if (companyId) headers.set('x-company-id', companyId);

  return headers;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.text();

    const upstreamResponse = await fetch(GRAPHQL_UPSTREAM_URL, {
      method: 'POST',
      headers: buildForwardHeaders(request),
      body,
    });

    const upstreamBody = await upstreamResponse.text();
    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new Response(upstreamBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return Response.json(
      {
        errors: [
          {
            message: error?.message ?? 'GraphQL proxy request failed.',
          },
        ],
      },
      { status: 502 },
    );
  }
}

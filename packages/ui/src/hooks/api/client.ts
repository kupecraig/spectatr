import { API_CONFIG } from '@/config/constants';
import { getActiveTenantId } from '@/utils/tenant';

interface TrpcResponse<T> {
  result: {
    data: T;
  };
}

/**
 * Fetch from tRPC endpoint with optional authentication
 * @param path - tRPC procedure path (e.g., 'players.list')
 * @param input - Input parameters for the procedure
 * @param getToken - Optional function to get authentication token
 * @param method - HTTP method: 'GET' for queries, 'POST' for mutations (default: 'GET')
 */
export async function fetchTrpc<T>(
  path: string,
  input?: Record<string, unknown>,
  getToken?: () => Promise<string | null>,
  method: 'GET' | 'POST' = 'GET'
): Promise<T> {
  const url = new URL(`${API_CONFIG.BASE_URL}/trpc/${path}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-tenant-id': getActiveTenantId(),
  };

  // Add auth token if available
  if (getToken) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const isGet = method === 'GET';

  // GET: input as query param; POST: input in body
  if (isGet && input) {
    url.searchParams.set('input', JSON.stringify({ json: input }));
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    ...(!isGet && { body: JSON.stringify(input ?? {}) }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const data = (await response.json()) as TrpcResponse<T>;
  return data.result.data;
}

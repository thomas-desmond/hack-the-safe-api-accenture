import type { ApiResponse, Env } from '../types';

export function createResponse<T>(data: T, status = 200, headers: HeadersInit = {}): Response {
	return new Response(
		JSON.stringify({ data } as ApiResponse<T>),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		}
	);
}

export function createErrorResponse(error: string, status = 400, headers: HeadersInit = {}): Response {
	return new Response(
		JSON.stringify({ error } as ApiResponse),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		}
	);
}

export function getCorsHeaders(): HeadersInit {
	return {
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Allow-Methods': 'POST',
		'Access-Control-Allow-Origin': '*',
	};
}

export function handleOptionsRequest(request: Request, corsHeaders: HeadersInit): boolean {
	if (request.method === 'OPTIONS') {
		return true;
	}
	return false;
}

export function validateAdminApiKey(request: Request, env: Env): boolean {
	const apiKey = request.headers.get('x-api-key');
	return apiKey === env.ACCENTURE_ADMIN_API_KEY;
}

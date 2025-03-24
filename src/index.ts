/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.json`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import type { Env } from './types';
import { handleSubmit, handleCheckCode, handleAIChat, handleSelectWinner, handleGetStats } from './handlers';
import { getCorsHeaders, handleOptionsRequest } from './utils/response';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = getCorsHeaders();
		if (handleOptionsRequest(request, corsHeaders)) {
			return new Response('OK', {
				headers: corsHeaders,
			});
		}

		const url = new URL(request.url);
		const isAdminStats = url.pathname === '/admin/stats';

		if (!isAdminStats && request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		if (isAdminStats && request.method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		switch (url.pathname) {
			case '/submit':
				return handleSubmit(request, env, corsHeaders);
			case '/check-code':
				return handleCheckCode(request, env, corsHeaders);
			case '/admin/select-winner':
				return handleSelectWinner(request, env, corsHeaders);
			case '/admin/stats':
				return handleGetStats(request, env, corsHeaders);
			default:
				return handleAIChat(request, env, corsHeaders);
		}
	},
} satisfies ExportedHandler<Env>;

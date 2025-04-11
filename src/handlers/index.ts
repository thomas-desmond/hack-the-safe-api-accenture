import type { Env, UserInfo, CheckCodeRequest, AIChatRequest, HintImageRequest } from '../types';
import { DatabaseService } from '../services/db';
import { createResponse, createErrorResponse } from '../utils/response';
import { SECRET_CODES, AI_CONFIG, SYSTEM_MESSAGES } from '../constants';
import { checkAiTextForHintKeywords } from '../utils/hintCheck';

export async function handleSubmit(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const formData = (await request.json()) as UserInfo;
		const db = new DatabaseService(env.DB);
		await db.upsertUser(formData);
		return createResponse('Data saved successfully', 200, corsHeaders);
	} catch (error) {
		console.error('Submit error:', error);
		return createErrorResponse(`Failed to save user data: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleCheckCode(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const { code, level, email } = (await request.json()) as CheckCodeRequest;
		const correct = SECRET_CODES[level] === code;

		if (correct && level === 3) {
			const db = new DatabaseService(env.DB);
			await db.markUserAsHacker(email);
		}

		return createResponse({ correct }, 200, corsHeaders);
	} catch (error) {
		console.error('Check code error:', error);
		return createErrorResponse(`Failed to check code: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleHintImage(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		// Get the raw binary data from the request body
		const imageData = await request.arrayBuffer();
		const imageArray = new Uint8Array(imageData);

		const response = (await env.AI.run(
			"@cf/llava-hf/llava-1.5-7b-hf",
			{ image: Array.from(imageArray), prompt: 'Describe what you see in the image' },
			{
				gateway: {
					id: 'hack-the-safe',
					skipCache: false,
					cacheTtl: 3360,
				},
			}
		)) as AiImageToTextOutput;

		const shouldGetHint = checkAiTextForHintKeywords(response.description);

		if (shouldGetHint) {
			return createResponse({ aiTextResult: response.description, hint: SECRET_CODES[3][0], hintPosition: "1st" }, 200, corsHeaders);
		} else {
			return createResponse({ aiTextResult: response.description, hint: null, hintPosition: null }, 200, corsHeaders);
		}

	} catch (error) {
		console.error('Check code error:', error);
		return createErrorResponse(`Failed to check code: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleAIChat(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const { messages, level } = (await request.json()) as AIChatRequest;
		const systemMessage = SYSTEM_MESSAGES[level];

		if (!systemMessage) {
			return createErrorResponse('Invalid level', 400, corsHeaders);
		}

		messages.unshift({ role: 'system', content: systemMessage });

		const response = await env.AI.run(
			AI_CONFIG.model as keyof AiModels,
			{ messages },
			{
				gateway: {
					id: 'hack-the-safe',
					skipCache: false,
					cacheTtl: 3360,
				},
			}
		);

		return createResponse(response, 200, corsHeaders);
	} catch (error) {
		console.error('AI chat error:', error);
		return createErrorResponse(`Failed to process AI chat: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleSelectWinner(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const db = new DatabaseService(env.DB);
		const winner = await db.getRandomWinner();

		if (!winner) {
			return createErrorResponse('No winners found', 404, corsHeaders);
		}

		return createResponse(winner, 200, corsHeaders);
	} catch (error) {
		console.error('Select winner error:', error);
		return createErrorResponse(`Failed to select winner: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleGetStats(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const db = new DatabaseService(env.DB);
		const stats = await db.getStats();
		return createResponse(stats, 200, corsHeaders);
	} catch (error) {
		console.error('Get stats error:', error);
		return createErrorResponse(`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleGetSecretCodes(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		return createResponse(SECRET_CODES, 200, corsHeaders);
	} catch (error) {
		console.error('Get secret codes error:', error);
		return createErrorResponse(`Failed to get secret codes: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

export async function handleExportDatabase(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
	try {
		const headers = ['id', 'email', 'full_name', 'agree_to_contact', 'did_hack_safe', 'created_at', 'hacked_at'];

		// Create a TransformStream for streaming the CSV data
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		// Start the streaming process
		(async () => {
			try {
				// Write CSV headers
				await writer.write(encoder.encode(headers.join(',') + '\n'));

				const BATCH_SIZE = 1000;
				let offset = 0;
				let hasMore = true;

				// Process in batches
				while (hasMore) {
					const query = `
						SELECT *
						FROM users
						ORDER BY created_at
						LIMIT ? OFFSET ?;
					`;
					const results = await env.DB.prepare(query).bind(BATCH_SIZE, offset).all();

					if (results.results.length === 0) {
						hasMore = false;
					} else {
						const csvRows = results.results.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')).join('\n');

						await writer.write(encoder.encode(csvRows + '\n'));
						offset += results.results.length;
					}
				}

				await writer.close();
			} catch (error) {
				await writer.abort(error);
			}
		})();

		// Return the readable stream immediately
		return new Response(readable, {
			headers: {
				...corsHeaders,
				'Content-Type': 'text/csv',
				'Content-Disposition': 'attachment; filename="hack-the-safe-users.csv"',
				'Transfer-Encoding': 'chunked',
			},
		});
	} catch (error) {
		console.error('Export database error:', error);
		return createErrorResponse(`Failed to export database: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, corsHeaders);
	}
}

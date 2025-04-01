import type { Env, UserInfo, CheckCodeRequest, AIChatRequest } from '../types';
import { DatabaseService } from '../services/db';
import { createResponse, createErrorResponse } from '../utils/response';
import { SECRET_CODES, AI_CONFIG, SYSTEM_MESSAGES } from '../constants';

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
				}
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

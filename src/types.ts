export interface Env {
	AI: Ai;
	DB: D1Database;
	ACCENTURE_ADMIN_API_KEY: string;
}

export interface Message {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface UserInfo {
	email: string;
	name: string;
	agreeToContact: boolean;
}

export interface CheckCodeRequest {
	code: string;
	level: number;
	email: string;
}

export interface HintImageRequest {
	image: Uint8Array;
}

export interface AIChatRequest {
	messages: Message[];
	level: number;
}

export interface ApiResponse<T = unknown> {
	data?: T;
	error?: string;
}

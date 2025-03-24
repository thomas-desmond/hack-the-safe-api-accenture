import type { D1Database } from '@cloudflare/workers-types';
import type { UserInfo } from '../types';

export class DatabaseService {
	constructor(private db: D1Database) {}

	async upsertUser(user: UserInfo): Promise<void> {
		const query = `
			INSERT INTO users (email, full_name, agree_to_contact)
			VALUES (?, ?, ?)
			ON CONFLICT(email) DO UPDATE SET
				full_name = excluded.full_name,
				agree_to_contact = excluded.agree_to_contact;
		`;
		await this.db.prepare(query).bind(user.email, user.name, user.agreeToContact).run();
	}

	async markUserAsHacker(email: string): Promise<void> {
		const query = `
			UPDATE users
			SET did_hack_safe = true,
				hacked_at = CURRENT_TIMESTAMP
			WHERE email = ?;
		`;
		await this.db.prepare(query).bind(email).run();
	}

	async getRandomWinner(): Promise<{ email: string; full_name: string } | null> {
		const query = `
			SELECT email, full_name
			FROM users
			WHERE did_hack_safe = true
			ORDER BY RANDOM()
			LIMIT 1;
		`;
		const result = await this.db.prepare(query).first();
		return result as { email: string; full_name: string } | null;
	}

	async getStats(): Promise<{ totalUsers: number; successfulHacks: number }> {
		const totalUsersQuery = `
			SELECT COUNT(*) as count
			FROM users;
		`;
		const totalHackersQuery = `
			SELECT COUNT(*) as count
			FROM users
			WHERE did_hack_safe = true;
		`;

		const [totalUsersResult, totalHackersResult] = await Promise.all([
			this.db.prepare(totalUsersQuery).first(),
			this.db.prepare(totalHackersQuery).first()
		]);

		return {
			totalUsers: (totalUsersResult as { count: number }).count,
			successfulHacks: (totalHackersResult as { count: number }).count
		};
	}
}

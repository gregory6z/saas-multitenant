import type { TokenPayload, TokenProvider } from "../token-provider.js";
import { InvalidTokenError } from "@/modules/auth/errors/auth.errors.js";

export class InMemoryTokenProvider implements TokenProvider {
	private tokens: Map<string, TokenPayload> = new Map();

	async generateToken(payload: TokenPayload): Promise<string> {
		const token = `token-${Math.random().toString(36).substring(2, 15)}`;

		this.tokens.set(token, payload);

		return token;
	}

	async verifyToken(token: string): Promise<TokenPayload> {
		const payload = this.tokens.get(token);

		if (!payload) {
			throw new InvalidTokenError();
		}

		return payload;
	}
}

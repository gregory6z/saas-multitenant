import type {
	TokenPayload,
	RefreshTokenPayload,
	TokenProvider,
} from "../token-provider.js";
import { InvalidTokenError } from "@/modules/auth/errors/auth.errors.js";

export class InMemoryTokenProvider implements TokenProvider {
	private tokens: Map<string, TokenPayload> = new Map();
	private refreshTokens: Map<string, RefreshTokenPayload> = new Map();

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

	async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
		const refreshToken = `refresh-token-${Math.random().toString(36).substring(2, 15)}`;

		this.refreshTokens.set(refreshToken, payload);

		return refreshToken;
	}

	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		const payload = this.refreshTokens.get(token);

		if (!payload) {
			throw new InvalidTokenError();
		}

		return payload;
	}
}

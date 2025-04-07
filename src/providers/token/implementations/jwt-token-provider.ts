import jwt from "jsonwebtoken";
import { env } from "@/env/index.js";
import type {
	TokenPayload,
	RefreshTokenPayload,
	TokenProvider,
} from "../token-provider.js";
import {
	InvalidTokenError,
	TokenExpiredError,
} from "@/modules/auth/errors/auth.errors.js";

export class JwtTokenProvider implements TokenProvider {
	async generateToken(payload: TokenPayload): Promise<string> {
		return jwt.sign(payload, env.JWT_SECRET, {
			expiresIn: "15m", // Token de acesso expira em 15 minutos
		});
	}

	async verifyToken(token: string): Promise<TokenPayload> {
		try {
			return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new TokenExpiredError();
			}

			throw new InvalidTokenError();
		}
	}

	async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
		return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
			expiresIn: "7d",
		});
	}

	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		try {
			return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new TokenExpiredError();
			}

			throw new InvalidTokenError();
		}
	}
}

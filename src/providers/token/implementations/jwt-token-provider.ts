import jwt from "jsonwebtoken";
import { env } from "@/env/index.js";
import type { TokenPayload, TokenProvider } from "../token-provider.js";
import {
	InvalidTokenError,
	TokenExpiredError,
} from "@/modules/auth/errors/auth.errors.js";

export class JwtTokenProvider implements TokenProvider {
	constructor(private jwtSecret: string) {}

	async generateToken(payload: TokenPayload): Promise<string> {
		return jwt.sign(payload, this.jwtSecret, {
			expiresIn: "1d", // Token expires in 1 day
		});
	}

	async verifyToken(token: string): Promise<TokenPayload> {
		try {
			return jwt.verify(token, this.jwtSecret) as TokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new TokenExpiredError();
			}

			throw new InvalidTokenError();
		}
	}
}

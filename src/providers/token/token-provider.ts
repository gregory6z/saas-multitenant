export interface TokenPayload {
	userId: string;
	tenantId: string;
	role: string;
}

export interface RefreshTokenPayload {
	userId: string;
	family: string;
}

export interface TokenProvider {
	generateToken(payload: TokenPayload): Promise<string>;
	verifyToken(token: string): Promise<TokenPayload>;
	generateRefreshToken(payload: RefreshTokenPayload): Promise<string>;
	verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}

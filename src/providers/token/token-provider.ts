export interface TokenPayload {
	userId: string;
	tenantId: string;
	role: string;
}

export interface TokenProvider {
	generateToken(payload: TokenPayload): Promise<string>;
	verifyToken(token: string): Promise<TokenPayload>;
}

// ---- Authentication Errors ----

export class InvalidCredentialsError extends Error {
	constructor() {
		super("Invalid credentials");
		this.name = "InvalidCredentialsError";
	}
}

export class TokenExpiredError extends Error {
	constructor() {
		super("Token has expired");
		this.name = "TokenExpiredError";
	}
}

export class InvalidTokenError extends Error {
	constructor() {
		super("Invalid or malformed token");
		this.name = "InvalidTokenError";
	}
}

export class MissingTokenError extends Error {
	constructor() {
		super("Authentication token is missing");
		this.name = "MissingTokenError";
	}
}

export class UnauthorizedError extends Error {
	constructor() {
		super("You are not authorized to access this resource");
		this.name = "UnauthorizedError";
	}
}

// ---- Refresh Token Errors ----

export class InvalidRefreshTokenError extends Error {
	constructor() {
		super("Invalid refresh token");
		this.name = "InvalidRefreshTokenError";
	}
}

export class RefreshTokenRevokedError extends Error {
	constructor() {
		super("Refresh token has been revoked");
		this.name = "RefreshTokenRevokedError";
	}
}

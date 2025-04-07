// ---- Account Errors ----

export class EmailAlreadyInUseError extends Error {
	constructor(email: string) {
		super(`The email "${email}" is already in use.`);
		this.name = "EmailAlreadyInUseError";
	}
}

// ---- User Errors ----

export class UserNotFoundError extends Error {
	constructor() {
		super("User not found");
		this.name = "UserNotFoundError";
	}
}

// ---- Permission Errors ----

export class UnauthorizedRoleChangeError extends Error {
	constructor() {
		super("You do not have permission to change user roles");
		this.name = "UnauthorizedRoleChangeError";
	}
}

export class UnauthorizedOperationError extends Error {
	constructor() {
		super("You are not authorized to perform this operation");
		this.name = "UnauthorizedOperationError";
	}
}

export class CrossTenantOperationError extends Error {
	constructor() {
		super("You cannot perform operations on users from different tenants");
		this.name = "CrossTenantOperationError";
	}
}

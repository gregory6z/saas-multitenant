export class PermissionDeniedError extends Error {
	constructor(permission: string) {
		super(`Permission denied: ${permission}`);
		this.name = "PermissionDeniedError";
	}
}

export class SubdomainAlreadyInUseError extends Error {
	constructor(subdomain: string) {
		super(`The subdomain "${subdomain}" is already in use.`);
		this.name = "SubdomainAlreadyInUseError";
	}
}

export class TenantNotFoundError extends Error {
	constructor() {
		super("Tenant não encontrado");
		this.name = "TenantNotFoundError";
	}
}

export class UnauthorizedTenantAccessError extends Error {
	constructor() {
		super("Acesso não autorizado a este tenant");
		this.name = "UnauthorizedTenantAccessError";
	}
}

export class CrossTenantOperationError extends Error {
	constructor() {
		super("Não é permitido acessar dados de outro tenant");
		this.name = "CrossTenantOperationError";
	}
}

export class CannotAssignOwnerRoleError extends Error {
	constructor() {
		super(
			'Cannot assign "owner" role through this operation. Owners are assigned only during tenant creation.',
		);
		this.name = "CannotAssignOwnerRoleError";
	}
}

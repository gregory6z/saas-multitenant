import type { Tenant } from "@/core/entities/Tenant.js";
import { left, right, type Either } from "@/core/either.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
	SubdomainAlreadyInUseError,
} from "../errors/tenant.errors.ts";

interface SetTenantSubdomainRequest {
	tenantId: string;
	subdomain: string;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface SetTenantSubdomainResponse {
	tenant: Tenant;
}

type SetTenantSubdomainResult = Either<
	| TenantNotFoundError
	| UnauthorizedTenantAccessError
	| CrossTenantOperationError
	| SubdomainAlreadyInUseError,
	SetTenantSubdomainResponse
>;

export class SetTenantSubdomainUseCase {
	constructor(
		private tenantsRepository: TenantsRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		tenantId,
		subdomain,
		currentUserId,
		currentUserRole,
		currentUserTenantId,
	}: SetTenantSubdomainRequest): Promise<SetTenantSubdomainResult> {
		// Verificar se o tenant existe
		const tenant = await this.tenantsRepository.findById(tenantId);

		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		// Verificar se o usuário está tentando atualizar seu próprio tenant
		if (tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		// Verificar se o usuário tem permissão específica para alterar subdomínio
		const changeSubdomainPermissionCheck =
			await this.checkPermissionUseCase.execute({
				userRole: currentUserRole,
				permission: PERMISSIONS.TENANT_CHANGE_SUBDOMAIN,
				userId: currentUserId,
				tenantId: currentUserTenantId,
			});

		if (changeSubdomainPermissionCheck.isLeft()) {
			return left(new UnauthorizedTenantAccessError());
		}

		// Verificar se o subdomínio já está em uso por outro tenant
		if (subdomain !== tenant.subdomain) {
			const tenantWithSameSubdomain =
				await this.tenantsRepository.findBySubdomain(subdomain);

			if (tenantWithSameSubdomain && tenantWithSameSubdomain.id !== tenantId) {
				return left(new SubdomainAlreadyInUseError(subdomain));
			}
		}

		// Atualizar o subdomínio do tenant
		const updatedTenant = await this.tenantsRepository.update(tenantId, {
			subdomain,
		});

		if (!updatedTenant) {
			return left(new TenantNotFoundError());
		}

		return right({
			tenant: updatedTenant,
		});
	}
}

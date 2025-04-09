import { left, right, type Either } from "@/core/either.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
} from "../errors/tenant.errors.ts";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.ts";

interface GetTenantRequest {
	tenantId: string;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface GetTenantResponse {
	tenant: {
		id: string;
		name: string;
		domain: string;
		isActive: boolean;
		createdAt: Date;
		updatedAt: Date;
	};
}

type GetTenantResult = Either<
	| TenantNotFoundError
	| UnauthorizedTenantAccessError
	| CrossTenantOperationError,
	GetTenantResponse
>;

export class GetTenantUseCase {
	constructor(
		private tenantsRepository: TenantsRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		tenantId,
		currentUserId,
		currentUserRole,
		currentUserTenantId,
	}: GetTenantRequest): Promise<GetTenantResult> {
		const tenant = await this.tenantsRepository.findById(tenantId);

		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		if (tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		const viewPermissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.TENANT_VIEW,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (viewPermissionCheck.isLeft()) {
			return left(new UnauthorizedTenantAccessError());
		}

		return right({
			tenant: {
				id: tenant.id,
				name: tenant.name,
				domain: tenant.subdomain,
				isActive: tenant.status === "active",
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
			},
		});
	}
}

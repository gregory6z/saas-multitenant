import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import type { UserTenantRolesRepository } from "@/repositories/interfaces/user-tenant-roles-repository.interfaces.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	CrossTenantOperationError,
} from "@/modules/account/errors/account.errors.ts";
import {
	CannotRemoveOwnerError,
	CannotRemoveSelfError,
	TenantNotFoundError,
	UserNotInTenantError,
} from "@/modules/tenant/errors/tenant.errors.ts";

interface RemoveUserFromTenantRequest {
	userId: string;
	tenantId: string;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface RemoveUserFromTenantResponse {
	success: true;
}

type RemoveUserFromTenantError =
	| UserNotFoundError
	| TenantNotFoundError
	| UnauthorizedOperationError
	| UserNotInTenantError
	| CannotRemoveOwnerError
	| CannotRemoveSelfError;

type RemoveUserFromTenantResult = Either<
	RemoveUserFromTenantError,
	RemoveUserFromTenantResponse
>;

export class RemoveUserFromTenantUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private tenantsRepository: TenantsRepository,
		private userTenantRolesRepository: UserTenantRolesRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		userId,
		tenantId,
		currentUserId,
		currentUserRole,
		currentUserTenantId,
	}: RemoveUserFromTenantRequest): Promise<RemoveUserFromTenantResult> {
		// Verificar se o usuário atual tem permissão para remover usuários do tenant
		const permissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.TENANT_REMOVE_USERS,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (permissionCheck.isLeft()) {
			return left(new UnauthorizedOperationError());
		}

		if (tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		const tenant = await this.tenantsRepository.findById(tenantId);
		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		const user = await this.usersRepository.findById(userId);
		if (!user) {
			return left(new UserNotFoundError());
		}

		const membership = await this.userTenantRolesRepository.findByUserAndTenant(
			userId,
			tenantId,
		);

		if (!membership) {
			return left(new UserNotInTenantError(userId, tenantId));
		}

		if (membership.role === "owner") {
			return left(new CannotRemoveOwnerError());
		}

		if (userId === currentUserId) {
			return left(new CannotRemoveSelfError());
		}

		await this.userTenantRolesRepository.delete(membership.id);

		return right({ success: true });
	}
}

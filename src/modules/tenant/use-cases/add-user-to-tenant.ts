import { left, right, type Either } from "@/core/either.js";
import type { User } from "@/core/entities/User.js";
import type {
	UserTenantRole,
	UserRole,
} from "@/core/entities/UserTenantRole.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import type { UserTenantRolesRepository } from "@/repositories/interfaces/user-tenant-roles-repository.interfaces.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	UserAlreadyInTenantError,
	InvalidRoleError,
} from "@/modules/account/errors/account.errors.ts";
import {
	CannotAssignOwnerRoleError,
	TenantNotFoundError,
} from "@/modules/tenant/errors/tenant.errors.ts";

interface AddUserToTenantRequest {
	userId: string;
	targetTenantId: string;
	role: UserRole;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface AddUserToTenantResponse {
	user: User;
	membership: UserTenantRole;
}

type AddUserToTenantError =
	| UserNotFoundError
	| TenantNotFoundError
	| UnauthorizedOperationError
	| UserAlreadyInTenantError
	| InvalidRoleError
	| CannotAssignOwnerRoleError;

type AddUserToTenantResult = Either<
	AddUserToTenantError,
	AddUserToTenantResponse
>;

export class AddUserToTenantUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private tenantsRepository: TenantsRepository,
		private userTenantRolesRepository: UserTenantRolesRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		userId,
		targetTenantId,
		role,
		currentUserId,
		currentUserRole,
		currentUserTenantId,
	}: AddUserToTenantRequest): Promise<AddUserToTenantResult> {
		const permissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.TENANT_ADD_USERS,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (permissionCheck.isLeft()) {
			return left(new UnauthorizedOperationError());
		}

		if (role === "owner") {
			return left(new CannotAssignOwnerRoleError());
		}

		const validRoles: UserRole[] = ["admin", "curator", "user"];
		if (!validRoles.includes(role)) {
			return left(new InvalidRoleError(role));
		}

		const user = await this.usersRepository.findById(userId);
		if (!user) {
			return left(new UserNotFoundError());
		}

		const tenant = await this.tenantsRepository.findById(targetTenantId);
		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		const existingMembership =
			await this.userTenantRolesRepository.findByUserAndTenant(
				userId,
				targetTenantId,
			);

		if (existingMembership) {
			return left(new UserAlreadyInTenantError(userId, targetTenantId));
		}

		const membership = await this.userTenantRolesRepository.create({
			userId,
			tenantId: targetTenantId,
			role,
		});

		return right({
			user,
			membership,
		});
	}
}

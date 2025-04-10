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
} from "../errors/account.errors.ts";
import { TenantNotFoundError } from "@/modules/tenant/errors/tenant.errors.ts";

interface AssignUserToTenantRequest {
	userId: string;
	targetTenantId: string;
	role: UserRole;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface AssignUserToTenantResponse {
	user: User;
	membership: UserTenantRole;
}

type AssignUserToTenantError =
	| UserNotFoundError
	| TenantNotFoundError
	| UnauthorizedOperationError
	| UserAlreadyInTenantError
	| InvalidRoleError;

type AssignUserToTenantResult = Either<
	AssignUserToTenantError,
	AssignUserToTenantResponse
>;

export class AssignUserToTenantUseCase {
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
	}: AssignUserToTenantRequest): Promise<AssignUserToTenantResult> {
		// Verificar se o usuário atual tem permissão para adicionar usuários ao tenant
		const permissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.TENANT_ASSIGN_USERS,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (permissionCheck.isLeft()) {
			return left(new UnauthorizedOperationError());
		}

		// Verificar se a role é válida
		const validRoles: UserRole[] = ["owner", "admin", "curator", "user"];
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

		// Verificar se o usuário já está associado ao tenant
		const existingMembership =
			await this.userTenantRolesRepository.findByUserAndTenant(
				userId,
				targetTenantId,
			);

		if (existingMembership) {
			return left(new UserAlreadyInTenantError(userId, targetTenantId));
		}

		// Criar a associação entre usuário e tenant
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

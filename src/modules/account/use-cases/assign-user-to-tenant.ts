// import { left, right, type Either } from "@/core/either.js";
// import type { User } from "@/core/entities/User.js";
// import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
// import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
// import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
// import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
// import {
// 	UserNotFoundError,
// 	UnauthorizedOperationError,
// 	EmailAlreadyInUseError,
// } from "../errors/account.errors.ts";
// import { TenantNotFoundError } from "@/modules/tenant/errors/tenant.errors.ts";

// interface AssignUserToTenantRequest {
// 	email: string;
// 	targetTenantId: string;
// 	role?: "admin" | "curator" | "user";
// 	currentUserId: string;
// 	currentUserRole: string;
// 	currentUserTenantId: string;
// }

// interface AssignUserToTenantResponse {
// 	user: User;
// }

// type AssignUserToTenantError =
// 	| UserNotFoundError
// 	| TenantNotFoundError
// 	| UnauthorizedOperationError
// 	| EmailAlreadyInUseError;

// type AssignUserToTenantResult = Either<
// 	AssignUserToTenantError,
// 	AssignUserToTenantResponse
// >;

// export class AssignUserToTenantUseCase {
// 	constructor(
// 		private usersRepository: UsersRepository,
// 		private tenantsRepository: TenantsRepository,
// 		private checkPermissionUseCase: CheckPermissionUseCase,
// 	) {}

// 	async execute({
// 		email,
// 		targetTenantId,
// 		role = "user",
// 		currentUserId,
// 		currentUserRole,
// 		currentUserTenantId,
// 	}: AssignUserToTenantRequest): Promise<AssignUserToTenantResult> {
// 		// Verificar se o usuário atual tem permissão para adicionar usuários ao tenant
// 		const permissionCheck = await this.checkPermissionUseCase.execute({
// 			userRole: currentUserRole,
// 			permission: PERMISSIONS.TENANT_ASSIGN_USERS,
// 			userId: currentUserId,
// 			tenantId: currentUserTenantId,
// 		});

// 		if (permissionCheck.isLeft()) {
// 			return left(new UnauthorizedOperationError());
// 		}

// 		// Verificar se o tenant existe
// 		const tenant = await this.tenantsRepository.findById(targetTenantId);
// 		if (!tenant) {
// 			return left(new TenantNotFoundError());
// 		}

// 		// Verificar se o usuário já existe no tenant alvo
// 		const existingUserInTenant = await this.usersRepository.findByEmail(
// 			email,
// 			targetTenantId,
// 		);

// 		if (existingUserInTenant) {
// 			return left(new EmailAlreadyInUseError(email));
// 		}

// 		// Buscar o usuário em qualquer tenant para obter suas informações básicas
// 		// Isso é necessário porque precisamos de informações como passwordHash
// 		const existingUser =
// 			await this.usersRepository.findByEmailInAnyTenant(email);

// 		if (!existingUser) {
// 			return left(new UserNotFoundError());
// 		}

// 		// Criar uma nova entrada para o usuário no tenant de destino
// 		const assignedUser = await this.usersRepository.create({
// 			name: existingUser.name,
// 			email: existingUser.email,
// 			passwordHash: existingUser.passwordHash,
// 			tenantId: targetTenantId,
// 			role: role,
// 			emailVerification: {
// 				token: null,
// 				expiresAt: null,
// 				verified: true,
// 				verifiedAt: new Date(),
// 			},
// 		});

// 		return right({
// 			user: assignedUser,
// 		});
// 	}
// }

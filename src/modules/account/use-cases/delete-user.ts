import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	CrossTenantOperationError,
} from "../errors/account.errors.ts";

interface DeleteUserRequest {
	userId: string;
	currentUserRole: string;
	currentUserId: string;
	currentUserTenantId: string;
}

interface DeleteUserResponse {
	success: true;
}

type DeleteUserResult = Either<
	UnauthorizedOperationError | UserNotFoundError | CrossTenantOperationError,
	DeleteUserResponse
>;

export class DeleteUserUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		userId,
		currentUserRole,
		currentUserId,
		currentUserTenantId,
	}: DeleteUserRequest): Promise<DeleteUserResult> {
		// Verificar se o usuário existe
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		// Verificar se o usuário pertence ao mesmo tenant
		if (user.tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		// Caso especial: usuários podem excluir suas próprias contas
		if (userId === currentUserId) {
			await this.usersRepository.delete(userId);
			return right({ success: true });
		}

		// Verificar permissão básica para excluir usuários
		const deletePermissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.USERS_DELETE,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (deletePermissionCheck.isLeft()) {
			return left(new UnauthorizedOperationError());
		}

		// Caso especial: verificar permissão especial para excluir admins
		if (user.role === "admin" || user.role === "owner") {
			const deleteAdminCheck = await this.checkPermissionUseCase.execute({
				userRole: currentUserRole,
				permission: PERMISSIONS.USERS_DELETE_ADMIN,
				userId: currentUserId,
				tenantId: currentUserTenantId,
			});

			if (deleteAdminCheck.isLeft()) {
				return left(new UnauthorizedOperationError());
			}
		}

		// Excluir o usuário
		await this.usersRepository.delete(userId);

		return right({ success: true });
	}
}

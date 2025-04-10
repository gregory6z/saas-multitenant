import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import type { UserTenantRolesRepository } from "@/repositories/interfaces/user-tenant-roles-repository.interfaces.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
} from "../errors/account.errors.ts";

interface DeleteUserRequest {
	userId: string;
	currentUserId: string;
}

interface DeleteUserResponse {
	success: true;
}

type DeleteUserResult = Either<
	UnauthorizedOperationError | UserNotFoundError,
	DeleteUserResponse
>;

export class DeleteUserUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private userTenantRolesRepository: UserTenantRolesRepository,
	) {}

	async execute({
		userId,
		currentUserId,
	}: DeleteUserRequest): Promise<DeleteUserResult> {
		// Verificar se o usuário existe
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		// Verificar se o usuário está tentando excluir sua própria conta
		if (userId !== currentUserId) {
			return left(new UnauthorizedOperationError());
		}

		// Remover todas as associações do usuário com tenants
		await this.userTenantRolesRepository.deleteByUser(userId);

		// Excluir o usuário
		await this.usersRepository.delete(userId);

		return right({ success: true });
	}
}

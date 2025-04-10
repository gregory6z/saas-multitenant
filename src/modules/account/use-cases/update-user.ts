import type { UpdateUserDTO, User } from "@/core/entities/User.js";
import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import {
	EmailAlreadyInUseError,
	UserNotFoundError,
	UnauthorizedOperationError,
} from "../errors/account.errors.ts";

interface UpdateUserRequest {
	userId: string;
	name?: string;
	email?: string;
	currentUserId: string;
	currentUserTenantId: string;
}

interface UpdateUserResponse {
	user: User;
}

type UpdateUserError =
	| EmailAlreadyInUseError
	| UserNotFoundError
	| UnauthorizedOperationError;

type UpdateUserResult = Either<UpdateUserError, UpdateUserResponse>;

export class UpdateUserUseCase {
	constructor(private usersRepository: UsersRepository) {}

	async execute({
		userId,
		name,
		email,
		currentUserId,
		currentUserTenantId,
	}: UpdateUserRequest): Promise<UpdateUserResult> {
		// Verificar se o usuário existe
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		// Verificar se o usuário está tentando alterar suas próprias informações
		if (userId !== currentUserId) {
			return left(new UnauthorizedOperationError());
		}

		// Verificar se o email já está em uso
		if (email && email !== user.email) {
			const userWithSameEmail = await this.usersRepository.findByEmail(email);

			if (userWithSameEmail && userWithSameEmail.id !== userId) {
				return left(new EmailAlreadyInUseError(email));
			}
		}

		// Preparar dados para atualização
		const updateData: UpdateUserDTO = {};

		if (name !== undefined) updateData.name = name;
		if (email !== undefined) updateData.email = email;

		if (Object.keys(updateData).length === 0) {
			return right({ user });
		}

		// Atualizar o usuário
		const updatedUser = await this.usersRepository.update(userId, updateData);

		if (!updatedUser) {
			return left(new UserNotFoundError());
		}

		return right({
			user: updatedUser,
		});
	}
}

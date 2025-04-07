import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	CrossTenantOperationError,
} from "../errors/account.errors.ts";

interface DeleteUserRequest {
	userId: string;
	currentUserRole: "admin" | "manager" | "user";
	currentUserId: string;
	currentUserTenantId: string;
}

interface DeleteUserResponse {
	success: boolean;
}

type DeleteUserError =
	| UserNotFoundError
	| UnauthorizedOperationError
	| CrossTenantOperationError;

type DeleteUserResult = Either<DeleteUserError, DeleteUserResponse>;

export class DeleteUserUseCase {
	constructor(private usersRepository: UsersRepository) {}

	async execute({
		userId,
		currentUserRole,
		currentUserId,
		currentUserTenantId,
	}: DeleteUserRequest): Promise<DeleteUserResult> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		if (user.tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		if (currentUserId === userId) {
			await this.usersRepository.delete(userId);
			return right({ success: true });
		}

		if (currentUserRole !== "admin") {
			return left(new UnauthorizedOperationError());
		}

		if (user.role === "admin") {
			return left(new UnauthorizedOperationError());
		}

		await this.usersRepository.delete(userId);

		return right({
			success: true,
		});
	}
}

import type { User } from "@/core/entities/User.js";
import { left, right, type Either } from "@/core/either.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import {
	CrossTenantOperationError,
	UserNotFoundError,
} from "../errors/account.errors.ts";

interface GetUserRequest {
	userId: string;
	tenantId: string;
}

interface GetUserResponse {
	user: User;
}

type GetUserResult = Either<
	CrossTenantOperationError | UserNotFoundError,
	GetUserResponse
>;

export class GetUserUseCase {
	constructor(private usersRepository: UsersRepository) {}

	async execute({ userId, tenantId }: GetUserRequest): Promise<GetUserResult> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		if (user.tenantId !== tenantId) {
			return left(new CrossTenantOperationError());
		}

		return right({
			user,
		});
	}
}

import type { UpdateUserDTO, User } from "@/core/entities/User.js";
import { left, right, type Either } from "@/core/either.js";
import type { HashProvider } from "@/providers/hash/hash-provider.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import {
	EmailAlreadyInUseError,
	UserNotFoundError,
	UnauthorizedRoleChangeError,
} from "../errors/account.errors.ts";

interface UpdateUserRequest {
	userId: string;
	tenantId: string;
	name?: string;
	email?: string;
	password?: string;
	role?: "admin" | "manager" | "user";
	currentUserRole: "admin" | "manager" | "user";
}

interface UpdateUserResponse {
	user: User;
}

type UpdateUserError =
	| EmailAlreadyInUseError
	| UserNotFoundError
	| UnauthorizedRoleChangeError;

type UpdateUserResult = Either<UpdateUserError, UpdateUserResponse>;

export class UpdateUserUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private hashProvider: HashProvider,
	) {}

	async execute({
		userId,
		tenantId,
		name,
		email,
		password,
		role,
		currentUserRole,
	}: UpdateUserRequest): Promise<UpdateUserResult> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			return left(new UserNotFoundError());
		}

		if (email && email !== user.email) {
			const userWithSameEmail = await this.usersRepository.findByEmail(
				email,
				tenantId,
			);

			if (userWithSameEmail && userWithSameEmail.id !== userId) {
				return left(new EmailAlreadyInUseError(email));
			}
		}

		if (role && role !== user.role) {
			if (currentUserRole !== "admin") {
				return left(new UnauthorizedRoleChangeError());
			}
		}

		const updateData: UpdateUserDTO = {};

		if (name !== undefined) updateData.name = name;
		if (email !== undefined) updateData.email = email;
		if (role !== undefined) updateData.role = role;

		if (password) {
			updateData.passwordHash = await this.hashProvider.generateHash(password);
		}

		if (Object.keys(updateData).length === 0) {
			return right({ user });
		}

		const updatedUser = await this.usersRepository.update(
			userId,
			tenantId,
			updateData,
		);

		if (!updatedUser) {
			return left(new UserNotFoundError());
		}

		return right({
			user: updatedUser,
		});
	}
}

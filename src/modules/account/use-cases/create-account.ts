import type { User } from "@/core/entities/User.js";
import { left, right, type Either } from "@/core/either.js";
import type { HashProvider } from "@/providers/hash/hash-provider.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import { EmailAlreadyInUseError } from "../errors/account.errors.ts";

interface CreateAccountRequest {
	name: string;
	email: string;
	password: string;
	tenantId: string;
	role?: "admin" | "manager" | "user";
}

interface CreateAccountResponse {
	user: User;
}

type CreateAccountResult = Either<
	EmailAlreadyInUseError,
	CreateAccountResponse
>;

export class CreateAccountUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private hashProvider: HashProvider,
	) {}

	async execute({
		name,
		email,
		password,
		tenantId,
		role = "user",
	}: CreateAccountRequest): Promise<CreateAccountResult> {
		const userWithSameEmail = await this.usersRepository.findByEmail(
			email,
			tenantId,
		);

		if (userWithSameEmail) {
			return left(new EmailAlreadyInUseError(email));
		}

		const passwordHash = await this.hashProvider.generateHash(password);

		const user = await this.usersRepository.create({
			name,
			email,
			passwordHash,
			tenantId,
			role,
		});

		return right({
			user,
		});
	}
}

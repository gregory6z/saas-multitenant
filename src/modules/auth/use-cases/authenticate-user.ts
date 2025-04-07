import { left, right, type Either } from "@/core/either.ts";
import { InvalidCredentialsError } from "../errors/auth.errors.ts";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.ts";
import type { HashProvider } from "@/providers/hash/hash-provider.ts";
import type { TokenProvider } from "@/providers/token/token-provider.ts";

interface AuthenticateUserRequest {
	email: string;
	password: string;
	tenantId: string;
}

type AuthenticateUserResponse = {
	token: string;
};

type AuthenticateUserResult = Either<
	InvalidCredentialsError,
	AuthenticateUserResponse
>;

export class AuthenticateUserUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private hashProvider: HashProvider,
		private tokenProvider: TokenProvider,
	) {}

	async execute({
		email,
		password,
		tenantId,
	}: AuthenticateUserRequest): Promise<AuthenticateUserResult> {
		const user = await this.usersRepository.findByEmail(email, tenantId);

		if (!user) {
			return left(new InvalidCredentialsError());
		}

		const passwordMatches = await this.hashProvider.compareHash(
			password,
			user.passwordHash,
		);

		if (!passwordMatches) {
			return left(new InvalidCredentialsError());
		}

		const token = await this.tokenProvider.generateToken({
			userId: user.id,
			tenantId: user.tenantId,
			role: user.role,
		});

		return right({
			token,
		});
	}
}

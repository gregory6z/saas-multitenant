import { type Either, left, right } from "@/core/either.ts";
import type { HashProvider } from "@/providers/hash/hash-provider.ts";
import type { TokenProvider } from "@/providers/token/token-provider.ts";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.ts";
import { InvalidCredentialsError } from "../errors/auth.errors.ts";
import { randomUUID } from "node:crypto";

interface AuthenticateUserRequest {
	email: string;
	password: string;
}

type AuthenticateUserResponse = {
	token: string;
	refreshToken: string;
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
	}: AuthenticateUserRequest): Promise<AuthenticateUserResult> {
		const user = await this.usersRepository.findByEmailAcrossTenants(email);

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

		const tokenFamily = randomUUID();

		const refreshToken = await this.tokenProvider.generateRefreshToken({
			userId: user.id,
			family: tokenFamily,
		});

		return right({
			token,
			refreshToken,
		});
	}
}

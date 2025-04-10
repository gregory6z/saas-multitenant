import { type Either, left, right } from "@/core/either.ts";
import type { TokenProvider } from "@/providers/token/token-provider.ts";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.ts";
import {
	InvalidTokenError,
	InvalidRefreshTokenError,
	TokenExpiredError,
} from "../errors/auth.errors.ts";

interface RefreshTokenRequest {
	refreshToken: string;
}

type RefreshTokenResponse = {
	token: string;
	refreshToken: string;
};

type RefreshTokenResult = Either<
	InvalidRefreshTokenError | InvalidTokenError | TokenExpiredError,
	RefreshTokenResponse
>;

export class RefreshTokenUseCase {
	constructor(
		private usersRepository: UsersRepository,
		private tokenProvider: TokenProvider,
	) {}

	async execute({
		refreshToken,
	}: RefreshTokenRequest): Promise<RefreshTokenResult> {
		try {
			// Verificar se o refresh token é válido
			const payload = await this.tokenProvider.verifyRefreshToken(refreshToken);

			// Buscar o usuário
			const user = await this.usersRepository.findById(payload.userId);

			if (!user) {
				return left(new InvalidRefreshTokenError());
			}

			// Gerar novo token de acesso
			const token = await this.tokenProvider.generateToken({
				userId: user.id,
			});

			const newRefreshToken = await this.tokenProvider.generateRefreshToken({
				userId: user.id,
				family: payload.family,
			});

			return right({
				token,
				refreshToken: newRefreshToken,
			});
		} catch (error) {
			if (error instanceof TokenExpiredError) {
				return left(new TokenExpiredError());
			}

			if (error instanceof InvalidRefreshTokenError) {
				return left(error);
			}

			return left(new InvalidTokenError());
		}
	}
}

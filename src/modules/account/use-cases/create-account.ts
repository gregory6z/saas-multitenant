import type { User } from "@/core/entities/User.js";
import { left, right, type Either } from "@/core/either.js";
import type { HashProvider } from "@/providers/hash/hash-provider.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import { EmailAlreadyInUseError } from "../errors/account.errors.ts";
import { randomUUID } from "node:crypto";
import { DomainEvents } from "@/core/events/domain-events.js";
import { UserCreatedEvent } from "../events/user-created-event.ts";

interface CreateAccountRequest {
	name: string;
	email: string;
	password: string;
	tenantId: string;
	role?: "admin" | "curator" | "user";
	generateVerificationToken?: boolean;
}

interface CreateAccountResponse {
	user: User;
	verificationToken?: string;
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
		generateVerificationToken = true,
	}: CreateAccountRequest): Promise<CreateAccountResult> {
		const userWithSameEmail = await this.usersRepository.findByEmail(
			email,
			tenantId,
		);

		if (userWithSameEmail) {
			return left(new EmailAlreadyInUseError(email));
		}

		const passwordHash = await this.hashProvider.generateHash(password);

		const verificationToken = generateVerificationToken ? randomUUID() : null;
		const expiresAt = verificationToken
			? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
			: null;

		const user = await this.usersRepository.create({
			name,
			email,
			passwordHash,
			tenantId,
			role,
			emailVerification: {
				token: verificationToken,
				expiresAt,
				verified: false,
				verifiedAt: null,
			},
		});

		if (verificationToken) {
			DomainEvents.markEvent(
				new UserCreatedEvent({
					userId: user.id,
					email: user.email,
					name: user.name,
					verificationToken,
				}),
			);
		}

		return right({
			user,
			verificationToken: verificationToken || undefined,
		});
	}
}

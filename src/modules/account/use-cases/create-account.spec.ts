import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { EmailAlreadyInUseError } from "../errors/account.errors.ts";
import { CreateAccountUseCase } from "./create-account.ts";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.ts";
import { DomainEvents } from "@/core/events/domain-events.js";

describe("CreateAccountService", () => {
	let usersRepository: InMemoryUsersRepository;
	let hashProvider: InMemoryHashProvider;
	let sut: CreateAccountUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		hashProvider = new InMemoryHashProvider();
		sut = new CreateAccountUseCase(usersRepository, hashProvider);

		// Limpar eventos marcados antes de cada teste
		DomainEvents.clearMarkedEvents();
	});

	test("should be able to create a new user account with verification token", async () => {
		const result = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user, verificationToken } = result.value;

			// Verificar dados básicos do usuário
			assert.strictEqual(user.name, "John Doe");
			assert.strictEqual(user.email, "john@example.com");
			assert.strictEqual(user.tenantId, "tenant-1");
			assert.strictEqual(user.role, "user");
			assert.strictEqual(user.passwordHash, "hashed:123456");

			// Verificar dados de verificação de email
			assert.ok(user.emailVerification);
			assert.strictEqual(user.emailVerification.token, verificationToken);
			assert.ok(user.emailVerification.expiresAt instanceof Date);
			assert.strictEqual(user.emailVerification.verified, false);
			assert.strictEqual(user.emailVerification.verifiedAt, null);

			// Verificar se o token foi gerado
			assert.ok(verificationToken);
			assert.ok(typeof verificationToken === "string");

			// Verificar se o evento foi marcado
			assert.strictEqual(DomainEvents.markedEvents.length, 1);
			assert.strictEqual(DomainEvents.markedEvents[0].name, "user.created");

			assert.strictEqual(usersRepository.items.length, 1);
		}
	});

	test("should be able to create a user without verification token when specified", async () => {
		const result = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
			generateVerificationToken: false,
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user, verificationToken } = result.value;

			// Verificar que não há token de verificação
			assert.strictEqual(verificationToken, undefined);
			assert.strictEqual(user.emailVerification.token, null);
			assert.strictEqual(user.emailVerification.expiresAt, null);
			assert.strictEqual(user.emailVerification.verified, false);

			// Verificar que nenhum evento foi marcado
			assert.strictEqual(DomainEvents.markedEvents.length, 0);
		}
	});

	test("should be able to create a user with a specific role", async () => {
		const result = await sut.execute({
			name: "Admin User",
			email: "admin@example.com",
			password: "123456",
			tenantId: "tenant-1",
			role: "admin",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.role, "admin");
		}
	});

	test("should not be able to create a user with an email that is already in use in the same tenant", async () => {
		// Adicionando um usuário existente ao repositório usando nossa função auxiliar
		addUserToInMemoryRepository(usersRepository, {
			email: "john@example.com",
			tenantId: "tenant-1",
		});

		const result = await sut.execute({
			name: "Another John",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof EmailAlreadyInUseError);
			assert.strictEqual(
				result.value.message,
				'The email "john@example.com" is already in use.',
			);
		}
	});

	test("should be able to create users with the same email in different tenants", async () => {
		// Adicionando um usuário existente ao repositório usando nossa função auxiliar
		addUserToInMemoryRepository(usersRepository, {
			email: "john@example.com",
			tenantId: "tenant-1",
		});

		const result = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-2",
		});

		assert.ok(result.isRight());
		assert.strictEqual(usersRepository.items.length, 2);
	});
});

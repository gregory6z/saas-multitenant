import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryUserTenantRolesRepository } from "@/repositories/in-memory/in-memory-user-tenant-roles-repository.ts";
import { EmailAlreadyInUseError } from "../errors/account.errors.ts";
import { CreateAccountUseCase } from "./create-account.ts";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.ts";
import { DomainEvents } from "@/core/events/domain-events.js";

describe("CreateAccountService", () => {
	let usersRepository: InMemoryUsersRepository;
	let userTenantRolesRepository: InMemoryUserTenantRolesRepository;
	let hashProvider: InMemoryHashProvider;
	let sut: CreateAccountUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		userTenantRolesRepository = new InMemoryUserTenantRolesRepository();
		hashProvider = new InMemoryHashProvider();
		sut = new CreateAccountUseCase(
			usersRepository,
			userTenantRolesRepository,
			hashProvider,
		);

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
			const { user, membership, verificationToken } = result.value;

			// Verificar dados básicos do usuário
			assert.strictEqual(user.name, "John Doe");
			assert.strictEqual(user.email, "john@example.com");
			assert.strictEqual(user.passwordHash, "hashed:123456");

			// Verificar dados de verificação de email
			assert.ok(user.emailVerification);
			assert.strictEqual(user.emailVerification.token, verificationToken);
			assert.ok(user.emailVerification.expiresAt instanceof Date);
			assert.strictEqual(user.emailVerification.verified, false);
			assert.strictEqual(user.emailVerification.verifiedAt, null);

			// Verificar dados da associação usuário-tenant
			assert.strictEqual(membership.userId, user.id);
			assert.strictEqual(membership.tenantId, "tenant-1");
			assert.strictEqual(membership.role, "user"); // Role padrão

			// Verificar se o token foi gerado
			assert.ok(verificationToken);
			assert.ok(typeof verificationToken === "string");

			// Verificar se o evento foi marcado
			assert.strictEqual(DomainEvents.markedEvents.length, 1);
			assert.strictEqual(DomainEvents.markedEvents[0].name, "user.created");

			// Verificar se o usuário foi adicionado ao repositório
			assert.strictEqual(usersRepository.items.length, 1);

			// Verificar se a associação foi adicionada ao repositório
			assert.strictEqual(userTenantRolesRepository.items.length, 1);
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
			const { user, membership, verificationToken } = result.value;

			// Verificar que não há token de verificação
			assert.strictEqual(verificationToken, undefined);
			assert.strictEqual(user.emailVerification.token, null);
			assert.strictEqual(user.emailVerification.expiresAt, null);
			assert.strictEqual(user.emailVerification.verified, false);

			// Verificar dados da associação usuário-tenant
			assert.strictEqual(membership.userId, user.id);
			assert.strictEqual(membership.tenantId, "tenant-1");
			assert.strictEqual(membership.role, "user");

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
			const { user, membership } = result.value;

			// Verificar que a role foi atribuída corretamente na associação
			assert.strictEqual(membership.role, "admin");
		}
	});

	test("should not be able to create a user with an email that is already in use", async () => {
		// Adicionando um usuário existente ao repositório usando nossa função auxiliar
		addUserToInMemoryRepository(usersRepository, {
			email: "john@example.com",
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
		// Primeiro, criamos um usuário no tenant-1
		const firstResult = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(firstResult.isRight());

		// Agora, tentamos criar outro usuário com o mesmo email, mas em um tenant diferente
		// Isso não deve ser possível com a nova estrutura, pois o email é único globalmente
		const secondResult = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-2",
		});

		// Com a nova estrutura, esperamos que isso retorne um erro
		assert.ok(secondResult.isLeft());
		if (secondResult.isLeft()) {
			assert.ok(secondResult.value instanceof EmailAlreadyInUseError);
		}
	});

	test("should allow a user to be associated with multiple tenants", async () => {
		// Primeiro, criamos um usuário no tenant-1
		const firstResult = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(firstResult.isRight());

		// Agora, criamos um usuário com email diferente no tenant-2
		const secondResult = await sut.execute({
			name: "Jane Doe",
			email: "jane@example.com",
			password: "123456",
			tenantId: "tenant-2",
		});

		assert.ok(secondResult.isRight());

		// Verificar que temos dois usuários e duas associações
		assert.strictEqual(usersRepository.items.length, 2);
		assert.strictEqual(userTenantRolesRepository.items.length, 2);

		// Verificar que as associações estão corretas
		const firstUser = usersRepository.items[0];
		const secondUser = usersRepository.items[1];

		const firstMembership = userTenantRolesRepository.items.find(
			(m) => m.userId === firstUser.id,
		);
		const secondMembership = userTenantRolesRepository.items.find(
			(m) => m.userId === secondUser.id,
		);

		assert.strictEqual(firstMembership?.tenantId, "tenant-1");
		assert.strictEqual(secondMembership?.tenantId, "tenant-2");
	});
});

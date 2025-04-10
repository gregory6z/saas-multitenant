import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.js";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryUserTenantRolesRepository } from "@/repositories/in-memory/in-memory-user-tenant-roles-repository.js";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.ts";
import { DomainEvents } from "@/core/events/domain-events.js";
import { SubdomainAlreadyInUseError } from "../errors/tenant.errors.ts";
import { UserNotFoundError } from "@/modules/account/errors/account.errors.ts";
import { CreateTenantUseCase } from "@/modules/tenant/use-cases/create-tenant.ts";

describe("CreateTenantUseCase", () => {
	let tenantsRepository: InMemoryTenantsRepository;
	let usersRepository: InMemoryUsersRepository;
	let userTenantRolesRepository: InMemoryUserTenantRolesRepository;
	let sut: CreateTenantUseCase;
	let ownerId: string;

	beforeEach(async () => {
		tenantsRepository = new InMemoryTenantsRepository();
		usersRepository = new InMemoryUsersRepository();
		userTenantRolesRepository = new InMemoryUserTenantRolesRepository();
		sut = new CreateTenantUseCase(
			tenantsRepository,
			usersRepository,
			userTenantRolesRepository,
		);

		// Limpar eventos marcados antes de cada teste
		DomainEvents.clearMarkedEvents();

		// Criar um usuário para ser o proprietário do tenant
		const owner = await createUserInRepository(usersRepository, {
			name: "Owner User",
			email: "owner@example.com",
		});

		ownerId = owner.id;
	});

	test("should be able to create a new tenant", async () => {
		const result = await sut.execute({
			name: "Test Organization",
			subdomain: "test-org",
			ownerId,
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant } = result.value;

			// Verificar dados básicos do tenant
			assert.strictEqual(tenant.name, "Test Organization");
			assert.strictEqual(tenant.subdomain, "test-org");
			assert.strictEqual(tenant.ownerId, ownerId);
			assert.strictEqual(tenant.status, "active");
			assert.strictEqual(tenant.ragflowId, undefined);

			// Verificar se o evento foi marcado
			assert.strictEqual(DomainEvents.markedEvents.length, 1);
			assert.strictEqual(DomainEvents.markedEvents[0].name, "tenant.created");

			// Verificar se o tenant foi criado no repositório
			assert.strictEqual(tenantsRepository.items.length, 1);

			// Verificar se a associação entre o proprietário e o tenant foi criada
			const userTenantRoles = userTenantRolesRepository.items;
			assert.strictEqual(userTenantRoles.length, 1);
			assert.strictEqual(userTenantRoles[0].userId, ownerId);
			assert.strictEqual(userTenantRoles[0].tenantId, tenant.id);
			assert.strictEqual(userTenantRoles[0].role, "owner");
		}
	});

	test("should be able to create a tenant with a specific status", async () => {
		const result = await sut.execute({
			name: "Inactive Organization",
			subdomain: "inactive-org",
			ownerId,
			status: "inactive",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant } = result.value;
			assert.strictEqual(tenant.status, "inactive");

			// Verificar a associação do proprietário
			const userTenantRoles = userTenantRolesRepository.items;
			assert.strictEqual(userTenantRoles.length, 1);
			assert.strictEqual(userTenantRoles[0].role, "owner");
		}
	});

	test("should be able to create a tenant with a ragflowId", async () => {
		const result = await sut.execute({
			name: "RAGFlow Organization",
			subdomain: "ragflow-org",
			ownerId,
			ragflowId: "ragflow-123",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant } = result.value;
			assert.strictEqual(tenant.ragflowId, "ragflow-123");

			// Verificar a associação do proprietário
			const userTenantRoles = userTenantRolesRepository.items;
			assert.strictEqual(userTenantRoles.length, 1);
		}
	});

	test("should not be able to create a tenant with a subdomain that is already in use", async () => {
		// Adicionar um tenant existente ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			subdomain: "existing-org",
		});

		const result = await sut.execute({
			name: "Another Organization",
			subdomain: "existing-org",
			ownerId,
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof SubdomainAlreadyInUseError);
			assert.strictEqual(
				result.value.message,
				'The subdomain "existing-org" is already in use.',
			);
		}

		// Verificar que nenhuma associação foi criada
		assert.strictEqual(userTenantRolesRepository.items.length, 0);
	});

	test("should not be able to create a tenant with a non-existent owner", async () => {
		const result = await sut.execute({
			name: "Test Organization",
			subdomain: "test-org",
			ownerId: "non-existent-user-id",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof UserNotFoundError);
			assert.strictEqual(result.value.message, "User not found");
		}

		// Verificar que nenhum tenant foi criado
		assert.strictEqual(tenantsRepository.items.length, 0);

		// Verificar que nenhuma associação foi criada
		assert.strictEqual(userTenantRolesRepository.items.length, 0);
	});
});

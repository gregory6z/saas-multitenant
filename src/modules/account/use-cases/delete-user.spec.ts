import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryUserTenantRolesRepository } from "@/repositories/in-memory/in-memory-user-tenant-roles-repository.js";
import { DeleteUserUseCase } from "./delete-user.ts";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.ts";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
} from "../errors/account.errors.ts";

describe("DeleteUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let userTenantRolesRepository: InMemoryUserTenantRolesRepository;
	let sut: DeleteUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		userTenantRolesRepository = new InMemoryUserTenantRolesRepository();
		sut = new DeleteUserUseCase(usersRepository, userTenantRolesRepository);
	});

	test("should be able to delete own user account", async () => {
		// Adicionar o usuário que será excluído
		const user = addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
		});

		// Verificar se o usuário foi adicionado corretamente
		assert.strictEqual(usersRepository.items.length, 1);

		// Adicionar associação com tenant
		await userTenantRolesRepository.create({
			userId: "user-1",
			tenantId: "tenant-1",
			role: "user",
		});

		// Verificar se a associação foi adicionada corretamente
		assert.strictEqual(userTenantRolesRepository.items.length, 1);

		const result = await sut.execute({
			userId: "user-1",
			currentUserId: "user-1", // Mesmo usuário (excluindo a própria conta)
		});

		assert.ok(result.isRight());

		// Verificar se o usuário foi excluído
		assert.strictEqual(
			usersRepository.items.length,
			0,
			"User should be deleted",
		);

		// Verificar se as associações foram removidas
		assert.strictEqual(
			userTenantRolesRepository.items.length,
			0,
			"User-tenant associations should be deleted",
		);
	});

	test("should not be able to delete another user's account", async () => {
		// Adicionar o usuário que tentará fazer a exclusão
		const user1 = addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
		});

		// Adicionar o usuário que tentará ser excluído
		const user2 = addUserToInMemoryRepository(usersRepository, {
			id: "user-2",
		});

		// Adicionar associações com tenant
		await userTenantRolesRepository.create({
			userId: "user-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		await userTenantRolesRepository.create({
			userId: "user-2",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: "user-2",
			currentUserId: "user-1", // Usuário diferente
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.strictEqual(usersRepository.items.length, 2); // Nenhum usuário foi excluído
		assert.strictEqual(userTenantRolesRepository.items.length, 2); // Nenhuma associação foi removida
	});

	test("should return error when trying to delete non-existent user", async () => {
		const result = await sut.execute({
			userId: "non-existent-user",
			currentUserId: "non-existent-user", // Mesmo ID para simular exclusão própria
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
	});
});

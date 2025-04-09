import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { DeleteUserUseCase } from "./delete-user.ts";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.ts";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	CrossTenantOperationError,
} from "../errors/account.errors.ts";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.ts";

describe("DeleteUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: DeleteUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();
		sut = new DeleteUserUseCase(usersRepository, checkPermissionUseCase);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();
	});

	test("should be able to delete own user account", async () => {
		// Adicionar o usuário que será excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: "user-1",
			currentUserId: "user-1", // Mesmo usuário (excluindo a própria conta)
			currentUserRole: "user",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(usersRepository.items.length, 0);
	});

	test("should be able to delete another user when has permission", async () => {
		// Configurar permissão para excluir usuários
		checkPermissionUseCase.allowPermission(PERMISSIONS.USERS_DELETE);

		// Adicionar o admin que fará a exclusão
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Adicionar o usuário que será excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: "user-1",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(usersRepository.items.length, 1); // Apenas o admin permanece
		assert.strictEqual(usersRepository.items[0].id, "admin-1");
	});

	test("should not be able to delete a user from another tenant", async () => {
		// Adicionar o admin que tentará fazer a exclusão
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Adicionar o usuário de outro tenant que tentará ser excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			tenantId: "tenant-2", // Tenant diferente
			role: "user",
		});

		const result = await sut.execute({
			userId: "user-1",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
		assert.strictEqual(usersRepository.items.length, 2); // Nenhum usuário foi excluído
	});

	test("should not be able to delete a user without proper permission", async () => {
		// Não configuramos a permissão USERS_DELETE, então ela será negada por padrão

		// Adicionar o usuário com permissões limitadas
		addUserToInMemoryRepository(usersRepository, {
			id: "manager-1",
			tenantId: "tenant-1",
			role: "manager",
		});

		// Adicionar o usuário que tentará ser excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: "user-1",
			currentUserId: "manager-1",
			currentUserRole: "manager",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.strictEqual(usersRepository.items.length, 2); // Nenhum usuário foi excluído
	});

	test("should not be able to delete an admin user without special permission", async () => {
		// Configurar permissões - permitir excluir usuários normais, mas não admins
		checkPermissionUseCase.allowPermission(PERMISSIONS.USERS_DELETE);
		// Não configuramos USERS_DELETE_ADMIN, então será negada por padrão

		// Adicionar o admin que tentará fazer a exclusão
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Adicionar outro admin que tentará ser excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-2",
			tenantId: "tenant-1",
			role: "admin",
		});

		const result = await sut.execute({
			userId: "admin-2",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.strictEqual(usersRepository.items.length, 2); // Nenhum usuário foi excluído
	});

	test("should be able to delete an admin user with special permission", async () => {
		// Configurar múltiplas permissões de uma vez
		checkPermissionUseCase.allowPermissions([
			PERMISSIONS.USERS_DELETE,
			PERMISSIONS.USERS_DELETE_ADMIN,
		]);

		// Adicionar o super_admin que fará a exclusão
		addUserToInMemoryRepository(usersRepository, {
			id: "super-admin-1",
			tenantId: "tenant-1",
			role: "super_admin",
		});

		// Adicionar o admin que será excluído
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		const result = await sut.execute({
			userId: "admin-1",
			currentUserId: "super-admin-1",
			currentUserRole: "super_admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(usersRepository.items.length, 1); // Apenas o super_admin permanece
		assert.strictEqual(usersRepository.items[0].id, "super-admin-1");
	});

	test("should return error when trying to delete non-existent user", async () => {
		// Adicionar o admin que tentará fazer a exclusão
		addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			tenantId: "tenant-1",
			role: "admin",
		});

		const result = await sut.execute({
			userId: "non-existent-user",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
		assert.strictEqual(usersRepository.items.length, 1); // Nenhuma alteração no repositório
	});
});

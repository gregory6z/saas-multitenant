import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.js";
import { InMemoryUserTenantRolesRepository } from "@/repositories/in-memory/in-memory-user-tenant-roles-repository.js";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.js";
import { RemoveUserFromTenantUseCase } from "./remove-user-from-tenant.js";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.js";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	CrossTenantOperationError,
} from "@/modules/account/errors/account.errors.ts";
import {
	CannotRemoveOwnerError,
	CannotRemoveSelfError,
	TenantNotFoundError,
	UserNotInTenantError,
} from "@/modules/tenant/errors/tenant.errors.ts";

describe("RemoveUserFromTenantUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let tenantsRepository: InMemoryTenantsRepository;
	let userTenantRolesRepository: InMemoryUserTenantRolesRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: RemoveUserFromTenantUseCase;
	let userId: string;
	let adminId: string;
	let ownerId: string;
	let tenantId: string;

	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository();
		tenantsRepository = new InMemoryTenantsRepository();
		userTenantRolesRepository = new InMemoryUserTenantRolesRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();

		sut = new RemoveUserFromTenantUseCase(
			usersRepository,
			tenantsRepository,
			userTenantRolesRepository,
			checkPermissionUseCase,
		);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();

		// Adicionar usuários para os testes
		const regularUser = addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			name: "Regular User",
			email: "user@example.com",
		});
		userId = regularUser.id;

		const adminUser = addUserToInMemoryRepository(usersRepository, {
			id: "admin-1",
			name: "Admin User",
			email: "admin@example.com",
		});
		adminId = adminUser.id;

		const ownerUser = addUserToInMemoryRepository(usersRepository, {
			id: "owner-1",
			name: "Owner User",
			email: "owner@example.com",
		});
		ownerId = ownerUser.id;

		// Adicionar um tenant para os testes
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Test Tenant",
			subdomain: "test",
			status: "active",
			ownerId: ownerId,
		});
		tenantId = tenant.id;

		// Adicionar associações entre usuários e tenant
		await userTenantRolesRepository.create({
			userId: userId,
			tenantId: tenantId,
			role: "user",
		});

		await userTenantRolesRepository.create({
			userId: adminId,
			tenantId: tenantId,
			role: "admin",
		});

		await userTenantRolesRepository.create({
			userId: ownerId,
			tenantId: tenantId,
			role: "owner",
		});
	});

	test("should be able to remove a user from a tenant", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		const result = await sut.execute({
			userId,
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			assert.strictEqual(result.value.success, true);
		}

		// Verificar se a associação foi removida do repositório
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 0);
	});

	test("should not be able to remove a user without proper permission", async () => {
		// Não configuramos a permissão TENANT_REMOVE_USERS, então será negada

		const result = await sut.execute({
			userId,
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);

		// Verificar que a associação não foi removida
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 1);
	});

	test("should return error when user is not found", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		const result = await sut.execute({
			userId: "non-existent-user",
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
	});

	test("should return error when tenant is not found", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		const result = await sut.execute({
			userId,
			tenantId: "non-existent-tenant", // Tenant que não existe
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: "non-existent-tenant", // Deve ser o mesmo para evitar erro de cross-tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof TenantNotFoundError); // Verificar o tipo correto de erro
	});

	test("should return error when user is not a member of the tenant", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		// Adicionar um novo usuário que não é membro do tenant
		const nonMemberUser = addUserToInMemoryRepository(usersRepository, {
			id: "non-member",
			name: "Non Member",
			email: "nonmember@example.com",
		});

		const result = await sut.execute({
			userId: nonMemberUser.id,
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotInTenantError);
	});

	test("should not be able to remove the owner of a tenant", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		const result = await sut.execute({
			userId: ownerId,
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CannotRemoveOwnerError);

		// Verificar que a associação do owner não foi removida
		const ownerMemberships =
			await userTenantRolesRepository.findByUser(ownerId);
		assert.strictEqual(ownerMemberships.length, 1);
		assert.strictEqual(ownerMemberships[0].role, "owner");
	});

	test("should not be able to remove yourself from a tenant", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		const result = await sut.execute({
			userId: adminId,
			tenantId,
			currentUserId: adminId, // Tentando remover a si mesmo
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CannotRemoveSelfError);

		// Verificar que a associação do admin não foi removida
		const adminMemberships =
			await userTenantRolesRepository.findByUser(adminId);
		assert.strictEqual(adminMemberships.length, 1);
	});

	test("should verify cross-tenant operations are not allowed", async () => {
		// Configurar permissão para remover usuários do tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_REMOVE_USERS);

		// Criar um segundo tenant
		const secondTenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-2",
			name: "Second Tenant",
			subdomain: "second",
			status: "active",
		});

		// Tentar remover um usuário de um tenant enquanto logado em outro
		const result = await sut.execute({
			userId, // Use o userId já definido no beforeEach
			tenantId,
			currentUserId: adminId,
			currentUserRole: "admin",
			currentUserTenantId: secondTenant.id, // Tenant diferente
		});

		// Verificar que a operação não é permitida
		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
	});
});

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.ts";
import { InMemoryUserTenantRolesRepository } from "@/repositories/in-memory/in-memory-user-tenant-roles-repository.ts";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.ts";
import { AssignUserToTenantUseCase } from "./assign-user-to-tenant.ts";
import { addUserToInMemoryRepository } from "@/core/entities/test/make-user.ts";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.ts";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	UserNotFoundError,
	UnauthorizedOperationError,
	UserAlreadyInTenantError,
	InvalidRoleError,
} from "@/modules/account/errors/account.errors.ts";
import {
	CannotAssignOwnerRoleError,
	TenantNotFoundError,
} from "@/modules/tenant/errors/tenant.errors.ts";

describe("AssignUserToTenantUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let tenantsRepository: InMemoryTenantsRepository;
	let userTenantRolesRepository: InMemoryUserTenantRolesRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: AssignUserToTenantUseCase;
	let userId: string;
	let tenantId: string;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		tenantsRepository = new InMemoryTenantsRepository();
		userTenantRolesRepository = new InMemoryUserTenantRolesRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();

		sut = new AssignUserToTenantUseCase(
			usersRepository,
			tenantsRepository,
			userTenantRolesRepository,
			checkPermissionUseCase,
		);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();

		// Adicionar um usuário para os testes
		const user = addUserToInMemoryRepository(usersRepository, {
			id: "user-1",
			name: "John Doe",
			email: "john@example.com",
			passwordHash: "hashed:123456",
		});
		userId = user.id;

		// Adicionar um tenant para os testes
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-target",
			name: "Target Tenant",
			subdomain: "target",
			status: "active",
		});
		tenantId = tenant.id;
	});

	test("should be able to assign a user to a tenant with a specific role", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		const result = await sut.execute({
			userId,
			targetTenantId: tenantId,
			role: "admin",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user, membership } = result.value;
			assert.strictEqual(user.id, userId);
			assert.strictEqual(membership.userId, userId);
			assert.strictEqual(membership.tenantId, tenantId);
			assert.strictEqual(membership.role, "admin");
		}

		// Verificar se a associação foi adicionada ao repositório
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 1);
		assert.strictEqual(memberships[0].tenantId, tenantId);
		assert.strictEqual(memberships[0].role, "admin");
	});

	test("should not be able to assign a user without proper permission", async () => {
		// Não configuramos a permissão USERS_ASSIGN_TO_TENANT, então será negada

		const result = await sut.execute({
			userId,
			targetTenantId: tenantId,
			role: "user",
			currentUserId: "user-2",
			currentUserRole: "user",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);

		// Verificar que nenhuma associação foi criada
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 0);
	});

	test("should return error when user is not found", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		const result = await sut.execute({
			userId: "non-existent-user",
			targetTenantId: tenantId,
			role: "user",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
	});

	test("should return error when tenant is not found", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		const result = await sut.execute({
			userId,
			targetTenantId: "non-existent-tenant",
			role: "user",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof TenantNotFoundError);
	});

	test("should return error when user is already assigned to the tenant", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		// Adicionar uma associação existente
		await userTenantRolesRepository.create({
			userId,
			tenantId,
			role: "user",
		});

		const result = await sut.execute({
			userId,
			targetTenantId: tenantId,
			role: "admin", // Tentando mudar a role
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserAlreadyInTenantError);

		// Verificar que a associação original não foi alterada
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 1);
		assert.strictEqual(memberships[0].role, "user"); // Manteve a role original
	});

	test("should return error when trying to assign an invalid role", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		const result = await sut.execute({
			userId,
			targetTenantId: tenantId,
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			role: "invalid-role" as any, // Role inválida
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof InvalidRoleError);

		// Verificar que nenhuma associação foi criada
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 0);
	});

	// Novo teste para verificar que não é possível atribuir a role "owner"
	test("should not be able to assign the 'owner' role", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		const result = await sut.execute({
			userId,
			targetTenantId: tenantId,
			role: "owner", // Tentando atribuir a role "owner"
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		assert.ok(result.isLeft());

		// Adicione este console.log para depuração
		console.log("Error returned:", result.value);
		console.log("Error type:", result.value.constructor.name);

		assert.ok(result.value instanceof CannotAssignOwnerRoleError);

		assert.strictEqual(
			result.value.message,
			'Cannot assign "owner" role through this operation. Owners are assigned only during tenant creation.',
		);

		// Verificar que nenhuma associação foi criada
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 0);
	});

	test("should allow different roles for the same user in different tenants", async () => {
		// Configurar permissão para adicionar usuários ao tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_ASSIGN_USERS);

		// Criar um segundo tenant
		const secondTenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-second",
			name: "Second Tenant",
			subdomain: "second",
			status: "active",
		});

		// Associar o usuário ao primeiro tenant como admin
		await sut.execute({
			userId,
			targetTenantId: tenantId,
			role: "admin",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: tenantId,
		});

		// Associar o mesmo usuário ao segundo tenant como user
		const result = await sut.execute({
			userId,
			targetTenantId: secondTenant.id,
			role: "user",
			currentUserId: "admin-2",
			currentUserRole: "admin",
			currentUserTenantId: secondTenant.id,
		});

		assert.ok(result.isRight());

		// Verificar que o usuário tem duas associações com roles diferentes
		const memberships = await userTenantRolesRepository.findByUser(userId);
		assert.strictEqual(memberships.length, 2);

		const firstMembership = memberships.find((m) => m.tenantId === tenantId);
		const secondMembership = memberships.find(
			(m) => m.tenantId === secondTenant.id,
		);

		assert.strictEqual(firstMembership?.role, "admin");
		assert.strictEqual(secondMembership?.role, "user");
	});
});

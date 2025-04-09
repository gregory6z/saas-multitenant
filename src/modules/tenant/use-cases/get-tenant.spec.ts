import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { GetTenantUseCase } from "./get-tenant.ts";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.ts";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
} from "../errors/tenant.errors.ts";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.ts";
import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.ts";

describe("GetTenantUseCase", () => {
	let tenantsRepository: InMemoryTenantsRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: GetTenantUseCase;

	beforeEach(() => {
		tenantsRepository = new InMemoryTenantsRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();
		sut = new GetTenantUseCase(tenantsRepository, checkPermissionUseCase);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();
	});

	test("should be able to get tenant information when user has permission", async () => {
		// Configurar permissão para visualizar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANTS_VIEW);

		// Adicionar um tenant ao repositório usando a função utilitária
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			assert.strictEqual(result.value.tenant.id, "tenant-1");
			assert.strictEqual(result.value.tenant.name, "Empresa ABC");
			assert.strictEqual(result.value.tenant.domain, "abc");
			assert.strictEqual(result.value.tenant.isActive, true);
		}
	});

	test("should not be able to get tenant information without proper permission", async () => {
		// Não configuramos a permissão TENANTS_VIEW, então será negada

		// Adicionar um tenant ao repositório usando a função utilitária
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			currentUserId: "user-1",
			currentUserRole: "user",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedTenantAccessError);
	});

	test("should not be able to get information from another tenant", async () => {
		// Configurar permissão para visualizar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANTS_VIEW);

		// Adicionar dois tenants ao repositório usando a função utilitária
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-2",
			name: "Empresa XYZ",
			subdomain: "xyz",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-2", // Tenant diferente
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
	});

	test("should return error when tenant is not found", async () => {
		// Configurar permissão para visualizar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANTS_VIEW);

		const result = await sut.execute({
			tenantId: "non-existent-tenant",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "non-existent-tenant", // Mesmo ID para evitar erro de cross-tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof TenantNotFoundError);
	});

	test("should return tenant with correct active status based on tenant status", async () => {
		// Configurar permissão para visualizar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANTS_VIEW);

		// Adicionar tenants com diferentes status usando a função utilitária
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-active",
			name: "Empresa Ativa",
			subdomain: "ativa",
			status: "active",
		});

		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-inactive",
			name: "Empresa Inativa",
			subdomain: "inativa",
			status: "inactive",
		});

		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-suspended",
			name: "Empresa Suspensa",
			subdomain: "suspensa",
			status: "suspended",
		});

		// Testar tenant ativo
		const activeResult = await sut.execute({
			tenantId: "tenant-active",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-active",
		});

		assert.ok(activeResult.isRight());
		if (activeResult.isRight()) {
			assert.strictEqual(activeResult.value.tenant.isActive, true);
		}

		// Testar tenant inativo
		const inactiveResult = await sut.execute({
			tenantId: "tenant-inactive",
			currentUserId: "user-2",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-inactive",
		});

		assert.ok(inactiveResult.isRight());
		if (inactiveResult.isRight()) {
			assert.strictEqual(inactiveResult.value.tenant.isActive, false);
		}

		// Testar tenant suspenso
		const suspendedResult = await sut.execute({
			tenantId: "tenant-suspended",
			currentUserId: "user-3",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-suspended",
		});

		assert.ok(suspendedResult.isRight());
		if (suspendedResult.isRight()) {
			assert.strictEqual(suspendedResult.value.tenant.isActive, false);
		}
	});
});

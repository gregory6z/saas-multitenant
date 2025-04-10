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
			// Verificar se o tenant retornado é o mesmo objeto completo
			assert.strictEqual(result.value.tenant.id, "tenant-1");
			assert.strictEqual(result.value.tenant.name, "Empresa ABC");
			assert.strictEqual(result.value.tenant.subdomain, "abc");
			assert.strictEqual(result.value.tenant.status, "active");

			// Verificar se todos os campos do tenant estão presentes
			assert.ok(result.value.tenant.createdAt instanceof Date);
			assert.ok(result.value.tenant.updatedAt instanceof Date);
			assert.ok("ownerId" in result.value.tenant);
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
			currentUserTenantId: "tenant-1",
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

	test("should return tenant with all its properties", async () => {
		// Configurar permissão para visualizar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANTS_VIEW);

		// Adicionar tenant com todas as propriedades definidas
		const createdAt = new Date(2023, 0, 1);
		const updatedAt = new Date(2023, 0, 2);

		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-complete",
			name: "Empresa Completa",
			subdomain: "completa",
			status: "active",
			ownerId: "owner-123",
			createdAt,
			updatedAt,
			ragflowId: "ragflow-123",
		});

		const result = await sut.execute({
			tenantId: "tenant-complete",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-complete",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant } = result.value;

			// Verificar todos os campos
			assert.strictEqual(tenant.id, "tenant-complete");
			assert.strictEqual(tenant.name, "Empresa Completa");
			assert.strictEqual(tenant.subdomain, "completa");
			assert.strictEqual(tenant.status, "active");
			assert.strictEqual(tenant.ownerId, "owner-123");
			assert.strictEqual(tenant.createdAt, createdAt);
			assert.strictEqual(tenant.updatedAt, updatedAt);
			assert.strictEqual(tenant.ragflowId, "ragflow-123");
		}
	});
});

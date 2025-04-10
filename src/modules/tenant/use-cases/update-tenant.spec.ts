import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { UpdateTenantUseCase } from "./update-tenant.ts";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.ts";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
} from "../errors/tenant.errors.ts";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.ts";
import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.ts";

describe("UpdateTenantUseCase", () => {
	let tenantsRepository: InMemoryTenantsRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: UpdateTenantUseCase;

	beforeEach(() => {
		tenantsRepository = new InMemoryTenantsRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();
		sut = new UpdateTenantUseCase(tenantsRepository, checkPermissionUseCase);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();
	});

	test("should be able to update tenant information when user has permission", async () => {
		// Configurar permissão para editar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_EDIT);

		// Adicionar um tenant ao repositório
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			name: "Empresa ABC Atualizada",
			status: "inactive",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;

			assert.strictEqual(updatedTenant.id, "tenant-1");
			assert.strictEqual(updatedTenant.name, "Empresa ABC Atualizada");
			assert.strictEqual(updatedTenant.status, "inactive");
			assert.strictEqual(updatedTenant.subdomain, "abc"); // Subdomínio não muda
		}
	});

	test("should not be able to update tenant without proper permission", async () => {
		// Não configuramos a permissão TENANT_EDIT, então será negada

		// Adicionar um tenant ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			name: "Empresa ABC Atualizada",
			currentUserId: "user-1",
			currentUserRole: "user",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedTenantAccessError);
	});

	test("should not be able to update another tenant", async () => {
		// Configurar permissão para editar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_EDIT);

		// Adicionar dois tenants ao repositório
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
			name: "Empresa XYZ Atualizada",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
	});

	test("should not be able to update a non-existent tenant", async () => {
		// Configurar permissão para editar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_EDIT);

		const result = await sut.execute({
			tenantId: "non-existent-tenant",
			name: "Tenant Inexistente",
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "non-existent-tenant", // Mesmo ID para evitar erro de cross-tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof TenantNotFoundError);
	});

	test("should be able to update only specific fields", async () => {
		// Configurar permissão para editar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_EDIT);

		// Adicionar um tenant ao repositório
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
			ragflowId: "ragflow-123",
		});

		// Atualizar apenas o nome - não incluir ragflowId na requisição
		const result = await sut.execute({
			tenantId: "tenant-1",
			name: "Empresa ABC Atualizada",
			// Não incluir ragflowId aqui
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;

			// Verificar que apenas o nome foi atualizado
			assert.strictEqual(updatedTenant.name, "Empresa ABC Atualizada");
			// Verificar que outros campos não foram alterados
			assert.strictEqual(updatedTenant.status, "active");
			assert.strictEqual(updatedTenant.ragflowId, "ragflow-123");
		}
	});

	test("should be able to update ragflowId to null", async () => {
		// Configurar permissão para editar tenant
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_EDIT);

		// Adicionar um tenant ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
			ragflowId: "ragflow-123",
		});

		// Verificar estado inicial
		const initialTenant = await tenantsRepository.findById("tenant-1");
		console.log("Initial ragflowId:", initialTenant?.ragflowId);

		// Atualizar o ragflowId para null
		const result = await sut.execute({
			tenantId: "tenant-1",
			ragflowId: null, // Explicitamente null
			currentUserId: "user-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1",
		});

		// Verificar resultado
		console.log("Update result:", result);

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;
			console.log("Updated ragflowId:", updatedTenant.ragflowId);

			// Verificar que o ragflowId foi atualizado para null
			assert.strictEqual(updatedTenant.ragflowId, null);
		} else {
			// Se falhou, mostrar o erro
			console.error("Update failed:", result.value);
			assert.fail("Update should succeed");
		}
	});
});

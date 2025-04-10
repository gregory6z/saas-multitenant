import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { SetTenantSubdomainUseCase } from "./set-tenant-subdomain.ts";
import { InMemoryCheckPermissionUseCase } from "@/modules/rbac/use-cases/test/in-memory-check-permission.ts";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	SubdomainAlreadyInUseError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
} from "../errors/tenant.errors.ts";
import { addTenantToInMemoryRepository } from "@/core/entities/test/make-tenant.ts";
import { InMemoryTenantsRepository } from "@/repositories/in-memory/in-memory-tenants-repositories.ts";

describe("SetTenantSubdomainUseCase", () => {
	let tenantsRepository: InMemoryTenantsRepository;
	let checkPermissionUseCase: InMemoryCheckPermissionUseCase;
	let sut: SetTenantSubdomainUseCase;

	beforeEach(() => {
		tenantsRepository = new InMemoryTenantsRepository();
		checkPermissionUseCase = new InMemoryCheckPermissionUseCase();
		sut = new SetTenantSubdomainUseCase(
			tenantsRepository,
			checkPermissionUseCase,
		);

		// Limpar permissões antes de cada teste
		checkPermissionUseCase.clearPermissions();
	});

	test("should be able to update tenant subdomain when user has permission", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

		// Adicionar um tenant ao repositório
		const tenant = addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			subdomain: "abc-new",
			currentUserId: "owner-1",
			currentUserRole: "owner",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;

			assert.strictEqual(updatedTenant.id, "tenant-1");
			assert.strictEqual(updatedTenant.subdomain, "abc-new");
			assert.strictEqual(updatedTenant.name, "Empresa ABC"); // Não alterado
		}
	});

	test("should not be able to update tenant subdomain without proper permission", async () => {
		// Não configuramos a permissão TENANT_CHANGE_SUBDOMAIN, então será negada

		// Adicionar um tenant ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			subdomain: "abc-new",
			currentUserId: "admin-1",
			currentUserRole: "admin",
			currentUserTenantId: "tenant-1", // Mesmo tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedTenantAccessError);
	});

	test("should not be able to update another tenant's subdomain", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

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
			subdomain: "xyz-new",
			currentUserId: "owner-1",
			currentUserRole: "owner",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
	});

	test("should not be able to update a non-existent tenant's subdomain", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

		const result = await sut.execute({
			tenantId: "non-existent-tenant",
			subdomain: "new-subdomain",
			currentUserId: "owner-1",
			currentUserRole: "owner",
			currentUserTenantId: "non-existent-tenant", // Mesmo ID para evitar erro de cross-tenant
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof TenantNotFoundError);
	});

	test("should not be able to use a subdomain that is already in use", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

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
			tenantId: "tenant-1",
			subdomain: "xyz", // Subdomínio já em uso pelo tenant-2
			currentUserId: "owner-1",
			currentUserRole: "owner",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof SubdomainAlreadyInUseError);
	});

	test("should be able to keep the same subdomain", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

		// Adicionar um tenant ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			subdomain: "abc", // Mesmo subdomínio
			currentUserId: "owner-1",
			currentUserRole: "owner",
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;

			assert.strictEqual(updatedTenant.id, "tenant-1");
			assert.strictEqual(updatedTenant.subdomain, "abc");
		}
	});

	test("should allow admin to update subdomain if they have the specific permission", async () => {
		// Configurar permissão para alterar subdomínio
		checkPermissionUseCase.allowPermission(PERMISSIONS.TENANT_CHANGE_SUBDOMAIN);

		// Adicionar um tenant ao repositório
		addTenantToInMemoryRepository(tenantsRepository, {
			id: "tenant-1",
			name: "Empresa ABC",
			subdomain: "abc",
			status: "active",
		});

		const result = await sut.execute({
			tenantId: "tenant-1",
			subdomain: "abc-new",
			currentUserId: "admin-1",
			currentUserRole: "admin", // Admin com permissão específica
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { tenant: updatedTenant } = result.value;

			assert.strictEqual(updatedTenant.subdomain, "abc-new");
		}
	});
});

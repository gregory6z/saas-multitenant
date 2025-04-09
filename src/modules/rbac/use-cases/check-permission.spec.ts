import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { CheckPermissionUseCase } from "./check-permission.js";
import { ROLE_PERMISSIONS } from "../constants/roles.ts";
import { PermissionDeniedError } from "../errors/rbac.errors.ts";

describe("CheckPermissionUseCase", () => {
	let sut: CheckPermissionUseCase;

	beforeEach(() => {
		sut = new CheckPermissionUseCase();
	});

	test("should allow access when user has the required permission", async () => {
		// Vamos pegar a primeira permissão da role 'admin'
		const permission = ROLE_PERMISSIONS.admin[0];

		// Verificar se a permissão existe
		assert.ok(
			permission,
			"A role 'admin' deve ter pelo menos uma permissão definida",
		);

		const result = await sut.execute({
			userId: "user-1",
			tenantId: "tenant-1",
			userRole: "admin",
			permission,
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			assert.deepStrictEqual(result.value, { hasPermission: true });
		}
	});

	test("should deny access when user doesn't have the required permission", async () => {
		// Vamos usar uma permissão que sabemos que não existe para a role 'user'
		const permission = "owner_only_permission";

		const result = await sut.execute({
			userId: "user-1",
			tenantId: "tenant-1",
			userRole: "user",
			permission,
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof PermissionDeniedError);
			assert.strictEqual(
				result.value.message,
				`Permission denied: ${permission}`,
			);
		}
	});

	test("should deny access when role doesn't exist", async () => {
		const permission = "some.permission";

		const result = await sut.execute({
			userId: "user-1",
			tenantId: "tenant-1",
			userRole: "non_existent_role",
			permission,
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof PermissionDeniedError);
		}
	});

	// Testes para cada role definida no sistema
	for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
		if (Array.isArray(permissions) && permissions.length > 0) {
			test(`should correctly check permissions for role '${role}'`, async () => {
				// Para cada permissão que a role deve ter
				for (const permission of permissions) {
					const result = await sut.execute({
						userId: "user-1",
						tenantId: "tenant-1",
						userRole: role,
						permission,
					});

					assert.ok(
						result.isRight(),
						`Role '${role}' deveria ter permissão '${permission}'`,
					);
				}

				// Teste com uma permissão que sabemos que não existe para esta role
				const nonExistentPermission = "permission.that.does.not.exist";

				const result = await sut.execute({
					userId: "user-1",
					tenantId: "tenant-1",
					userRole: role,
					permission: nonExistentPermission,
				});

				assert.ok(
					result.isLeft(),
					`Role '${role}' não deveria ter permissão '${nonExistentPermission}'`,
				);
			});
		}
	}

	// Teste para verificar a hierarquia de permissões (se aplicável)
	test("should respect permission hierarchy", async () => {
		// Verificar se temos as roles necessárias para o teste
		if (
			!ROLE_PERMISSIONS.owner ||
			!ROLE_PERMISSIONS.admin ||
			!ROLE_PERMISSIONS.user
		) {
			// Pular o teste se não tivermos as roles necessárias
			console.log(
				"Pulando teste de hierarquia - roles necessárias não definidas",
			);
			return;
		}

		// Encontrar uma permissão que owner tem mas admin não tem
		const superAdminPermission = ROLE_PERMISSIONS.owner.find(
			(p) => !ROLE_PERMISSIONS.admin.includes(p),
		);

		if (superAdminPermission) {
			// Super admin deve ter esta permissão
			const superAdminResult = await sut.execute({
				userId: "user-1",
				tenantId: "tenant-1",
				userRole: "owner",
				permission: superAdminPermission,
			});

			assert.ok(
				superAdminResult.isRight(),
				`owner deveria ter permissão '${superAdminPermission}'`,
			);

			// Admin não deve ter esta permissão
			const adminResult = await sut.execute({
				userId: "user-1",
				tenantId: "tenant-1",
				userRole: "admin",
				permission: superAdminPermission,
			});

			assert.ok(
				adminResult.isLeft(),
				`admin não deveria ter permissão '${superAdminPermission}'`,
			);
		} else {
			console.log("Não foi encontrada uma permissão exclusiva para owner");
		}

		// Encontrar uma permissão que admin tem mas user não tem
		const adminPermission = ROLE_PERMISSIONS.admin.find(
			(p) => !ROLE_PERMISSIONS.user.includes(p),
		);

		if (adminPermission) {
			// Admin deve ter esta permissão
			const adminResult = await sut.execute({
				userId: "user-1",
				tenantId: "tenant-1",
				userRole: "admin",
				permission: adminPermission,
			});

			assert.ok(
				adminResult.isRight(),
				`admin deveria ter permissão '${adminPermission}'`,
			);

			// User não deve ter esta permissão
			const userResult = await sut.execute({
				userId: "user-1",
				tenantId: "tenant-1",
				userRole: "user",
				permission: adminPermission,
			});

			assert.ok(
				userResult.isLeft(),
				`user não deveria ter permissão '${adminPermission}'`,
			);
		} else {
			console.log("Não foi encontrada uma permissão exclusiva para admin");
		}
	});
});

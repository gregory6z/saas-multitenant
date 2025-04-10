import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InitializePermissionsUseCase } from "./initialize-permissions.ts";
import { InMemoryPermissionsRepository } from "@/repositories/in-memory/in-memory-permissions-repository.ts";
import { PERMISSIONS } from "../constants/permissions.ts";

describe("InitializePermissionsUseCase", () => {
	let permissionsRepository: InMemoryPermissionsRepository;
	let sut: InitializePermissionsUseCase;

	beforeEach(() => {
		permissionsRepository = new InMemoryPermissionsRepository();
		sut = new InitializePermissionsUseCase(permissionsRepository);
	});

	test("should initialize all permissions defined in PERMISSIONS", async () => {
		const result = await sut.execute();

		assert.ok(result.isRight());
		if (result.isRight()) {
			assert.deepStrictEqual(result.value, { success: true });
		}

		// Verificar se todas as permissões foram criadas
		const allPermissions = await permissionsRepository.findAll();

		// Verificar se o número de permissões criadas corresponde ao número de permissões definidas
		assert.strictEqual(
			allPermissions.length,
			Object.keys(PERMISSIONS).length,
			"Número de permissões criadas deve corresponder ao número de permissões definidas",
		);

		// Verificar se cada permissão definida em PERMISSIONS foi criada
		for (const [key, code] of Object.entries(PERMISSIONS)) {
			const permission = await permissionsRepository.findByCode(code);

			assert.ok(
				permission,
				`Permissão com código '${code}' (${key}) não foi encontrada`,
			);

			if (permission) {
				assert.strictEqual(permission.code, code);
				// Verificar se o nome da permissão corresponde à chave em PERMISSIONS
				assert.strictEqual(permission.name, key);
			}
		}
	});

	test("should not duplicate permissions that already exist", async () => {
		// Criar uma permissão antes de executar o caso de uso
		const existingPermissionCode = Object.values(PERMISSIONS)[0];
		const existingPermissionKey = Object.keys(PERMISSIONS).find(
			(key) =>
				PERMISSIONS[key as keyof typeof PERMISSIONS] === existingPermissionCode,
		);

		await permissionsRepository.create({
			code: existingPermissionCode,
			description: "Permissão pré-existente",
			name: existingPermissionKey || "unknown",
		});

		// Executar o caso de uso
		await sut.execute();

		// Verificar se todas as permissões foram criadas
		const allPermissions = await permissionsRepository.findAll();

		// Verificar se o número de permissões criadas corresponde ao número de permissões definidas
		assert.strictEqual(
			allPermissions.length,
			Object.keys(PERMISSIONS).length,
			"Número de permissões criadas deve corresponder ao número de permissões definidas",
		);

		// Verificar se a permissão pré-existente não foi duplicada
		const permissionsWithSameCode = allPermissions.filter(
			(p) => p.code === existingPermissionCode,
		);

		assert.strictEqual(
			permissionsWithSameCode.length,
			1,
			"Não deve haver permissões duplicadas",
		);
	});

	test("should handle case when no permissions are created", async () => {
		// Criar um mock do método findByCode que sempre retorna uma permissão existente
		const originalFindByCode = permissionsRepository.findByCode;
		permissionsRepository.findByCode = async () => {
			return {
				id: "existing-id",
				code: "existing-code",
				name: "Existing permission",
				description: "Existing permission",
			};
		};

		try {
			const result = await sut.execute();

			// Verificar se a operação foi bem-sucedida
			assert.ok(result.isRight());

			// Verificar se nenhuma permissão foi criada (porque todas já "existiam")
			assert.strictEqual(permissionsRepository.items.length, 0);
		} finally {
			// Restaurar o método original
			permissionsRepository.findByCode = originalFindByCode;
		}
	});
});

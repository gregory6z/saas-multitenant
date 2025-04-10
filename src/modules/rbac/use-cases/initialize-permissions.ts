import { right, type Either } from "@/core/either.js";
import type { PermissionsRepository } from "@/repositories/interfaces/permissions-repository.interfaces.js";
import { PERMISSIONS } from "../constants/permissions.ts";

interface InitializePermissionsResponse {
	success: true;
}

type InitializePermissionsResult = Either<null, InitializePermissionsResponse>;

export class InitializePermissionsUseCase {
	constructor(private permissionsRepository: PermissionsRepository) {}

	async execute(): Promise<InitializePermissionsResult> {
		for (const [key, code] of Object.entries(PERMISSIONS)) {
			const existingPermission =
				await this.permissionsRepository.findByCode(code);

			if (!existingPermission) {
				await this.permissionsRepository.create({
					code,
					name: key,
					description: this.getDescriptionForCode(code),
				});
			}
		}

		return right({ success: true });
	}
	private getDescriptionForCode(code: string): string {
		const descriptions: Record<string, string> = {
			"users:view": "Visualizar usuários",
			"users:create": "Criar usuários",
			"users:edit": "Editar usuários",
			"users:delete": "Excluir usuários",
		};

		return descriptions[code] || code;
	}
}

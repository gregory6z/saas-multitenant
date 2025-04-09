import { left, right, type Either } from "@/core/either.js";
import type {
	CheckPermissionRequest,
	CheckPermissionResponse,
} from "../check-permission.js";
import { PermissionDeniedError } from "../../errors/rbac.errors.ts";

/**
 * Implementação de CheckPermissionUseCase para testes
 * Permite configurar facilmente quais permissões são permitidas
 */
export class InMemoryCheckPermissionUseCase {
	private allowedPermissions: Record<string, boolean> = {};

	/**
	 * Configura uma permissão específica como permitida ou negada
	 */
	allowPermission(permission: string, allowed = true): void {
		this.allowedPermissions[permission] = allowed;
	}
	/**
	 * Configura várias permissões de uma vez
	 */
	allowPermissions(permissions: string[]): void {
		for (const permission of permissions) {
			this.allowedPermissions[permission] = true;
		}
	}

	/**
	 * Limpa todas as permissões configuradas
	 */
	clearPermissions(): void {
		this.allowedPermissions = {};
	}

	/**
	 * Implementação do método execute compatível com CheckPermissionUseCase
	 */
	async execute({
		permission,
	}: CheckPermissionRequest): Promise<
		Either<PermissionDeniedError, CheckPermissionResponse>
	> {
		if (this.allowedPermissions[permission]) {
			return right({ hasPermission: true });
		}

		return left(new PermissionDeniedError(permission));
	}
}

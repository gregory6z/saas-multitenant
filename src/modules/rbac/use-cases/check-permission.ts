import { left, right, type Either } from "@/core/either.js";
import { ROLE_PERMISSIONS } from "../constants/roles.ts";
import { PermissionDeniedError } from "../errors/rbac.errors.ts";

export interface CheckPermissionRequest {
	userId: string; // Para uso futuro: permissões específicas por usuário
	tenantId: string; // Para uso futuro: permissões específicas por tenant
	userRole: string;
	permission: string;
}

export interface CheckPermissionResponse {
	hasPermission: true;
}

type CheckPermissionResult = Either<
	PermissionDeniedError,
	CheckPermissionResponse
>;

export class CheckPermissionUseCase {
	async execute({
		// userId, // Não utilizado na implementação inicial
		// tenantId, // Não utilizado na implementação inicial
		userRole,
		permission,
	}: CheckPermissionRequest): Promise<CheckPermissionResult> {
		// Implementação atual: verificação baseada apenas na role
		const permissions = ROLE_PERMISSIONS[userRole] || [];

		if (permissions.includes(permission)) {
			return right({ hasPermission: true });
		}

		return left(new PermissionDeniedError(permission));
	}
}

import type { Tenant } from "@/core/entities/Tenant.js";
import { left, right, type Either } from "@/core/either.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import type { CheckPermissionUseCase } from "@/modules/rbac/use-cases/check-permission.js";
import { PERMISSIONS } from "@/modules/rbac/constants/permissions.js";
import {
	TenantNotFoundError,
	UnauthorizedTenantAccessError,
	CrossTenantOperationError,
} from "../errors/tenant.errors.ts";

interface UpdateTenantRequest {
	tenantId: string;
	name?: string;
	status?: "active" | "inactive" | "suspended";
	ragflowId?: string | null;
	currentUserId: string;
	currentUserRole: string;
	currentUserTenantId: string;
}

interface UpdateTenantResponse {
	tenant: Tenant;
}

type UpdateTenantResult = Either<
	| TenantNotFoundError
	| UnauthorizedTenantAccessError
	| CrossTenantOperationError,
	UpdateTenantResponse
>;

export class UpdateTenantUseCase {
	constructor(
		private tenantsRepository: TenantsRepository,
		private checkPermissionUseCase: CheckPermissionUseCase,
	) {}

	async execute({
		tenantId,
		name,
		status,
		ragflowId,
		currentUserId,
		currentUserRole,
		currentUserTenantId,
	}: UpdateTenantRequest): Promise<UpdateTenantResult> {
		// Verificar se o tenant existe
		const tenant = await this.tenantsRepository.findById(tenantId);

		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		// Verificar se o usuário está tentando atualizar seu próprio tenant
		if (tenantId !== currentUserTenantId) {
			return left(new CrossTenantOperationError());
		}

		// Verificar se o usuário tem permissão para editar tenant
		const editPermissionCheck = await this.checkPermissionUseCase.execute({
			userRole: currentUserRole,
			permission: PERMISSIONS.TENANT_EDIT,
			userId: currentUserId,
			tenantId: currentUserTenantId,
		});

		if (editPermissionCheck.isLeft()) {
			return left(new UnauthorizedTenantAccessError());
		}

		// Preparar os dados para atualização
		const updateData: Partial<Tenant> = {};

		if (name !== undefined) updateData.name = name;
		if (status !== undefined) updateData.status = status;

		// Verificar se ragflowId foi explicitamente fornecido como parâmetro
		// Usamos hasOwnProperty para verificar se a propriedade existe no objeto original
		// biome-ignore lint/style/noArguments: <explanation>
		const requestObj = arguments[0];
		if (Object.prototype.hasOwnProperty.call(requestObj, "ragflowId")) {
			updateData.ragflowId = ragflowId as string | undefined;
		}

		// Atualizar o tenant
		const updatedTenant = await this.tenantsRepository.update(
			tenantId,
			updateData,
		);

		if (!updatedTenant) {
			return left(new TenantNotFoundError());
		}

		return right({
			tenant: updatedTenant,
		});
	}
}

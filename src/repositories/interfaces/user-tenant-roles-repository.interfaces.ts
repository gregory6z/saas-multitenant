import type {
	UserTenantRole,
	CreateUserTenantRoleDTO,
	UpdateUserTenantRoleDTO,
} from "@/core/entities/UserTenantRole.js";

export interface UserTenantRolesRepository {
	findById(id: string): Promise<UserTenantRole | null>;
	findByUserAndTenant(
		userId: string,
		tenantId: string,
	): Promise<UserTenantRole | null>;
	findByTenant(tenantId: string): Promise<UserTenantRole[]>;
	findByUser(userId: string): Promise<UserTenantRole[]>;
	create(data: CreateUserTenantRoleDTO): Promise<UserTenantRole>;
	update(
		id: string,
		data: UpdateUserTenantRoleDTO,
	): Promise<UserTenantRole | null>;
	delete(id: string): Promise<void>;
}

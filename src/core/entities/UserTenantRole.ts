export type UserRole = "owner" | "admin" | "curator" | "user";

export interface UserTenantRole {
	id: string;
	userId: string;
	tenantId: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateUserTenantRoleDTO {
	userId: string;
	tenantId: string;
	role: UserRole;
}

export interface UpdateUserTenantRoleDTO {
	role?: UserRole;
}

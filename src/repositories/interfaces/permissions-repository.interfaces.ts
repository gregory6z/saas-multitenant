import type { Permission } from "@/core/entities/Permission.js";

export interface CreatePermissionDTO {
	code: string;
	name: string;
	description?: string;
}

export interface PermissionsRepository {
	findByCode(code: string): Promise<Permission | null>;
	findAll(): Promise<Permission[]>;
	create(data: CreatePermissionDTO): Promise<Permission>;
}

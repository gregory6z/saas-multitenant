import type { Permission } from "@/core/entities/Permission.js";
import type {
	CreatePermissionDTO,
	PermissionsRepository,
} from "@/repositories/interfaces/permissions-repository.interfaces.js";
import { randomUUID } from "node:crypto";

export class InMemoryPermissionsRepository implements PermissionsRepository {
	public items: Permission[] = [];

	async findByCode(code: string): Promise<Permission | null> {
		const permission = this.items.find((item) => item.code === code);

		if (!permission) {
			return null;
		}

		return permission;
	}

	async findAll(): Promise<Permission[]> {
		return [...this.items];
	}

	async create(data: CreatePermissionDTO): Promise<Permission> {
		const permission: Permission = {
			id: randomUUID(),
			code: data.code,
			name: data.name,
			description: data.description ?? "",
		};

		this.items.push(permission);

		return permission;
	}
}

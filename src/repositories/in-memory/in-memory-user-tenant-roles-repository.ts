import { randomUUID } from "node:crypto";
import type {
	UserTenantRole,
	CreateUserTenantRoleDTO,
	UpdateUserTenantRoleDTO,
} from "@/core/entities/UserTenantRole.js";
import type { UserTenantRolesRepository } from "@/repositories/interfaces/user-tenant-roles-repository.interfaces.js";

export class InMemoryUserTenantRolesRepository
	implements UserTenantRolesRepository
{
	public items: UserTenantRole[] = [];

	async findById(id: string): Promise<UserTenantRole | null> {
		const userTenantRole = this.items.find((item) => item.id === id);
		if (!userTenantRole) return null;
		return userTenantRole;
	}

	async findByUserAndTenant(
		userId: string,
		tenantId: string,
	): Promise<UserTenantRole | null> {
		const userTenantRole = this.items.find(
			(item) => item.userId === userId && item.tenantId === tenantId,
		);
		if (!userTenantRole) return null;
		return userTenantRole;
	}

	async findByTenant(tenantId: string): Promise<UserTenantRole[]> {
		return this.items.filter((item) => item.tenantId === tenantId);
	}

	async findByUser(userId: string): Promise<UserTenantRole[]> {
		return this.items.filter((item) => item.userId === userId);
	}

	async create(data: CreateUserTenantRoleDTO): Promise<UserTenantRole> {
		const userTenantRole: UserTenantRole = {
			id: randomUUID(),
			userId: data.userId,
			tenantId: data.tenantId,
			role: data.role,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.items.push(userTenantRole);
		return userTenantRole;
	}

	async update(
		id: string,
		data: UpdateUserTenantRoleDTO,
	): Promise<UserTenantRole | null> {
		const userTenantRoleIndex = this.items.findIndex((item) => item.id === id);

		if (userTenantRoleIndex === -1) return null;

		const userTenantRole = this.items[userTenantRoleIndex];

		this.items[userTenantRoleIndex] = {
			...userTenantRole,
			...data,
			updatedAt: new Date(),
		};

		return this.items[userTenantRoleIndex];
	}

	async delete(id: string): Promise<void> {
		const userTenantRoleIndex = this.items.findIndex((item) => item.id === id);

		if (userTenantRoleIndex !== -1) {
			this.items.splice(userTenantRoleIndex, 1);
		}
	}

	async deleteByUser(userId: string): Promise<void> {
		this.items = this.items.filter((item) => item.userId !== userId);
	}
}

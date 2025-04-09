import type { Tenant } from "@/core/entities/Tenant.js";
import type {
	CreateTenantDTO,
	TenantsRepository,
	UpdateTenantDTO,
} from "../interfaces/tenants-repositories.interfaces.js";
import { randomUUID } from "node:crypto";

export class InMemoryTenantsRepository implements TenantsRepository {
	public items: Tenant[] = [];

	async findById(id: string): Promise<Tenant | null> {
		const tenant = this.items.find((item) => item.id === id);

		if (!tenant) {
			return null;
		}

		return tenant;
	}

	async findBySubdomain(subdomain: string): Promise<Tenant | null> {
		const tenant = this.items.find((item) => item.subdomain === subdomain);

		if (!tenant) {
			return null;
		}

		return tenant;
	}

	async findByOwnerId(ownerId: string): Promise<Tenant[]> {
		return this.items.filter((item) => item.ownerId === ownerId);
	}

	async findAll(): Promise<Tenant[]> {
		return [...this.items];
	}

	async create(data: CreateTenantDTO): Promise<Tenant> {
		const tenant: Tenant = {
			id: randomUUID(),
			name: data.name,
			subdomain: data.subdomain,
			status: data.status || "active",
			ownerId: data.ownerId,
			ragflowId: data.ragflowId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.items.push(tenant);

		return tenant;
	}

	async update(id: string, data: UpdateTenantDTO): Promise<Tenant | null> {
		const tenantIndex = this.items.findIndex((item) => item.id === id);

		if (tenantIndex === -1) {
			return null;
		}

		const tenant = this.items[tenantIndex];
		const updatedTenant = {
			...tenant,
			...data,
			updatedAt: new Date(),
		};

		this.items[tenantIndex] = updatedTenant;

		return updatedTenant;
	}

	async delete(id: string): Promise<void> {
		const tenantIndex = this.items.findIndex((item) => item.id === id);

		if (tenantIndex === -1) {
			return;
		}

		this.items.splice(tenantIndex, 1);
	}
}

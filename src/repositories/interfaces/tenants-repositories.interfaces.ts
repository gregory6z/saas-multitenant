import type { Tenant } from "@/core/entities/Tenant.js";

export interface CreateTenantDTO {
	name: string;
	subdomain: string;
	ownerId: string;
	status?: "active" | "inactive" | "suspended";
	ragflowId?: string;
}

export interface UpdateTenantDTO {
	name?: string;
	subdomain?: string;
	status?: "active" | "inactive" | "suspended";
	ragflowId?: string;
}

export interface TenantsRepository {
	findById(id: string): Promise<Tenant | null>;
	findBySubdomain(subdomain: string): Promise<Tenant | null>;
	findByOwnerId(ownerId: string): Promise<Tenant[]>;
	findAll(): Promise<Tenant[]>;
	create(data: CreateTenantDTO): Promise<Tenant>;
	update(id: string, data: UpdateTenantDTO): Promise<Tenant | null>;
	delete(id: string): Promise<void>;
	findBySubdomain(subdomain: string): Promise<Tenant | null>;
}

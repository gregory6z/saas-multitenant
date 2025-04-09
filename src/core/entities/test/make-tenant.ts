import type { Tenant } from "@/core/entities/Tenant.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";

/**
 * Factory function to create a Tenant object for testing purposes
 * @param override - Optional partial Tenant object to override default values
 * @returns A complete Tenant object
 */
export function makeTenant(override: Partial<Tenant> = {}): Tenant {
	return {
		id: "tenant-1",
		name: "Test Organization",
		subdomain: "test-org",
		status: "active",
		ownerId: "user-1",
		createdAt: new Date(),
		updatedAt: new Date(),
		...override,
	};
}

/**
 * Factory function to create multiple Tenant objects for testing purposes
 * @param count - Number of tenants to create
 * @param override - Optional partial Tenant object to override default values
 * @returns An array of Tenant objects
 */
export function makeTenants(
	count: number,
	override: Partial<Tenant> = {},
): Tenant[] {
	return Array.from({ length: count }, (_, i) =>
		makeTenant({
			id: `tenant-${i + 1}`,
			name: `Test Organization ${i + 1}`,
			subdomain: `test-org-${i + 1}`,
			...override,
		}),
	);
}

/**
 * Helper function to create a tenant in the repository from makeTenant
 * @param repository - The tenants repository
 * @param override - Optional partial Tenant object to override default values
 * @returns A promise that resolves to the created Tenant
 */
export async function createTenantInRepository(
	repository: TenantsRepository,
	override: Partial<Tenant> = {},
): Promise<Tenant> {
	const tenantData = makeTenant(override);

	// Cria uma cópia do objeto excluindo os campos que não devem ser passados para o create
	const { id, createdAt, updatedAt, ...createData } = tenantData;

	return repository.create(createData);
}

/**
 * Helper function to add a tenant directly to an in-memory repository
 * @param repository - The in-memory tenants repository with items array
 * @param override - Optional partial Tenant object to override default values
 * @returns The created Tenant
 */
export function addTenantToInMemoryRepository(
	repository: { items: Tenant[] },
	override: Partial<Tenant> = {},
): Tenant {
	const tenant = makeTenant(override);
	repository.items.push(tenant);
	return tenant;
}

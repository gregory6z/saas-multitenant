import { left, right, type Either } from "@/core/either.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import { TenantNotFoundError } from "../errors/tenant.errors.ts";

interface GetTenantByDomainRequest {
	subdomain: string;
}

interface GetTenantByDomainResponse {
	tenant: {
		id: string;
		name: string;
		subdomain: string;
		status: string;
		createdAt: Date;
		updatedAt: Date;
	};
}

type GetTenantByDomainResult = Either<
	TenantNotFoundError,
	GetTenantByDomainResponse
>;

export class GetTenantByDomainUseCase {
	constructor(private tenantsRepository: TenantsRepository) {}

	async execute({
		subdomain,
	}: GetTenantByDomainRequest): Promise<GetTenantByDomainResult> {
		const tenant = await this.tenantsRepository.findBySubdomain(subdomain);

		if (!tenant) {
			return left(new TenantNotFoundError());
		}

		return right({
			tenant: {
				id: tenant.id,
				name: tenant.name,
				subdomain: tenant.subdomain,
				status: tenant.status,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
			},
		});
	}
}

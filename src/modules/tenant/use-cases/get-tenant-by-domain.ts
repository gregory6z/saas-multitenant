import { left, right, type Either } from "@/core/either.js";
import type { Tenant } from "@/core/entities/Tenant.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import { TenantNotFoundError } from "../errors/tenant.errors.ts";

interface GetTenantByDomainRequest {
	subdomain: string;
}

interface GetTenantByDomainResponse {
	tenant: Tenant;
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
			tenant,
		});
	}
}

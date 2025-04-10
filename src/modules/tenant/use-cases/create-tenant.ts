import type { Tenant } from "@/core/entities/Tenant.js";
import { left, right, type Either } from "@/core/either.js";
import type { TenantsRepository } from "@/repositories/interfaces/tenants-repositories.interfaces.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";
import type { UserTenantRolesRepository } from "@/repositories/interfaces/user-tenant-roles-repository.interfaces.js";
import { DomainEvents } from "@/core/events/domain-events.js";
import { TenantCreatedEvent } from "../events/tenant-created-event.ts";
import { SubdomainAlreadyInUseError } from "../errors/tenant.errors.ts";
import { UserNotFoundError } from "@/modules/account/errors/account.errors.ts";

interface CreateTenantRequest {
	name: string;
	subdomain: string;
	ownerId: string;
	status?: "active" | "inactive" | "suspended";
	ragflowId?: string;
}

interface CreateTenantResponse {
	tenant: Tenant;
}

type CreateTenantResult = Either<
	SubdomainAlreadyInUseError | UserNotFoundError,
	CreateTenantResponse
>;

export class CreateTenantUseCase {
	constructor(
		private tenantsRepository: TenantsRepository,
		private usersRepository: UsersRepository,
		private userTenantRolesRepository: UserTenantRolesRepository,
	) {}

	async execute({
		name,
		subdomain,
		ownerId,
		status = "active",
		ragflowId,
	}: CreateTenantRequest): Promise<CreateTenantResult> {
		const tenantWithSameSubdomain =
			await this.tenantsRepository.findBySubdomain(subdomain);

		if (tenantWithSameSubdomain) {
			return left(new SubdomainAlreadyInUseError(subdomain));
		}

		const owner = await this.usersRepository.findById(ownerId);

		if (!owner) {
			return left(new UserNotFoundError());
		}

		const tenant = await this.tenantsRepository.create({
			name,
			subdomain,
			ownerId,
			status,
			ragflowId,
		});

		await this.userTenantRolesRepository.create({
			userId: ownerId,
			tenantId: tenant.id,
			role: "owner",
		});

		DomainEvents.markEvent(
			new TenantCreatedEvent({
				tenantId: tenant.id,
				name: tenant.name,
				subdomain: tenant.subdomain,
				ownerId: tenant.ownerId,
			}),
		);

		return right({
			tenant,
		});
	}
}

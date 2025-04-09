import type { Event } from "@/core/events/event.ts";

interface TenantCreatedEventData {
	tenantId: string;
	name: string;
	subdomain: string;
	ownerId: string;
}

export class TenantCreatedEvent implements Event {
	public name = "tenant.created";
	public occurredAt: Date;

	constructor(public data: TenantCreatedEventData) {
		this.occurredAt = new Date();
	}
}

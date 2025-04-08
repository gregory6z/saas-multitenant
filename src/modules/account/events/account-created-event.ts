import type { Event } from "@/core/events/event.ts";
import type { User } from "@/core/entities/User.js";

export class AccountCreatedEvent implements Event {
	public name = "account.created";
	public occurredAt: Date;

	constructor(public user: User) {
		this.occurredAt = new Date();
	}
}

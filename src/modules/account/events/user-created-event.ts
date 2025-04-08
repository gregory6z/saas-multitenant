import type { Event } from "@/core/events/event.ts";

interface UserCreatedEventData {
	userId: string;
	email: string;
	name: string;
	verificationToken: string;
}

export class UserCreatedEvent implements Event {
	public name = "user.created";
	public occurredAt: Date;

	constructor(public data: UserCreatedEventData) {
		this.occurredAt = new Date();
	}
}

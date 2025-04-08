import type { Event } from "@/core/events/event.ts";
import type { EventHandler } from "@/core/events/event-handler.ts";

export const DomainEvents = {
	handlers: {} as Record<string, EventHandler[]>,
	markedEvents: [] as Event[],

	markEvent(event: Event): void {
		DomainEvents.markedEvents.push(event);
	},

	async dispatchEventsForAggregate(): Promise<void> {
		const events = DomainEvents.markedEvents;
		DomainEvents.markedEvents = [];

		for (const event of events) {
			await DomainEvents.dispatch(event);
		}
	},

	register<E extends Event>(eventName: string, handler: EventHandler<E>): void {
		if (!DomainEvents.handlers[eventName]) {
			DomainEvents.handlers[eventName] = [];
		}

		DomainEvents.handlers[eventName].push(handler);
	},

	async dispatch(event: Event): Promise<void> {
		const eventName = event.name;
		const handlers = DomainEvents.handlers[eventName];

		if (!handlers || handlers.length === 0) {
			return;
		}

		for (const handler of handlers) {
			await handler.handle(event);
		}
	},

	clearHandlers(eventName: string): void {
		DomainEvents.handlers[eventName] = [];
	},

	clearMarkedEvents(): void {
		DomainEvents.markedEvents = [];
	},
};

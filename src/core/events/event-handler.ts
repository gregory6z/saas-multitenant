import type { Event } from "@/core/events/event.ts";

export interface EventHandler<E extends Event = Event> {
	handle(event: E): Promise<void>;
}

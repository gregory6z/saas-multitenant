import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { DomainEvents } from "@/core/events/domain-events.ts";
import type { Event } from "@/core/events/event.ts";
import type { EventHandler } from "@/core/events/event-handler.ts";

class TestEvent implements Event {
	public readonly name = "test.event";
	public readonly occurredAt = new Date();

	constructor(public readonly payload: { value: string }) {}
}

class TestEventHandler implements EventHandler<TestEvent> {
	public handledEvents: TestEvent[] = [];

	async handle(event: TestEvent): Promise<void> {
		this.handledEvents.push(event);
	}
}

describe("DomainEvents", () => {
	beforeEach(() => {
		DomainEvents.clearHandlers("test.event");
		DomainEvents.clearMarkedEvents();
	});

	test("should register and call event handlers", async () => {
		// Arrange
		const handler = new TestEventHandler();
		DomainEvents.register("test.event", handler);

		const event = new TestEvent({ value: "test value" });

		// Act
		await DomainEvents.dispatch(event);

		// Assert
		assert.strictEqual(handler.handledEvents.length, 1);
		assert.strictEqual(handler.handledEvents[0].payload.value, "test value");
	});

	test("should mark events and dispatch them later", async () => {
		// Arrange
		const handler = new TestEventHandler();
		DomainEvents.register("test.event", handler);

		const event = new TestEvent({ value: "test value" });

		// Act
		DomainEvents.markEvent(event);
		assert.strictEqual(handler.handledEvents.length, 0); // Ainda não foi disparado

		await DomainEvents.dispatchEventsForAggregate();

		// Assert
		assert.strictEqual(handler.handledEvents.length, 1);
		assert.strictEqual(handler.handledEvents[0].payload.value, "test value");
	});

	test("should not call handlers for different events", async () => {
		// Arrange
		const handler = new TestEventHandler();
		DomainEvents.register("different.event", handler);

		const event = new TestEvent({ value: "test value" });

		// Act
		await DomainEvents.dispatch(event);

		// Assert
		assert.strictEqual(handler.handledEvents.length, 0);
	});

	test("should call multiple handlers for the same event", async () => {
		// Arrange
		const handler1 = new TestEventHandler();
		const handler2 = new TestEventHandler();

		DomainEvents.register("test.event", handler1);
		DomainEvents.register("test.event", handler2);

		const event = new TestEvent({ value: "test value" });

		// Act
		await DomainEvents.dispatch(event);

		// Assert
		assert.strictEqual(handler1.handledEvents.length, 1);
		assert.strictEqual(handler2.handledEvents.length, 1);
	});

	test("should clear handlers for a specific event", async () => {
		// Arrange
		const handler = new TestEventHandler();
		DomainEvents.register("test.event", handler);

		// Act
		DomainEvents.clearHandlers("test.event");
		await DomainEvents.dispatch(new TestEvent({ value: "test value" }));

		// Assert
		assert.strictEqual(handler.handledEvents.length, 0);
	});

	test("should clear marked events", async () => {
		// Arrange
		const handler = new TestEventHandler();
		DomainEvents.register("test.event", handler);

		DomainEvents.markEvent(new TestEvent({ value: "test value" }));

		// Act
		DomainEvents.clearMarkedEvents();
		await DomainEvents.dispatchEventsForAggregate();

		// Assert
		assert.strictEqual(handler.handledEvents.length, 0);
	});
});

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { InMemoryEmailProvider } from "./in-memory-email-provider.js";

describe("InMemoryEmailProvider", () => {
	let emailProvider: InMemoryEmailProvider;

	beforeEach(() => {
		emailProvider = new InMemoryEmailProvider();
	});

	test("should store sent emails", async () => {
		// Arrange
		const emailParams = {
			to: "user@example.com",
			subject: "Test Email",
			body: "This is a test email",
		};

		// Act
		await emailProvider.sendMail(emailParams);

		// Assert
		assert.strictEqual(emailProvider.emails.length, 1);
		assert.strictEqual(emailProvider.emails[0].to, "user@example.com");
		assert.strictEqual(emailProvider.emails[0].subject, "Test Email");
		assert.strictEqual(emailProvider.emails[0].body, "This is a test email");
	});

	test("should clear emails when requested", async () => {
		// Arrange
		await emailProvider.sendMail({
			to: "user@example.com",
			subject: "Test Email",
			body: "This is a test email",
		});

		// Act
		emailProvider.clearEmails();

		// Assert
		assert.strictEqual(emailProvider.emails.length, 0);
	});

	test("should get the last email sent", async () => {
		// Arrange
		await emailProvider.sendMail({
			to: "first@example.com",
			subject: "First Email",
			body: "This is the first email",
		});

		await emailProvider.sendMail({
			to: "second@example.com",
			subject: "Second Email",
			body: "This is the second email",
		});

		// Act
		const lastEmail = emailProvider.getLastEmail();

		// Assert
		assert.strictEqual(lastEmail?.to, "second@example.com");
		assert.strictEqual(lastEmail?.subject, "Second Email");
	});

	test("should check if email was sent to specific address", async () => {
		// Arrange
		await emailProvider.sendMail({
			to: "user1@example.com",
			subject: "Test Email",
			body: "This is a test email",
		});

		// Act & Assert
		assert.strictEqual(emailProvider.wasEmailSentTo("user1@example.com"), true);
		assert.strictEqual(
			emailProvider.wasEmailSentTo("user2@example.com"),
			false,
		);
	});
});

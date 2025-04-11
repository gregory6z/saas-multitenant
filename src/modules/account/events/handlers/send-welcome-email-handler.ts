import type { EventHandler } from "@/core/events/event-handler.ts";
import type { AccountCreatedEvent } from "../account-created-event.ts";
import type { EmailProvider } from "@/providers/email/email-provider.ts";

export class SendWelcomeEmailHandler
	implements EventHandler<AccountCreatedEvent>
{
	constructor(private emailProvider: EmailProvider) {}

	async handle(event: AccountCreatedEvent): Promise<void> {
		const { user } = event;

		await this.emailProvider.sendMail({
			to: user.email,
			subject: "Welcome to our platform!",
			body: `Hello ${user.name}, welcome to our platform!`,
			html: `
        <h1>Welcome, ${user.name}!</h1>
        <p>Thank you for creating an account on our platform.</p>
        <p>You can now start using our services.</p>
      `,
			variables: {
				name: user.name,
				email: user.email,
			},
		});
	}
}

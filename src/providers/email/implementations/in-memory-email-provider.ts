import type {
	EmailProvider,
	EmailSendParams,
} from "@/providers/email/email-provider.ts";

export class InMemoryEmailProvider implements EmailProvider {
	public emails: EmailSendParams[] = [];

	async sendMail(params: EmailSendParams): Promise<void> {
		this.emails.push(params);
	}

	clearEmails(): void {
		this.emails = [];
	}

	getLastEmail(): EmailSendParams | undefined {
		if (this.emails.length === 0) {
			return undefined;
		}

		return this.emails[this.emails.length - 1];
	}

	wasEmailSentTo(email: string): boolean {
		return this.emails.some((item) => item.to === email);
	}
}

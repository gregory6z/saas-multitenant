import type { EmailProvider } from "../email-provider.js";
import { InMemoryEmailProvider } from "../implementations/in-memory-email-provider.js";

export function makeEmailProvider(): EmailProvider {
	return new InMemoryEmailProvider();
}

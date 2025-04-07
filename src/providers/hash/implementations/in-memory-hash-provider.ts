import type { HashProvider } from "../hash-provider.js";

export class InMemoryHashProvider implements HashProvider {
	async generateHash(payload: string): Promise<string> {
		return `hashed:${payload}`;
	}

	async compareHash(payload: string, hashed: string): Promise<boolean> {
		return hashed === `hashed:${payload}`;
	}
}

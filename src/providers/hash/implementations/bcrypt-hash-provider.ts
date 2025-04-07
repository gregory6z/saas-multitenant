import { compare, hash } from "bcryptjs";
import type { HashProvider } from "@/providers/hash/hash-provider.js";

export class BcryptHashProvider implements HashProvider {
	async generateHash(payload: string): Promise<string> {
		return hash(payload, 8);
	}

	async compareHash(payload: string, hashed: string): Promise<boolean> {
		return compare(payload, hashed);
	}
}

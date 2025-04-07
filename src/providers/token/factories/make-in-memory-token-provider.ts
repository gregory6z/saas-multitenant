import type { TokenProvider } from "../token-provider.js";
import { InMemoryTokenProvider } from "../implementations/in-memory-token-provider.js";

export function makeInMemoryTokenProvider(): TokenProvider {
	return new InMemoryTokenProvider();
}

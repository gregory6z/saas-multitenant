import type { HashProvider } from "../hash-provider.js";
import { BcryptHashProvider } from "../implementations/bcrypt-hash-provider.js";

export function makeHashProvider(): HashProvider {
	return new BcryptHashProvider();
}

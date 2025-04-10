import type { User, UserRole, VerificationData } from "@/core/entities/User.js";
import type { UsersRepository } from "@/repositories/interfaces/users-repositories.interfaces.js";

/**
 * Factory function to create a User object for testing purposes
 * @param override - Optional partial User object to override default values
 * @returns A complete User object
 */
export function makeUser(override: Partial<User> = {}): User {
	return {
		id: "user-1",
		name: "John Doe",
		email: "john@example.com",
		passwordHash: "hashed-password",
		createdAt: new Date(),
		updatedAt: new Date(),
		emailVerification: {
			token: null,
			expiresAt: null,
			verified: false,
			verifiedAt: null,
		} as VerificationData,
		...override,
	};
}

/**
 * Factory function to create multiple User objects for testing purposes
 * @param count - Number of users to create
 * @param override - Optional partial User object to override default values
 * @returns An array of User objects
 */
export function makeUsers(count: number, override: Partial<User> = {}): User[] {
	return Array.from({ length: count }, (_, i) =>
		makeUser({
			id: `user-${i + 1}`,
			email: `user${i + 1}@example.com`,
			...override,
		}),
	);
}

/**
 * Helper function to create a user in the repository from makeUser
 * @param repository - The users repository
 * @param override - Optional partial User object to override default values
 * @returns A promise that resolves to the created User
 */
export async function createUserInRepository(
	repository: UsersRepository,
	override: Partial<User> = {},
): Promise<User> {
	const userData = makeUser(override);

	// Cria uma cópia do objeto excluindo os campos que não devem ser passados para o create
	const { id, createdAt, updatedAt, ...createData } = userData;

	return repository.create(createData);
}

/**
 * Helper function to add a user directly to an in-memory repository
 * @param repository - The in-memory users repository with items array
 * @param override - Optional partial User object to override default values
 * @returns The created User
 */
export function addUserToInMemoryRepository(
	repository: { items: User[] },
	override: Partial<User> = {},
): User {
	const user = makeUser(override);
	repository.items.push(user);
	return user;
}

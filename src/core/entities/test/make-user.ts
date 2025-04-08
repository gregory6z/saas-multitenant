import type { User, UserRole, VerificationData } from "@/core/entities/User.js";

/**
 * Factory function to create a User object for testing purposes
 * @param override - Optional partial User object to override default values
 * @returns A complete User object
 */
export function makeUser(override: Partial<User> = {}): User {
	return {
		id: "user-1",
		tenantId: "tenant-1",
		name: "John Doe",
		email: "john@example.com",
		passwordHash: "hashed-password",
		role: "user" as UserRole,
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

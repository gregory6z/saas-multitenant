import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryTokenProvider } from "@/providers/token/implementations/in-memory-token-provider.js";
import { AuthenticateUserUseCase } from "./authenticate-user.js";
import { InvalidCredentialsError } from "../errors/auth.errors.js";

describe("AuthenticateUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let hashProvider: InMemoryHashProvider;
	let tokenProvider: InMemoryTokenProvider;
	let sut: AuthenticateUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		hashProvider = new InMemoryHashProvider();
		tokenProvider = new InMemoryTokenProvider();
		sut = new AuthenticateUserUseCase(
			usersRepository,
			hashProvider,
			tokenProvider,
		);
	});

	test("should authenticate a user with valid credentials", async () => {
		// Arrange
		const password = "password123";
		const hashedPassword = await hashProvider.generateHash(password);

		const user = await usersRepository.create({
			name: "Test User",
			email: "user@example.com",
			passwordHash: hashedPassword,
			tenantId: "tenant-1",
			role: "user",
		});

		// Act
		const result = await sut.execute({
			email: "user@example.com",
			password: "password123",
		});

		// Assert
		assert.ok(result.isRight());
		assert.ok(result.value.token);

		// Verify the token contains the correct user information
		const payload = await tokenProvider.verifyToken(result.value.token);
		assert.strictEqual(payload.userId, user.id);
		assert.strictEqual(payload.tenantId, "tenant-1");
		assert.strictEqual(payload.role, "user");
	});

	test("should return an error when email is not found", async () => {
		// Act
		const result = await sut.execute({
			email: "nonexistent@example.com",
			password: "password123",
		});

		// Assert
		assert.ok(result.isLeft());
		assert.ok(result.value instanceof InvalidCredentialsError);
	});

	test("should return an error when password is incorrect", async () => {
		// Arrange
		const password = "password123";
		const hashedPassword = await hashProvider.generateHash(password);

		await usersRepository.create({
			name: "Test User",
			email: "user@example.com",
			passwordHash: hashedPassword,
			tenantId: "tenant-1",
			role: "user",
		});

		// Act
		const result = await sut.execute({
			email: "user@example.com",
			password: "wrong-password",
		});

		// Assert
		assert.ok(result.isLeft());
		assert.ok(result.value instanceof InvalidCredentialsError);
	});

	test("should authenticate an admin user", async () => {
		// Arrange
		const password = "admin-password";
		const hashedPassword = await hashProvider.generateHash(password);

		const adminUser = await usersRepository.create({
			name: "Admin User",
			email: "admin@example.com",
			passwordHash: hashedPassword,
			tenantId: "tenant-1",
			role: "admin",
		});

		// Act
		const result = await sut.execute({
			email: "admin@example.com",
			password: "admin-password",
		});

		// Assert
		assert.ok(result.isRight());

		// Verify the token contains the correct role
		const payload = await tokenProvider.verifyToken(result.value.token);
		assert.strictEqual(payload.userId, adminUser.id);
		assert.strictEqual(payload.role, "admin");
	});

	test("should handle multiple users with same email in different tenants", async () => {
		// Arrange
		const password = "password123";
		const hashedPassword = await hashProvider.generateHash(password);

		// Create two users with the same email in different tenants
		const user1 = await usersRepository.create({
			name: "User Tenant 1",
			email: "same@example.com",
			passwordHash: hashedPassword,
			tenantId: "tenant-1",
			role: "user",
		});

		await usersRepository.create({
			name: "User Tenant 2",
			email: "same@example.com",
			passwordHash: hashedPassword,
			tenantId: "tenant-2",
			role: "manager",
		});

		// Act - Without specifying tenant, should return the first found
		const result = await sut.execute({
			email: "same@example.com",
			password: "password123",
		});

		// Assert
		assert.ok(result.isRight());

		// Should find the first user (implementation dependent)
		const payload = await tokenProvider.verifyToken(result.value.token);
		// Note: This assertion depends on the implementation of findByEmailGlobal
		// If it returns the first match, it will be user1
		assert.strictEqual(payload.userId, user1.id);
	});
});

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryTokenProvider } from "@/providers/token/implementations/in-memory-token-provider.js";
import { AuthenticateUserUseCase } from "./authenticate-user.js";
import { InvalidCredentialsError } from "../errors/auth.errors.js";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";

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

	test("should authenticate a user with valid credentials and return both token and refresh token", async () => {
		// Arrange
		const password = "password123";
		const hashedPassword = await hashProvider.generateHash(password);

		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: hashedPassword,
		});

		// Act
		const result = await sut.execute({
			email: "user@example.com",
			password: "password123",
		});

		// Assert
		assert.ok(result.isRight());
		assert.ok(result.value.token, "Should return an access token");
		assert.ok(result.value.refreshToken, "Should return a refresh token");

		// Verify the access token contains the correct user information
		const accessTokenPayload = await tokenProvider.verifyToken(
			result.value.token,
		);
		assert.strictEqual(accessTokenPayload.userId, user.id);

		// Verify the refresh token contains the correct user ID and a family
		const refreshTokenPayload = await tokenProvider.verifyRefreshToken(
			result.value.refreshToken,
		);
		assert.strictEqual(refreshTokenPayload.userId, user.id);
		assert.ok(
			refreshTokenPayload.family,
			"Refresh token should contain a family ID",
		);
	});

	test("should generate different tokens for different authentication attempts", async () => {
		// Arrange
		const password = "password123";
		const hashedPassword = await hashProvider.generateHash(password);

		await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: hashedPassword,
		});

		// Act - First authentication
		const result1 = await sut.execute({
			email: "user@example.com",
			password: "password123",
		});

		// Act - Second authentication
		const result2 = await sut.execute({
			email: "user@example.com",
			password: "password123",
		});

		// Assert
		assert.ok(result1.isRight());
		assert.ok(result2.isRight());

		// Tokens should be different
		assert.notStrictEqual(
			result1.value.token,
			result2.value.token,
			"Access tokens should be different for different authentication attempts",
		);

		// Refresh tokens should be different
		assert.notStrictEqual(
			result1.value.refreshToken,
			result2.value.refreshToken,
			"Refresh tokens should be different for different authentication attempts",
		);
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

		await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: hashedPassword,
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
});

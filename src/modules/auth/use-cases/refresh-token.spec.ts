import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { InMemoryTokenProvider } from "@/providers/token/implementations/in-memory-token-provider.js";
import { RefreshTokenUseCase } from "./refresh-token.js";
import {
	InvalidRefreshTokenError,
	InvalidTokenError,
} from "../errors/auth.errors.js";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";

describe("RefreshTokenUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let tokenProvider: InMemoryTokenProvider;
	let sut: RefreshTokenUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		tokenProvider = new InMemoryTokenProvider();
		sut = new RefreshTokenUseCase(usersRepository, tokenProvider);
	});

	test("should generate new tokens with a valid refresh token", async () => {
		// Arrange
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
		});

		const refreshToken = await tokenProvider.generateRefreshToken({
			userId: user.id,
			family: "family-1",
		});

		// Act
		const result = await sut.execute({
			refreshToken,
		});

		// Assert
		assert.ok(result.isRight());
		assert.ok(result.value.token);
		assert.ok(result.value.refreshToken);

		// Verify the token contains the correct user information
		const payload = await tokenProvider.verifyToken(result.value.token);
		assert.strictEqual(payload.userId, user.id);
	});

	test("should return a new refresh token different from the original", async () => {
		// Arrange
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
		});

		const originalRefreshToken = await tokenProvider.generateRefreshToken({
			userId: user.id,
			family: "family-1",
		});

		// Act
		const result = await sut.execute({
			refreshToken: originalRefreshToken,
		});

		// Assert
		assert.ok(result.isRight());
		assert.notStrictEqual(
			result.value.refreshToken,
			originalRefreshToken,
			"New refresh token should be different from the original",
		);
	});

	test("should maintain the same family in the new refresh token", async () => {
		// Arrange
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
		});

		const originalRefreshToken = await tokenProvider.generateRefreshToken({
			userId: user.id,
			family: "family-1",
		});

		// Act
		const result = await sut.execute({
			refreshToken: originalRefreshToken,
		});

		// Assert
		assert.ok(result.isRight());

		// Verify the new refresh token has the same family
		const originalPayload =
			await tokenProvider.verifyRefreshToken(originalRefreshToken);
		const newPayload = await tokenProvider.verifyRefreshToken(
			result.value.refreshToken,
		);

		assert.strictEqual(
			newPayload.family,
			originalPayload.family,
			"New refresh token should maintain the same family",
		);
	});

	test("should return an error when refresh token is invalid", async () => {
		// Act
		const result = await sut.execute({
			refreshToken: "invalid-refresh-token",
		});

		// Assert
		assert.ok(result.isLeft());
		assert.ok(
			result.value instanceof InvalidTokenError ||
				result.value instanceof InvalidRefreshTokenError,
		);
	});

	test("should return an error when user does not exist", async () => {
		// Arrange
		const refreshToken = await tokenProvider.generateRefreshToken({
			userId: "non-existent-user-id",
			family: "family-1",
		});

		// Act
		const result = await sut.execute({
			refreshToken,
		});

		// Assert
		assert.ok(result.isLeft());
		assert.ok(result.value instanceof InvalidRefreshTokenError);
	});

	test("should be able to use the new refresh token for another refresh", async () => {
		// Arrange
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
		});

		const originalRefreshToken = await tokenProvider.generateRefreshToken({
			userId: user.id,
			family: "family-1",
		});

		// First refresh
		const firstRefreshResult = await sut.execute({
			refreshToken: originalRefreshToken,
		});

		assert.ok(firstRefreshResult.isRight());
		const newRefreshToken = firstRefreshResult.value.refreshToken;

		// Act - Second refresh using the new token
		const secondRefreshResult = await sut.execute({
			refreshToken: newRefreshToken,
		});

		// Assert
		assert.ok(
			secondRefreshResult.isRight(),
			"Should be able to use the new refresh token",
		);
		assert.ok(secondRefreshResult.value.token, "Should get a new access token");
		assert.ok(
			secondRefreshResult.value.refreshToken,
			"Should get another refresh token",
		);
	});
});

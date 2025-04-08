import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import {
	EmailAlreadyInUseError,
	UserNotFoundError,
	UnauthorizedRoleChangeError,
} from "../errors/account.errors.ts";
import { UpdateUserUseCase } from "./update-user.ts";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";

describe("UpdateUserService", () => {
	let usersRepository: InMemoryUsersRepository;
	let hashProvider: InMemoryHashProvider;
	let sut: UpdateUserUseCase;
	let userId: string;

	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository();
		hashProvider = new InMemoryHashProvider();
		sut = new UpdateUserUseCase(usersRepository, hashProvider);

		// Criar um usuário para os testes usando nossa função auxiliar
		const user = await createUserInRepository(usersRepository, {
			name: "John Doe",
			email: "john@example.com",
			passwordHash: "hashed:123456",
			tenantId: "tenant-1",
			role: "user",
		});

		userId = user.id;
	});

	test("should be able to update user name", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			name: "John Updated",
			currentUserRole: "user",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Updated");
			assert.strictEqual(user.email, "john@example.com"); // unchanged
			assert.strictEqual(user.role, "user"); // unchanged
		}
	});

	test("should be able to update user email", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			email: "john-updated@example.com",
			currentUserRole: "user",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Doe"); // unchanged
			assert.strictEqual(user.email, "john-updated@example.com");
			assert.strictEqual(user.role, "user"); // unchanged
		}
	});

	test("should be able to update user password", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			password: "new-password",
			currentUserRole: "user",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.passwordHash, "hashed:new-password");
		}
	});

	test("should allow admin to update user role", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			role: "manager",
			currentUserRole: "admin",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.role, "manager");
		}
	});

	test("should not allow non-admin to update user role", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			role: "admin",
			currentUserRole: "user",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof UnauthorizedRoleChangeError);
		}
	});

	test("should not update user with non-existent ID", async () => {
		const result = await sut.execute({
			userId: "non-existent-id",
			tenantId: "tenant-1",
			name: "Updated Name",
			currentUserRole: "user",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof UserNotFoundError);
		}
	});

	test("should not allow email update if email is already in use by another user", async () => {
		// Create another user with a different email
		await createUserInRepository(usersRepository, {
			name: "Another User",
			email: "another@example.com",
			passwordHash: "hashed:123456",
			tenantId: "tenant-1",
			role: "user",
		});

		// Try to update the first user's email to the second user's email
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			email: "another@example.com",
			currentUserRole: "user",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof EmailAlreadyInUseError);
		}
	});

	test("should allow email update if email is already in use but in a different tenant", async () => {
		await createUserInRepository(usersRepository, {
			name: "Another User",
			email: "same@example.com",
			passwordHash: "hashed:123456",
			tenantId: "tenant-2", // Different tenant
			role: "user",
		});

		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			email: "same@example.com",
			currentUserRole: "user",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.email, "same@example.com");
		}
	});

	test("should return the same user if no fields are provided for update", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			currentUserRole: "user",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Doe");
			assert.strictEqual(user.email, "john@example.com");
			assert.strictEqual(user.role, "user");
		}
	});

	test("should update multiple fields at once", async () => {
		const result = await sut.execute({
			userId,
			tenantId: "tenant-1",
			name: "John Updated",
			email: "john-updated@example.com",
			password: "new-password",
			currentUserRole: "admin",
			role: "manager",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Updated");
			assert.strictEqual(user.email, "john-updated@example.com");
			assert.strictEqual(user.passwordHash, "hashed:new-password");
			assert.strictEqual(user.role, "manager");
		}
	});
});

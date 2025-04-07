import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryHashProvider } from "@/providers/hash/implementations/in-memory-hash-provider.js";
import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { EmailAlreadyInUseError } from "../errors/account.errors.ts";
import { CreateAccountUseCase } from "./create-account.ts";

describe("CreateAccountService", () => {
	let usersRepository: InMemoryUsersRepository;
	let hashProvider: InMemoryHashProvider;
	let sut: CreateAccountUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		hashProvider = new InMemoryHashProvider();
		sut = new CreateAccountUseCase(usersRepository, hashProvider);
	});

	test("should be able to create a new user account", async () => {
		const result = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Doe");
			assert.strictEqual(user.email, "john@example.com");
			assert.strictEqual(user.tenantId, "tenant-1");
			assert.strictEqual(user.role, "user");
			assert.strictEqual(user.passwordHash, "hashed:123456");
			assert.ok(usersRepository.items.length === 1);
		}
	});

	test("should be able to create a user with a specific role", async () => {
		const result = await sut.execute({
			name: "Admin User",
			email: "admin@example.com",
			password: "123456",
			tenantId: "tenant-1",
			role: "admin",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.role, "admin");
		}
	});

	test("should not be able to create a user with an email that is already in use in the same tenant", async () => {
		await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		const result = await sut.execute({
			name: "Another John",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof EmailAlreadyInUseError);
			assert.strictEqual(
				result.value.message,
				'The email "john@example.com" is already in use.',
			);
		}
	});

	test("should be able to create users with the same email in different tenants", async () => {
		const result1 = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-1",
		});

		const result2 = await sut.execute({
			name: "John Doe",
			email: "john@example.com",
			password: "123456",
			tenantId: "tenant-2",
		});

		assert.ok(result1.isRight());
		assert.ok(result2.isRight());
		assert.strictEqual(usersRepository.items.length, 2);
	});
});

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { GetUserUseCase } from "./get-user.js";
import {
	CrossTenantOperationError,
	UserNotFoundError,
} from "../errors/account.errors.ts";

describe("GetUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let sut: GetUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		sut = new GetUserUseCase(usersRepository);
	});

	test("should successfully retrieve a user from the same tenant", async () => {
		// Create a user
		const user = await usersRepository.create({
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: user.id,
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(result.value.user.id, user.id);
		assert.strictEqual(result.value.user.name, "Test User");
		assert.strictEqual(result.value.user.email, "user@example.com");
		assert.strictEqual(result.value.user.tenantId, "tenant-1");
	});

	test("should return an error when trying to get a user from a different tenant", async () => {
		// Create a user in tenant-1
		const user = await usersRepository.create({
			name: "Test User",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
		});

		// Try to get the user from tenant-2
		const result = await sut.execute({
			userId: user.id,
			tenantId: "tenant-2",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
	});

	test("should return an error when the user does not exist", async () => {
		const result = await sut.execute({
			userId: "non-existent-user-id",
			tenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
	});

	test("should retrieve an admin user from the same tenant", async () => {
		// Create an admin user
		const adminUser = await usersRepository.create({
			name: "Admin User",
			email: "admin@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
		});

		const result = await sut.execute({
			userId: adminUser.id,
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(result.value.user.id, adminUser.id);
		assert.strictEqual(result.value.user.role, "admin");
	});

	test("should retrieve a manager user from the same tenant", async () => {
		// Create a manager user
		const managerUser = await usersRepository.create({
			name: "Manager User",
			email: "manager@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "manager",
		});

		const result = await sut.execute({
			userId: managerUser.id,
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(result.value.user.id, managerUser.id);
		assert.strictEqual(result.value.user.role, "manager");
	});
});

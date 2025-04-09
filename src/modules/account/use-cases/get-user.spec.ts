import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { GetUserUseCase } from "./get-user.js";
import {
	CrossTenantOperationError,
	UserNotFoundError,
} from "../errors/account.errors.ts";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";

describe("GetUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let sut: GetUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		sut = new GetUserUseCase(usersRepository);
	});

	test("should successfully retrieve a user from the same tenant", async () => {
		// Create a user
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
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
		const user = await createUserInRepository(usersRepository, {
			name: "Test User",
			email: "user@example.com",
			tenantId: "tenant-1",
			role: "user",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: false,
				verifiedAt: null,
			},
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
		const adminUser = await createUserInRepository(usersRepository, {
			name: "Admin User",
			email: "admin@example.com",
			tenantId: "tenant-1",
			role: "admin",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: true,
				verifiedAt: new Date(),
			},
		});

		const result = await sut.execute({
			userId: adminUser.id,
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(result.value.user.id, adminUser.id);
		assert.strictEqual(result.value.user.role, "admin");
	});

	test("should retrieve a curator user from the same tenant", async () => {
		// Create a curator user
		const curatorUser = await createUserInRepository(usersRepository, {
			name: "curator User",
			email: "curator@example.com",
			tenantId: "tenant-1",
			role: "curator",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: true,
				verifiedAt: new Date(),
			},
		});

		const result = await sut.execute({
			userId: curatorUser.id,
			tenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(result.value.user.id, curatorUser.id);
		assert.strictEqual(result.value.user.role, "curator");
	});
});

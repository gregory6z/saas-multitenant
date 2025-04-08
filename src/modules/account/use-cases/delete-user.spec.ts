import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { DeleteUserUseCase } from "./delete-user.js";
import {
	UnauthorizedOperationError,
	UserNotFoundError,
	CrossTenantOperationError,
} from "../errors/account.errors.ts";
import { makeUser } from "@/core/entities/test/make-user.ts";
import type { User } from "@/core/entities/User.js";

describe("DeleteUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let sut: DeleteUserUseCase;

	async function createUserFromMake(
		override: Partial<User> = {},
	): Promise<User> {
		const userData = makeUser(override);

		const { id, createdAt, updatedAt, ...createData } = userData;

		return usersRepository.create(createData);
	}

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		sut = new DeleteUserUseCase(usersRepository);
	});

	test("should allow an admin to delete a regular user", async () => {
		const adminUser = await createUserFromMake({
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

		const userToDelete = await createUserFromMake({
			name: "User to Delete",
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

		const result = await sut.execute({
			userId: userToDelete.id,
			currentUserRole: "admin",
			currentUserId: adminUser.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(await usersRepository.findById(userToDelete.id), null);
	});

	test("should not allow an admin to delete another admin", async () => {
		const adminUser1 = await createUserFromMake({
			name: "Admin User 1",
			email: "admin1@example.com",
			tenantId: "tenant-1",
			role: "admin",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: true,
				verifiedAt: new Date(),
			},
		});

		const adminUser2 = await createUserFromMake({
			name: "Admin User 2",
			email: "admin2@example.com",
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
			userId: adminUser2.id,
			currentUserRole: "admin",
			currentUserId: adminUser1.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.ok(await usersRepository.findById(adminUser2.id));
	});

	test("should not allow an admin to delete a user from another tenant", async () => {
		const adminUser = await createUserFromMake({
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

		const userInOtherTenant = await createUserFromMake({
			name: "User in Other Tenant",
			email: "user@example.com",
			tenantId: "tenant-2",
			role: "user",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: false,
				verifiedAt: null,
			},
		});

		const result = await sut.execute({
			userId: userInOtherTenant.id,
			currentUserRole: "admin",
			currentUserId: adminUser.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof CrossTenantOperationError);
		assert.ok(await usersRepository.findById(userInOtherTenant.id));
	});

	test("should allow a user to delete their own account", async () => {
		const user = await createUserFromMake({
			name: "Regular User",
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

		const result = await sut.execute({
			userId: user.id,
			currentUserRole: "user",
			currentUserId: user.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());
		assert.strictEqual(await usersRepository.findById(user.id), null);
	});

	test("should not allow a regular user to delete another user", async () => {
		const user = await createUserFromMake({
			name: "Regular User",
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

		const anotherUser = await createUserFromMake({
			name: "Another User",
			email: "another@example.com",
			tenantId: "tenant-1",
			role: "user",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: false,
				verifiedAt: null,
			},
		});

		const result = await sut.execute({
			userId: anotherUser.id,
			currentUserRole: "user",
			currentUserId: user.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.ok(await usersRepository.findById(anotherUser.id));
	});

	test("should not allow a manager to delete another user", async () => {
		const manager = await createUserFromMake({
			name: "Manager User",
			email: "manager@example.com",
			tenantId: "tenant-1",
			role: "manager",
			emailVerification: {
				token: null,
				expiresAt: null,
				verified: true,
				verifiedAt: new Date(),
			},
		});

		const user = await createUserFromMake({
			name: "Regular User",
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

		const result = await sut.execute({
			userId: user.id,
			currentUserRole: "manager",
			currentUserId: manager.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UnauthorizedOperationError);
		assert.ok(await usersRepository.findById(user.id));
	});

	test("should return an error when the user to be deleted does not exist", async () => {
		const admin = await createUserFromMake({
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
			userId: "non-existent-user",
			currentUserRole: "admin",
			currentUserId: admin.id,
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());
		assert.ok(result.value instanceof UserNotFoundError);
	});
});

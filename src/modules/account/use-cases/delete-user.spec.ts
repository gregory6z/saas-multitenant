import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import { DeleteUserUseCase } from "./delete-user.js";
import {
	UnauthorizedOperationError,
	UserNotFoundError,
	CrossTenantOperationError,
} from "../errors/account.errors.ts";

describe("DeleteUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let sut: DeleteUserUseCase;

	beforeEach(() => {
		usersRepository = new InMemoryUsersRepository();
		sut = new DeleteUserUseCase(usersRepository);
	});

	test("should allow an admin to delete a regular user", async () => {
		// Create an admin user
		const adminUser = await usersRepository.create({
			name: "Admin User",
			email: "admin@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Create a user to delete
		const userToDelete = await usersRepository.create({
			name: "User to Delete",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
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
		// Create first admin user
		const adminUser1 = await usersRepository.create({
			name: "Admin User 1",
			email: "admin1@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Create second admin user
		const adminUser2 = await usersRepository.create({
			name: "Admin User 2",
			email: "admin2@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
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
		// Create an admin user in tenant-1
		const adminUser = await usersRepository.create({
			name: "Admin User",
			email: "admin@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
		});

		// Create a user in tenant-2
		const userInOtherTenant = await usersRepository.create({
			name: "User in Other Tenant",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-2",
			role: "user",
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
		const user = await usersRepository.create({
			name: "Regular User",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
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
		const user = await usersRepository.create({
			name: "Regular User",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
		});

		const anotherUser = await usersRepository.create({
			name: "Another User",
			email: "another@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
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
		const manager = await usersRepository.create({
			name: "Manager User",
			email: "manager@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "manager",
		});

		const user = await usersRepository.create({
			name: "Regular User",
			email: "user@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "user",
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
		const admin = await usersRepository.create({
			name: "Admin User",
			email: "admin@example.com",
			passwordHash: "hashed-password",
			tenantId: "tenant-1",
			role: "admin",
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

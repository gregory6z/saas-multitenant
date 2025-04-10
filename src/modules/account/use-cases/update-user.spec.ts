import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

import { InMemoryUsersRepository } from "@/repositories/in-memory/in-memory-users-repositories.js";
import {
	EmailAlreadyInUseError,
	UserNotFoundError,
	UnauthorizedOperationError,
} from "../errors/account.errors.ts";
import { UpdateUserUseCase } from "./update-user.ts";
import { createUserInRepository } from "@/core/entities/test/make-user.ts";

describe("UpdateUserUseCase", () => {
	let usersRepository: InMemoryUsersRepository;
	let sut: UpdateUserUseCase;
	let userId: string;

	beforeEach(async () => {
		usersRepository = new InMemoryUsersRepository();
		sut = new UpdateUserUseCase(usersRepository);

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

	test("should be able to update user name when it's the same user", async () => {
		const result = await sut.execute({
			userId,
			name: "John Updated",
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Updated");
			assert.strictEqual(user.email, "john@example.com"); // unchanged
		}
	});

	test("should be able to update user email when it's the same user", async () => {
		const result = await sut.execute({
			userId,
			email: "john-updated@example.com",
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Doe"); // unchanged
			assert.strictEqual(user.email, "john-updated@example.com");
		}
	});

	test("should not allow updating another user's information", async () => {
		// Criar outro usuário
		const anotherUser = await createUserInRepository(usersRepository, {
			name: "Another User",
			email: "another@example.com",
			passwordHash: "hashed:123456",
			tenantId: "tenant-1",
			role: "user",
		});

		const result = await sut.execute({
			userId: anotherUser.id, // Outro usuário
			name: "Attempted Update",
			currentUserId: userId, // Usuário atual
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isLeft());

		if (result.isLeft()) {
			assert.ok(result.value instanceof UnauthorizedOperationError);
		}

		// Verificar que o nome não foi alterado
		const unchangedUser = await usersRepository.findById(anotherUser.id);
		assert.strictEqual(unchangedUser?.name, "Another User");
	});

	test("should not update user with non-existent ID", async () => {
		const result = await sut.execute({
			userId: "non-existent-id",
			name: "Updated Name",
			currentUserId: "non-existent-id", // Mesmo ID para passar na verificação de autorização
			currentUserTenantId: "tenant-1",
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
			email: "another@example.com",
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
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
			email: "same@example.com",
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
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
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Doe");
			assert.strictEqual(user.email, "john@example.com");
		}
	});

	test("should update multiple fields at once", async () => {
		const result = await sut.execute({
			userId,
			name: "John Updated",
			email: "john-updated@example.com",
			currentUserId: userId, // Mesmo usuário
			currentUserTenantId: "tenant-1",
		});

		assert.ok(result.isRight());

		if (result.isRight()) {
			const { user } = result.value;
			assert.strictEqual(user.name, "John Updated");
			assert.strictEqual(user.email, "john-updated@example.com");
		}
	});
});

import type {
	CreateUserDTO,
	UpdateUserDTO,
	User,
} from "@/core/entities/User.js";

export interface UsersRepository {
	findById(id: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>;
	create(data: CreateUserDTO): Promise<User>;
	update(id: string, data: UpdateUserDTO): Promise<User | null>;
	delete(id: string): Promise<void>;
}

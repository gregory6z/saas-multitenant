export interface User {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
	updatedAt: Date;
	emailVerification: VerificationData;
}

export interface VerificationData {
	token: string | null;
	expiresAt: Date | null;
	verified: boolean;
	verifiedAt: Date | null;
}

export type UserRole = "owner" | "admin" | "curator" | "user";

export interface CreateUserDTO {
	name: string;
	email: string;
	passwordHash: string;
	emailVerification?: VerificationData;
}

export interface UpdateUserDTO {
	name?: string;
	email?: string;
	passwordHash?: string;
	emailVerification?: Partial<VerificationData>;
}

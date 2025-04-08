export interface User {
	id: string;
	tenantId: string;
	name: string;
	email: string;
	passwordHash: string;
	role: UserRole;
	createdAt: Date;
	updatedAt: Date;
	// emailVerification: VerificationData;
}

export interface VerificationData {
	token: string | null;
	expiresAt: Date | null;
	verified: boolean;
	verifiedAt?: Date | null;
}

export type UserRole = "admin" | "manager" | "user";

export interface CreateUserDTO {
	name: string;
	email: string;
	passwordHash: string;
	tenantId: string;
	role: UserRole;
}

export interface UpdateUserDTO {
	name?: string;
	email?: string;
	passwordHash?: string;
	role?: UserRole;
}

export interface Role {
	id: string;
	name: string;
	permissions: string[];
	tenantId: string | null;
}

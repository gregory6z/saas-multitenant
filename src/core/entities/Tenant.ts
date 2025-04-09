export interface Tenant {
	id: string;
	name: string; // Nome da organização
	subdomain: string; // Subdomínio único (exemplo: empresa.seuapp.com)
	status: "active" | "inactive" | "suspended";
	ownerId: string; // ID do usuário que criou/possui o tenant
	createdAt: Date;
	updatedAt: Date;

	ragflowId?: string; // ID do espaço no RAGFlow
}

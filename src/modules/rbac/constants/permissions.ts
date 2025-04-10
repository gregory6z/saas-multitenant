export const PERMISSIONS = {
	// Permissões para gerenciamento de usuários
	USERS_VIEW: "users:view",
	USERS_CREATE: "users:create",
	USERS_EDIT: "users:edit",
	USERS_DELETE: "users:delete",
	USERS_DELETE_ADMIN: "users:delete-admin",
	USERS_CHANGE_ROLE: "users:change-role",
	USERS_INVITE: "users:invite",

	// Permissões para gerenciamento de tenant
	TENANT_VIEW: "tenant:view",
	TENANT_EDIT: "tenant:edit",
	TENANT_DELETE: "tenant:delete",
	TENANT_TRANSFER_OWNERSHIP: "tenant:transfer-ownership",
	TENANT_MANAGE_BILLING: "tenant:manage-billing",
	TENANT_MANAGE_PLAN: "tenant:manage-plan",
	TENANTS_VIEW: "tenants:view",
	TENANT_CHANGE_SUBDOMAIN: "tenant:change-subdomain",

	// Permissões para chatbots
	BOTS_VIEW: "bots:view",
	BOTS_CREATE: "bots:create",
	BOTS_EDIT: "bots:edit",
	BOTS_DELETE: "bots:delete",
	BOTS_CONFIGURE: "bots:configure",
	BOTS_ADJUST_PROMPTS: "bots:adjust-prompts",

	// Permissões para bases de conhecimento
	KNOWLEDGE_VIEW: "knowledge:view",
	KNOWLEDGE_CREATE: "knowledge:create",
	KNOWLEDGE_EDIT: "knowledge:edit",
	KNOWLEDGE_DELETE: "knowledge:delete",
	KNOWLEDGE_MANAGE_SOURCES: "knowledge:manage-sources",
	KNOWLEDGE_ADJUST_RETRIEVAL: "knowledge:adjust-retrieval",

	// Permissões para conversas
	CONVERSATIONS_VIEW: "conversations:view",
	CONVERSATIONS_VIEW_OWN: "conversations:view-own",
	CONVERSATIONS_TAKEOVER: "conversations:takeover",
	CONVERSATIONS_PROVIDE_FEEDBACK: "conversations:provide-feedback",

	// Permissões para analytics
	ANALYTICS_VIEW_ALL: "analytics:view-all",
	ANALYTICS_VIEW_LIMITED: "analytics:view-limited",

	// Permissões para integrações
	INTEGRATIONS_MANAGE: "integrations:manage",
	INTEGRATIONS_RAGFLOW: "integrations:ragflow",
};

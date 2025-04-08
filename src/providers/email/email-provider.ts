/**
 * Parâmetros para envio de email
 */
export interface EmailSendParams {
	to: string;
	subject: string;
	body: string;
	html?: string;
	from?: string;
	templateId?: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	variables?: Record<string, any>;
}

/**
 * Interface para provedores de email
 */
export interface EmailProvider {
	/**
	 * Envia um email com os parâmetros fornecidos
	 */
	sendMail(params: EmailSendParams): Promise<void>;
}

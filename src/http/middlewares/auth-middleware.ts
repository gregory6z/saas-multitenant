import {
	InvalidTokenError,
	MissingTokenError,
} from "@/modules/auth/errors/auth.errors.ts";
import type { TokenProvider } from "@/providers/token/token-provider.ts";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function authMiddleware(
	request: FastifyRequest & {
		user?: { id: string; tenantId: string; role: string };
	},
	reply: FastifyReply,
	tokenProvider: TokenProvider,
) {
	try {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.status(401).send(new MissingTokenError());
		}

		const [, token] = authHeader.split(" ");

		if (!token) {
			return reply.status(401).send(new MissingTokenError());
		}

		try {
			const payload = await tokenProvider.verifyToken(token);

			request.user = {
				id: payload.userId,
				tenantId: payload.tenantId,
				role: payload.role,
			};
		} catch (error) {
			return reply.status(401).send(new InvalidTokenError());
		}
	} catch (error) {
		return reply.status(500).send({ error: "Internal server error" });
	}
}

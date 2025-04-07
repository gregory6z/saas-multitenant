import Fastify from "fastify";

// Cria a instância do servidor Fastify
const server = Fastify({
	logger: true,
});

// Rota raiz - Hello World
server.get("/", async () => {
	return { message: "Hello World" };
});

// Inicia o servidor
const start = async () => {
	try {
		await server.listen({ port: 3000, host: "0.0.0.0" });
		console.log("Servidor rodando na porta 3000");
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();

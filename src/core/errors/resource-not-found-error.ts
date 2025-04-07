import type { UseCaseError } from "@/core/errors/use-case-error.ts";

export class ResourceNotFoundError extends Error implements UseCaseError {
	constructor() {
		super("Resource not found");
	}
}

import type { UseCaseError } from "@/core/errors/use-case-error.ts";

export class NotAllowedError extends Error implements UseCaseError {
	constructor() {
		super("Not allowed");
	}
}

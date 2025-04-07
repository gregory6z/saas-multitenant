import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { type Either, left, right } from "./either.ts";
function doSomeThing(shouldSuccess: boolean): Either<string, number> {
	if (shouldSuccess) {
		return right(10);
	}
	return left("error");
}

describe("Either tests", () => {
	it("success result", () => {
		const result = doSomeThing(true);

		assert.equal(result.isRight(), true);
		assert.equal(result.isLeft(), false);
	});

	it("error result", () => {
		const result = doSomeThing(false);

		assert.equal(result.isLeft(), true);
		assert.equal(result.isRight(), false);
	});
});

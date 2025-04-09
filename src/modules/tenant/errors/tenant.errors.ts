export class SubdomainAlreadyInUseError extends Error {
	constructor(subdomain: string) {
		super(`The subdomain "${subdomain}" is already in use.`);
		this.name = "SubdomainAlreadyInUseError";
	}
}

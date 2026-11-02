// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string | null;
				/** Signed up via fediverse/ATProto and hasn't confirmed their age yet. */
				needsOnboarding: boolean;
				isAdmin: boolean;
				displayName: string | null;
				hasProfile: boolean;
			} | null;
		}
	}
}

export {};

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string;
				isAdmin: boolean;
				displayName: string | null;
				hasProfile: boolean;
			} | null;
		}
	}
}

export {};

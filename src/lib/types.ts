export type PersonCard = {
	id: string;
	name: string;
	age: number;
	pronouns: string;
	bio: string;
	distance: string;
	photos: string[];
	likedYou: boolean;
	/** Linked fediverse/Bluesky handle, only when the person opted to show it. */
	handle: { name: string; url: string | null } | null;
};

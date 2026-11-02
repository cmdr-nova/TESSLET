<script lang="ts">
	import type { PersonCard } from '#lib/types.ts';

	let { person }: { person: PersonCard } = $props();
	let index = $state(0);
	const photo = $derived(person.photos[index] ?? null);

	function next() {
		if (person.photos.length > 1) index = (index + 1) % person.photos.length;
	}
</script>

<article class="card stack" style="padding:0; overflow:hidden">
	{#if photo}
		<button type="button" class="photo-btn" onclick={next} aria-label="Next photo">
			<img class="photo" src={photo} alt="{person.name}, photo {index + 1} of {person.photos.length}" style="border-radius:0" />
			{#if person.photos.length > 1}
				<span class="dots">
					{#each person.photos as _, i (i)}<span class:on={i === index}></span>{/each}
				</span>
			{/if}
		</button>
	{/if}
	<div style="padding: 0 1rem 1rem">
		<h2 style="margin:0">
			{person.name}, {person.age}
			{#if person.pronouns}<small class="muted">({person.pronouns})</small>{/if}
		</h2>
		{#if person.distance}<p class="muted" style="margin:0">{person.distance}</p>{/if}
		{#if person.handle}
			<p style="margin:0">
				{#if person.handle.url}<a href={person.handle.url} rel="noopener nofollow" target="_blank">{person.handle.name}</a>{:else}{person.handle.name}{/if}
			</p>
		{/if}
		{#if person.likedYou}<p class="ok" style="margin:0.25rem 0 0">Likes you</p>{/if}
		{#if person.bio}<p style="white-space: pre-line">{person.bio}</p>{/if}
	</div>
</article>

<style>
	.photo-btn { all: unset; position: relative; display: block; cursor: pointer; }
	.dots { position: absolute; top: 0.5rem; left: 0.5rem; right: 0.5rem; display: flex; gap: 4px; }
	.dots span { flex: 1; height: 4px; border-radius: 2px; background: rgb(255 255 255 / 0.45); }
	.dots span.on { background: #fff; }
</style>

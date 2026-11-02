<script lang="ts">
	import { enhance } from '$app/forms';
	import PersonCard from '#lib/PersonCard.svelte';

	let { data } = $props();
</script>

<h1>Liked you</h1>
<p class="muted">Everyone who liked you, in full. Like them back and you match instantly.</p>

{#if data.people.length === 0}
	<div class="empty">No new likes yet. They'll show up here the moment someone likes you.</div>
{:else}
	<div class="stack">
		{#each data.people as person (person.id)}
			<div class="stack">
				<PersonCard {person} />
				<form method="post" action="?/answer" use:enhance class="row">
					<input type="hidden" name="target" value={person.id} />
					<button class="secondary" name="liked" value="false">Pass</button>
					<button name="liked" value="true">Like back</button>
				</form>
			</div>
		{/each}
	</div>
{/if}

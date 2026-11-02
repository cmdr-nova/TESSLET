<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import PersonCard from '#lib/PersonCard.svelte';
	import type { SubmitFunction } from '$app/forms';

	let { data } = $props();

	let gone = $state(new Set<string>());
	let match = $state<{ id: string; name: string } | null>(null);
	let error = $state('');
	let busy = $state(false);
	let dragX = $state(0);
	let startX: number | null = null;

	const queue = $derived(data.people.filter((p) => !gone.has(p.id)));
	const current = $derived(queue[0] ?? null);

	let likeForm: HTMLFormElement | undefined = $state();
	let passForm: HTMLFormElement | undefined = $state();

	const onSwipe: SubmitFunction = () => {
		const person = current;
		busy = true;
		error = '';
		return async ({ result }) => {
			busy = false;
			dragX = 0;
			if (result.type === 'success' && person) {
				gone = new Set(gone).add(person.id);
				const matchId = result.data?.matchId as string | null;
				if (matchId) match = { id: matchId, name: person.name };
				if (queue.length <= 2) await invalidateAll();
			} else if (result.type === 'failure') {
				error = (result.data?.error as string) ?? 'Something went wrong.';
			}
		};
	};

	function onKey(e: KeyboardEvent) {
		if (!current || busy || match || (e.target as HTMLElement).closest('input, textarea')) return;
		if (e.key === 'ArrowRight') likeForm?.requestSubmit();
		if (e.key === 'ArrowLeft') passForm?.requestSubmit();
	}

	function down(e: PointerEvent) {
		startX = e.clientX;
	}
	function move(e: PointerEvent) {
		if (startX != null) dragX = e.clientX - startX;
	}
	function up() {
		if (startX == null) return;
		startX = null;
		if (dragX > 120) likeForm?.requestSubmit();
		else if (dragX < -120) passForm?.requestSubmit();
		else dragX = 0;
	}
</script>

<svelte:window onkeydown={onKey} />

{#if !data.hasLocation || !data.hasPhoto}
	<div class="card stack">
		<p>Almost there! To show up and see people nearby, add
			{#if !data.hasPhoto}a photo{/if}{#if !data.hasPhoto && !data.hasLocation} and {/if}{#if !data.hasLocation}your location{/if}.
		</p>
		<a class="button" href="/profile">Finish your profile</a>
	</div>
{/if}

{#if match}
	<div class="card stack" style="text-align:center; margin-bottom:1rem">
		<h2 style="margin:0">It's a match!</h2>
		<p>You and {match.name} like each other.</p>
		<div class="row">
			<a class="button" href="/chat/{match.id}">Say hi</a>
			<button class="secondary" onclick={() => (match = null)}>Keep swiping</button>
		</div>
	</div>
{/if}

{#if error}<p class="error">{error}</p>{/if}

{#if current}
	<div
		class="swipe"
		style="transform: translateX({dragX}px) rotate({dragX / 25}deg)"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		role="group"
		aria-label="Profile of {current.name}"
	>
		{#key current.id}<PersonCard person={current} />{/key}
	</div>
	<div class="row" style="margin-top:1rem">
		<form method="post" action="?/swipe" use:enhance={onSwipe} bind:this={passForm}>
			<input type="hidden" name="target" value={current.id} />
			<input type="hidden" name="liked" value="false" />
			<button class="secondary" style="width:100%" disabled={busy}>Pass</button>
		</form>
		<form method="post" action="?/swipe" use:enhance={onSwipe} bind:this={likeForm}>
			<input type="hidden" name="target" value={current.id} />
			<input type="hidden" name="liked" value="true" />
			<button style="width:100%" disabled={busy}>Like</button>
		</form>
	</div>
	<p class="muted" style="text-align:center; font-size:0.85rem">
		Drag the card, or use your arrow keys. <a href="/u/{current.id}">Report or block</a>
	</p>
{:else if data.hasLocation && data.hasPhoto}
	<div class="empty">
		<p>You've seen everyone nearby for now.</p>
		<p>Try widening your distance or age range on your <a href="/profile">profile</a>, or check back later.</p>
	</div>
{/if}

<style>
	.swipe { touch-action: pan-y; user-select: none; transition: transform 0.05s; }
</style>

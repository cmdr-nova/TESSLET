<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, tick } from 'svelte';
	import type { SubmitFunction } from '$app/forms';

	let { data } = $props();

	type Msg = (typeof data.messages)[number];
	let messages = $state<Msg[]>([]);
	let text = $state('');
	let error = $state('');
	let list: HTMLElement | undefined = $state();

	$effect.pre(() => {
		messages = [...data.messages];
	});

	async function scrollDown() {
		await tick();
		list?.scrollTo({ top: list.scrollHeight });
	}

	onMount(() => {
		scrollDown();
		const source = new EventSource(`/chat/${data.matchId}/stream`);
		source.onmessage = (event) => {
			const msg = JSON.parse(event.data) as Msg;
			if (!messages.some((m) => m.id === msg.id)) {
				messages.push(msg);
				scrollDown();
			}
		};
		return () => source.close();
	});

	const onSend: SubmitFunction = () => {
		error = '';
		return async ({ result }) => {
			if (result.type === 'success') text = '';
			else if (result.type === 'failure') error = (result.data?.error as string) ?? "Couldn't send that.";
		};
	};

	const lastMine = $derived([...messages].reverse().find((m) => m.sender_id === data.me));
	const time = (d: Date | string) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
		}
	}
</script>

<div class="top">
	<a class="person" href="/u/{data.other.id}">
		{#if data.other.photo}<img class="thumb" src={data.other.photo} alt="" />{/if}
		<strong>{data.other.name}</strong>
	</a>
	<form method="post" action="?/unmatch">
		<button class="link" onclick={(e) => { if (!confirm(`Unmatch ${data.other.name}? This can't be undone.`)) e.preventDefault(); }}>Unmatch</button>
	</form>
</div>

<div class="messages" bind:this={list}>
	{#if messages.length === 0}
		<p class="empty">You matched with {data.other.name}. Say hi!</p>
	{/if}
	{#each messages as m (m.id)}
		<div class="bubble" class:mine={m.sender_id === data.me}>
			<span>{m.body}</span>
			<small>{time(m.created_at)}{#if m.id === lastMine?.id && m.read_at} · Seen{/if}</small>
		</div>
	{/each}
</div>

{#if error}<p class="error">{error}</p>{/if}
<form method="post" action="?/send" use:enhance={onSend} class="composer">
	<textarea name="body" rows="1" maxlength="2000" placeholder="Message {data.other.name}" bind:value={text} onkeydown={onKeydown}></textarea>
	<button disabled={!text.trim()}>Send</button>
</form>
<p class="muted" style="font-size:0.85rem; text-align:center">
	Something off? <a href="/u/{data.other.id}">Report or block {data.other.name}</a>
</p>

<style>
	.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
	.top form { margin: 0; }
	.messages { display: flex; flex-direction: column; gap: 0.4rem; height: 60vh; overflow-y: auto; padding: 0.5rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
	.bubble { max-width: 80%; align-self: flex-start; background: var(--bg); border: 1px solid var(--line); border-radius: 18px; padding: 0.45rem 0.8rem; white-space: pre-wrap; overflow-wrap: anywhere; }
	.bubble.mine { align-self: flex-end; background: var(--accent); color: var(--accent-text); border-color: transparent; }
	.bubble small { display: block; font-size: 0.7rem; opacity: 0.75; }
	.composer { display: flex; gap: 0.5rem; margin-top: 0.75rem; align-items: flex-end; }
	.composer textarea { min-height: 2.75rem; }
</style>

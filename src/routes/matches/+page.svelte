<script lang="ts">
	let { data } = $props();
</script>

<h1>Matches</h1>
{#if data.matches.length === 0}
	<div class="empty">No matches yet. Head to <a href="/discover">Discover</a> or check who <a href="/likes">liked you</a>.</div>
{:else}
	<ul class="list">
		{#each data.matches as m (m.id)}
			<li class="card">
				<a class="person" href="/chat/{m.id}">
					{#if m.photo}<img class="thumb" src={m.photo} alt="" />{:else}<span class="thumb"></span>{/if}
					<span style="min-width:0">
						<strong>{m.name}</strong>
						{#if m.unread}<span class="badge">{m.unread}</span>{/if}
						<span class="muted" style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">{m.preview}</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

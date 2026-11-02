<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<h1>Moderation queue</h1>
{#if data.reports.length === 0}
	<div class="empty">No open reports. Nice.</div>
{:else}
	<div class="stack">
		{#each data.reports as r (r.id)}
			<article class="card stack">
				<div>
					<strong>{r.target_name ?? '(no profile)'}</strong> <span class="muted">{r.target_email}</span>
					<p style="margin:0">
						<span class="badge">{data.reasons[r.reason] ?? r.reason}</span>
						reported by {r.reporter_name ?? 'someone'} · {new Date(r.created_at).toLocaleString()}
						· {r.total_reports} report{r.total_reports === 1 ? '' : 's'} total
					</p>
				</div>
				{#if r.details}<blockquote style="margin:0; white-space:pre-line">{r.details}</blockquote>{/if}
				{#if r.photos.length}
					<div class="row" style="flex-wrap:wrap">
						{#each r.photos as src (src)}<img class="thumb" style="border-radius:8px; width:80px; height:100px" {src} alt="" />{/each}
					</div>
				{/if}
				<form method="post" use:enhance class="row" style="flex-wrap:wrap">
					<input type="hidden" name="id" value={r.id} />
					<input type="hidden" name="target" value={r.target_id} />
					<button class="secondary" formaction="?/dismiss">Dismiss</button>
					<button class="secondary" formaction="?/hidePhotos">Hide photos</button>
					<button class="danger" formaction="?/suspend">Suspend user</button>
				</form>
			</article>
		{/each}
	</div>
{/if}

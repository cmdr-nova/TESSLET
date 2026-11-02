<script lang="ts">
	let { verb = 'Sign in' }: { verb?: string } = $props();
</script>

<div class="stack">
	<form method="post" action="/auth/fedi" class="card stack">
		<label>{verb} with Mastodon, GoToSocial, or another fediverse server
			<input name="instance" placeholder="@you@mastodon.social or mastodon.social" autocomplete="username" required />
		</label>
		<button class="secondary">Continue with the fediverse</button>
	</form>
	<form method="post" action="/auth/atproto" class="card stack">
		<label>{verb} with Bluesky or your own PDS
			<input name="handle" placeholder="you.bsky.social" autocomplete="username" required />
		</label>
		<button class="secondary">Continue with Bluesky</button>
	</form>
	<p class="muted" style="font-size:0.85rem; margin:0">
		We only ask your server who you are. We can't post, read your DMs, or see who you follow.
	</p>
</div>

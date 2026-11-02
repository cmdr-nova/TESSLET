<script lang="ts">
	let { data } = $props();
</script>

<section class="stack" style="text-align:center; padding: 2rem 0">
	<h1>Dating without the paywall.</h1>
	<p class="muted">
		See everyone who likes you. Match. Talk. No subscriptions, no blurred photos, no "boosts".
	</p>
	{#if data.user}
		<div class="cta"><a class="button" href="/discover">Start discovering</a></div>
	{:else}
		<div class="cta">
			<a class="button" href="/signup">Create an account</a>
			<a class="button secondary" href="/login">Log in</a>
		</div>
	{/if}
</section>

<script lang="ts">
	let { data } = $props();
</script>

<h1>About {data.appName}</h1>
<div class="stack">
	<p>
		{data.appName} is a dating app with every feature free. You can see everyone who liked you, match, and chat.
		There are no subscriptions, no blurred photos, and no paid boosts. There never will be.
	</p>
	<h2>How we keep you safe</h2>
	<ul>
		<li>Your exact location is never stored. We round it to a ~2 km grid and only show rough distances.</li>
		<li>Photos are re-encoded on upload, which strips hidden metadata like GPS coordinates.</li>
		<li>Blocking is total: a blocked person can't see you anywhere, and any match is closed.</li>
		<li>Every report is read by a real person.</li>
	</ul>
	<h2>Support the project</h2>
	<p>
		The app is free and stays free. If you'd like to help cover hosting, you can subscribe on
		<a href={data.supportUrl} rel="noopener" target="_blank">my website</a>, which comes with all the perks already on offer there.
	</p>
</div>

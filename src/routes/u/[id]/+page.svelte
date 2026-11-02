<script lang="ts">
	import PersonCard from '#lib/PersonCard.svelte';

	let { data, form } = $props();
</script>

<PersonCard person={data.person} />

<section class="card stack" style="margin-top:1rem">
	<h2 style="margin:0">Safety</h2>
	<form method="post" action="?/block">
		<button class="secondary">Block {data.person.name}</button>
		<p class="muted">You'll disappear from each other everywhere, and any match or chat is closed. They aren't told.</p>
	</form>

	<form method="post" action="?/report" class="stack">
		<label>Report {data.person.name}
			<select name="reason" required>
				<option value="">Choose a reason</option>
				{#each Object.entries(data.reasons) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</label>
		<label>What happened? (optional) <textarea name="details" maxlength="2000"></textarea></label>
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<button class="danger">Report and block</button>
	</form>
</section>

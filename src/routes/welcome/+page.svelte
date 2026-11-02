<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Welcome{data.handle ? `, ${data.handle}` : ''}!</h1>
<form method="post" class="card stack">
	<p class="muted">One quick step before you set up your profile.</p>
	<label>Birthdate <input name="birthdate" type="date" required /></label>
	<label>Email (optional)
		<input name="email" type="email" autocomplete="email" placeholder="Only used if you're an admin" />
	</label>
	<label class="checks">
		<span><input type="checkbox" name="agree" /> I'm 18+ and I'll be kind. Harassment, scams, and fake profiles get removed.</span>
	</label>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<button>Continue</button>
</form>

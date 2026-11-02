<script lang="ts">
	let { form } = $props();
</script>

<h1>Create your account</h1>
<form method="post" class="card stack">
	<label>Email <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} /></label>
	<label>Password <input name="password" type="password" autocomplete="new-password" minlength="10" required /></label>
	<label>Birthdate <input name="birthdate" type="date" required /></label>
	<label class="checks">
		<span><input type="checkbox" name="agree" /> I'm 18+ and I'll be kind. Harassment, scams, and fake profiles get removed.</span>
	</label>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<button>Sign up</button>
	<p class="muted">Already here? <a href="/login">Log in</a></p>
</form>

<script lang="ts">
	let { form } = $props();
</script>

<h1>Welcome back</h1>
<form method="post" class="card stack">
	<label>Email <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} /></label>
	<label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<button>Log in</button>
	<p class="muted">New here? <a href="/signup">Create an account</a></p>
</form>

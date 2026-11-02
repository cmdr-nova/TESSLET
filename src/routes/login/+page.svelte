<script lang="ts">
	import { page } from '$app/state';
	import ExternalLogin from '#lib/ExternalLogin.svelte';
	let { form } = $props();
	const oauthError = $derived(page.url.searchParams.get('error'));
</script>

<h1>Welcome back</h1>
{#if oauthError}<p class="error">{oauthError}</p>{/if}
<form method="post" class="card stack">
	<label>Email <input name="email" type="email" autocomplete="email" required value={form?.email ?? ''} /></label>
	<label>Password <input name="password" type="password" autocomplete="current-password" required /></label>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<button>Log in</button>
	<p class="muted">New here? <a href="/signup">Create an account</a></p>
</form>

<h2 style="margin-top:2rem">Or use an account you already have</h2>
<ExternalLogin verb="Sign in" />

<script lang="ts">
	import { page } from '$app/state';
	import ExternalLogin from '#lib/ExternalLogin.svelte';
	let { form } = $props();
	const oauthError = $derived(page.url.searchParams.get('error'));
</script>

<h1>Create your account</h1>
{#if oauthError}<p class="error">{oauthError}</p>{/if}
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

<h2 style="margin-top:2rem">Or use an account you already have</h2>
<ExternalLogin verb="Sign up" />

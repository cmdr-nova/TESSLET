<script lang="ts">
	import { page } from '$app/state';
	import ExternalLogin from '#lib/ExternalLogin.svelte';

	let { data, form } = $props();
	const oauthError = $derived(page.url.searchParams.get('error'));
	const linked = $derived(page.url.searchParams.get('linked'));
	const providerName = { mastodon: 'Fediverse', atproto: 'Bluesky / ATProto' };
</script>

<h1>Account</h1>
{#if oauthError}<p class="error">{oauthError}</p>{/if}
{#if linked}<p class="ok">Connected!</p>{/if}
{#if form?.error}<p class="error">{form.error}</p>{/if}

<div class="card stack">
	{#if data.user?.email}<p style="margin:0">Email: <strong>{data.user.email}</strong></p>{/if}
	<p style="margin:0"><a href="/account/export" download>Download all my data</a> (JSON)</p>
</div>

<section class="card stack" style="margin-top:1rem">
	<h2 style="margin:0">Connected accounts</h2>
	{#if data.identities.length === 0}
		<p class="muted" style="margin:0">None yet. Connect one to sign in with it, and optionally show it on your profile.</p>
	{:else}
		<ul class="list">
			{#each data.identities as i (i.handle)}
				<li class="row" style="align-items:center">
					<span>
						<strong>{providerName[i.provider]}</strong>:
						{#if i.profile_url}<a href={i.profile_url} rel="noopener" target="_blank">{i.handle}</a>{:else}{i.handle}{/if}
					</span>
					<form method="post" action="?/unlink" style="flex:none">
						<input type="hidden" name="handle" value={i.handle} />
						<button class="link">Disconnect</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
	<ExternalLogin verb="Connect" />
</section>

<form method="post" action="?/delete" class="card stack" style="margin-top:1rem">
	<h2 style="margin:0">Delete account</h2>
	<p class="muted">This permanently deletes your profile, photos, matches, and messages. It can't be undone.</p>
	{#if data.hasPassword}
		<label>Confirm your password <input type="password" name="password" autocomplete="current-password" required /></label>
	{:else}
		<label>Type DELETE to confirm <input name="confirm" autocomplete="off" required /></label>
	{/if}
	<button class="danger">Delete my account forever</button>
</form>

<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Account</h1>
<div class="card stack">
	<p>Signed in as <strong>{data.user?.email}</strong></p>
	<p><a href="/account/export" download>Download all my data</a> (JSON)</p>
</div>

<form method="post" action="?/delete" class="card stack" style="margin-top:1rem">
	<h2 style="margin:0">Delete account</h2>
	<p class="muted">This permanently deletes your profile, photos, matches, and messages. It can't be undone.</p>
	<label>Confirm your password <input type="password" name="password" autocomplete="current-password" required /></label>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<button class="danger">Delete my account forever</button>
</form>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();
	const p = $derived(data.profile);

	let lat = $state('');
	let lng = $state('');
	let locStatus = $state('');

	function useLocation() {
		if (!navigator.geolocation) {
			locStatus = "Your browser doesn't support location.";
			return;
		}
		locStatus = 'Finding you...';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				lat = pos.coords.latitude.toFixed(4);
				lng = pos.coords.longitude.toFixed(4);
				locStatus = 'Got it. Save to update (it gets rounded to about 2 km).';
			},
			() => (locStatus = 'Location was blocked. You can type coordinates instead.'),
			{ enableHighAccuracy: false, timeout: 10000 }
		);
	}
</script>

<h1>{p ? 'Your profile' : 'Set up your profile'}</h1>

{#if page.url.searchParams.get('welcome')}
	<p class="ok">Profile saved. Add at least one photo so people can find you.</p>
{/if}
{#if form?.error}<p class="error">{form.error}</p>{/if}
{#if form?.saved}<p class="ok">Saved.</p>{/if}

{#if p}
	<section class="card stack">
		<h2 style="margin:0">Photos ({data.photos.length}/{data.maxPhotos})</h2>
		{#if data.photos.length === 0}
			<p class="muted">You won't show up in Discover until you add a photo.</p>
		{/if}
		<div class="grid">
			{#each data.photos as photo (photo.id)}
				<form method="post" action="?/removePhoto" use:enhance class="stack">
					<img class="photo" src={photo.url} alt="Your profile" />
					<input type="hidden" name="id" value={photo.id} />
					<button class="secondary">Remove</button>
				</form>
			{/each}
		</div>
		{#if data.photos.length < data.maxPhotos}
			<form method="post" action="?/addPhoto" enctype="multipart/form-data" use:enhance class="row">
				<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required />
				<button>Upload</button>
			</form>
		{/if}
	</section>
{/if}

<form method="post" action="?/save" class="card stack" style="margin-top:1rem">
	<label>Name <input name="display_name" maxlength="40" required value={p?.display_name ?? ''} /></label>
	<label>Pronouns <input name="pronouns" maxlength="30" placeholder="she/her" value={p?.pronouns ?? ''} /></label>
	<label>Bio <textarea name="bio" maxlength="1000" placeholder="Say something real">{p?.bio ?? ''}</textarea></label>

	<fieldset>
		<legend>I am</legend>
		<div class="checks">
			{#each [['woman', 'A woman'], ['man', 'A man'], ['nonbinary', 'Nonbinary']] as [value, label] (value)}
				<label><input type="radio" name="gender" {value} checked={p?.gender === value} required /> {label}</label>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend>Show me</legend>
		<div class="checks">
			{#each [['woman', 'Women'], ['man', 'Men'], ['nonbinary', 'Nonbinary people']] as [value, label] (value)}
				<label><input type="checkbox" name="interested_in" {value} checked={p?.interested_in?.includes(value)} /> {label}</label>
			{/each}
		</div>
	</fieldset>

	<div class="row">
		<label>Min age <input name="age_min" type="number" min="18" max="120" value={p?.age_min ?? 18} /></label>
		<label>Max age <input name="age_max" type="number" min="18" max="120" value={p?.age_max ?? 99} /></label>
		<label>Distance (km) <input name="max_distance_km" type="number" min="1" max="500" value={p?.max_distance_km ?? 50} /></label>
	</div>

	<fieldset class="stack">
		<legend>Location {p?.has_location ? '(set)' : '(not set yet)'}</legend>
		<button type="button" class="secondary" onclick={useLocation}>Use my current location</button>
		<div class="row">
			<label>Latitude <input name="lat" inputmode="decimal" bind:value={lat} /></label>
			<label>Longitude <input name="lng" inputmode="decimal" bind:value={lng} /></label>
		</div>
		{#if locStatus}<p class="muted">{locStatus}</p>{/if}
	</fieldset>

	<button>Save profile</button>
</form>

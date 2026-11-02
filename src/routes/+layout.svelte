<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const links = [
		{ href: '/discover', label: 'Discover' },
		{ href: '/likes', label: 'Liked you' },
		{ href: '/matches', label: 'Matches' },
		{ href: '/profile', label: 'Profile' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#e8457c" />
	<title>{data.appName}</title>
</svelte:head>

<header>
	<a class="brand" href={data.user ? '/discover' : '/'}>{data.appName}</a>
	{#if data.user?.hasProfile}
		<nav>
			{#each links as link (link.href)}
				<a href={link.href} aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}>
					{link.label}
					{#if link.href === '/likes' && data.likedYouCount > 0}
						<span class="badge">{data.likedYouCount}</span>
					{/if}
				</a>
			{/each}
			{#if data.user.isAdmin}<a href="/admin">Admin</a>{/if}
		</nav>
	{/if}
</header>

<main>
	{@render children()}
</main>

<footer>
	<a href="/about">About</a>
	<span>v{data.version}</span>
	{#if data.user}
		<a href="/account">Account</a>
		<form method="post" action="/logout"><button class="link">Log out</button></form>
	{/if}
</footer>

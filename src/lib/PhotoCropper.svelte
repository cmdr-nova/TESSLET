<script lang="ts">
	// Crop a photo to the 4:5 profile frame before it's uploaded.
	// Drag (or one finger) to move, scroll / pinch / slider to zoom.
	// Output: a 1080x1350 JPEG. The server still re-encodes it and strips metadata.
	import { onDestroy } from 'svelte';

	let {
		file,
		onCropped,
		onCancel
	}: { file: File; onCropped: (file: File) => void; onCancel: () => void } = $props();

	const OUT_W = 1080;
	const OUT_H = 1350;
	const ASPECT = OUT_W / OUT_H;
	const MAX_ZOOM = 4;

	let img = $state<HTMLImageElement | null>(null);
	let frameW = $state(0);
	let zoom = $state(1);
	let x = $state(0);
	let y = $state(0);
	let busy = $state(false);
	let url = '';

	$effect(() => {
		url = URL.createObjectURL(file);
		const el = new Image();
		el.onload = () => {
			img = el;
			zoom = 1;
			x = 0;
			y = 0;
		};
		// A format the browser can't draw (e.g. HEIC outside Safari): upload as-is and let the server handle it.
		el.onerror = () => onCropped(file);
		el.src = url;
		return () => URL.revokeObjectURL(url);
	});
	onDestroy(() => url && URL.revokeObjectURL(url));

	const frameH = $derived(frameW / ASPECT);
	const baseScale = $derived(img && frameW ? Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight) : 1);
	const scale = $derived(baseScale * zoom);
	const dispW = $derived(img ? img.naturalWidth * scale : 0);
	const dispH = $derived(img ? img.naturalHeight * scale : 0);

	function clamp() {
		const maxX = Math.max(0, (dispW - frameW) / 2);
		const maxY = Math.max(0, (dispH - frameH) / 2);
		x = Math.min(maxX, Math.max(-maxX, x));
		y = Math.min(maxY, Math.max(-maxY, y));
	}

	function setZoom(next: number) {
		zoom = Math.min(MAX_ZOOM, Math.max(1, next));
		clamp();
	}

	// Pointer handling: one pointer pans, two pointers pinch-zoom.
	const pointers = new Map<number, { x: number; y: number }>();
	let pinchStart = 0;
	let pinchZoom = 1;

	function down(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
			pinchZoom = zoom;
		}
	}
	function move(e: PointerEvent) {
		const prev = pointers.get(e.pointerId);
		if (!prev) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pointers.size === 1) {
			x += e.clientX - prev.x;
			y += e.clientY - prev.y;
			clamp();
		} else if (pointers.size === 2 && pinchStart > 0) {
			const [a, b] = [...pointers.values()];
			setZoom(pinchZoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinchStart));
		}
	}
	function up(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinchStart = 0;
	}
	function wheel(e: WheelEvent) {
		e.preventDefault();
		setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
	}
	function key(e: KeyboardEvent) {
		const step = 10;
		if (e.key === 'ArrowLeft') x += step;
		else if (e.key === 'ArrowRight') x -= step;
		else if (e.key === 'ArrowUp') y += step;
		else if (e.key === 'ArrowDown') y -= step;
		else if (e.key === '+' || e.key === '=') return setZoom(zoom * 1.1);
		else if (e.key === '-') return setZoom(zoom / 1.1);
		else if (e.key === 'Escape') return onCancel();
		else return;
		e.preventDefault();
		clamp();
	}

	async function useCrop() {
		if (!img) return;
		busy = true;
		// Map the visible frame back to source-image pixels.
		const sw = frameW / scale;
		const sh = frameH / scale;
		const sx = img.naturalWidth / 2 - (frameW / 2 + x) / scale;
		const sy = img.naturalHeight / 2 - (frameH / 2 + y) / scale;
		const canvas = document.createElement('canvas');
		canvas.width = OUT_W;
		canvas.height = OUT_H;
		const ctx = canvas.getContext('2d')!;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
		busy = false;
		onCropped(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file);
	}
</script>

<div class="backdrop" role="presentation">
	<div class="dialog card stack" role="dialog" aria-modal="true" aria-labelledby="crop-title">
		<h2 id="crop-title" style="margin:0">Crop your photo</h2>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="frame"
			bind:clientWidth={frameW}
			style="height:{frameH}px"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={up}
			onwheel={wheel}
			onkeydown={key}
			tabindex="0"
			role="application"
			aria-label="Crop area. Drag or use arrow keys to move, plus and minus to zoom."
		>
			{#if img}
				<img
					src={img.src}
					alt=""
					draggable="false"
					style="width:{dispW}px; height:{dispH}px; transform: translate(calc(-50% + {x}px), calc(-50% + {y}px))"
				/>
			{:else}
				<p class="muted loading">Loading...</p>
			{/if}
			<div class="guides" aria-hidden="true"></div>
		</div>
		<label class="zoom">
			Zoom
			<input type="range" min="1" max={MAX_ZOOM} step="0.01" value={zoom} oninput={(e) => setZoom(Number(e.currentTarget.value))} />
		</label>
		<p class="muted" style="margin:0; font-size:0.85rem">Drag to reposition. Scroll or pinch to zoom.</p>
		<div class="row">
			<button type="button" class="secondary" onclick={onCancel}>Cancel</button>
			<button type="button" onclick={useCrop} disabled={!img || busy}>{busy ? 'Saving...' : 'Use photo'}</button>
		</div>
	</div>
</div>

<style>
	.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.6); display: grid; place-items: center; padding: 1rem; z-index: 50; }
	.dialog { width: min(420px, 100%); max-height: 100%; overflow: auto; }
	.frame { position: relative; overflow: hidden; border-radius: 12px; background: #000; touch-action: none; cursor: grab; user-select: none; }
	.frame:active { cursor: grabbing; }
	.frame img { position: absolute; left: 50%; top: 50%; max-width: none; pointer-events: none; }
	.loading { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; }
	.guides { position: absolute; inset: 0; pointer-events: none; background:
		linear-gradient(to right, transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.35) calc(33.33% - 0.5px), rgb(255 255 255 / 0.35) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgb(255 255 255 / 0.35) calc(66.66% - 0.5px), rgb(255 255 255 / 0.35) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)),
		linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.35) calc(33.33% - 0.5px), rgb(255 255 255 / 0.35) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgb(255 255 255 / 0.35) calc(66.66% - 0.5px), rgb(255 255 255 / 0.35) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)); }
	.zoom { display: flex; align-items: center; gap: 0.75rem; font-weight: 600; }
	.zoom input { flex: 1; padding: 0; }
</style>

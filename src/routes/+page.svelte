<script lang="ts">
	import Greet from '$lib/Greet.svelte';
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-5">
		<h1 class="h1">Skeleton + Tauri = ❤️</h1>
		<Greet />
		<section class="space-y-4">
			<h2 class="h2">Learn More</h2>
			<dl class="list-dl">
				<div>
					<span class="badge-icon variant-soft-secondary p-4"> ➜ </span>
					<span class="flex-auto">
						<a class="anchor" href="https://kit.svelte.dev/docs/introduction" target="_blank">
							Official SvelteKit Documentation &rarr;
						</a>
					</span>
				</div>
				<div>
					<span class="badge-icon variant-soft-secondary p-4"> ➜ </span>
					<span class="flex-auto">
						<a class="anchor" href="https://www.skeleton.dev" target="_blank">
							Official Skeleton Documentation &rarr;
						</a>
					</span>
				</div>
				<div>
					<span class="badge-icon variant-soft-secondary p-4"> ➜ </span>
					<span class="flex-auto">
						<a
							class="anchor"
							href="https://tauri.app/v1/guides/development/development-cycle"
							target="_blank"
						>
							Official Tauri Documentation &rarr;
						</a>
					</span>
				</div>
				<div>
					<span class="badge-icon variant-soft-secondary p-4"> ➜ </span>
					<span class="flex-auto">
						<a class="anchor" href="https://doc.rust-lang.org/book/" target="_blank"
							>The Rust Book &rarr;</a
						>
					</span>
				</div>
			</dl>
		</section>
	</div>
</div>

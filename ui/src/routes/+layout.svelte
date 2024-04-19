<script lang="ts">
	import '../app.postcss';

	import { setContext } from 'svelte';

	import { UserStore } from '../store/User';

	import type { LayoutData } from './$types';

	// export let data: LayoutData;

	const userStore = new UserStore()

	setContext('user', userStore);
</script>

<div class="wrapper flex flex-col p-2 h-screen">
	<slot />
</div>

<style>
	.wrapper {
		max-width: 1000px;
		margin: 0 auto;
	}
</style>
<script lang="ts">
	import '../app.postcss';
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
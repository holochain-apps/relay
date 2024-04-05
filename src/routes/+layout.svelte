<script lang="ts">
	import '../app.postcss';
</script>

<div class="wrapper">
	<slot />
</div>

<style>
	.wrapper {
		padding: 10px;
		max-width: 1000px;
		margin: 0 auto;
	}
</style>
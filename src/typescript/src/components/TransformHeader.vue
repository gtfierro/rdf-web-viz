<script lang="ts">
export { default } from "@/components/TransformHeader";
</script>

<template>
	<input :id='`transform-${transformIndex}-name`'
		class="transform-name"
		:placeholder='`Transform #${transformIndex + 1}`'
		:title='name'
		:value='name'
		@input='updateName($event.target.value)'
	/>
	<button :id='`transform-${transformIndex}-delete`'
		class="transform-button"
		@click='requestDelete()'
	>–</button>
	<button :id='`transform-${transformIndex}-move-down`'
		class="transform-button"
		:disabled='transformIndex === transformMaxIndex'
		@click='requestMoveDown()'
	>↓</button>
	<button :id='`transform-${transformIndex}-move-up`'
		class="transform-button"
		:disabled='transformIndex === 0'
		@click='requestMoveUp()'
	>↑</button>
	<input :id='`transform-${transformIndex}-enabled`'
		class="transform-button"
		type="checkbox"
		:checked='enabled'
		@input='updateEnabled($event.target.checked)'
	/>
</template>

<!--
red - lightcoral
orange - orange
yellow - gold
green - mediumseagreen
purple - mediumpurple
pink - violet
gray - darkgrey
tan - burlywood
desaturated blue - steelblue
 -->

<style>
.transform-button {
	float: right;
}
</style>

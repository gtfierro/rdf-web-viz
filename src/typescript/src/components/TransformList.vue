<script lang="ts">
export { default } from "@/components/TransformList";
</script>

<template>
	<div
		v-global:active_transforms='active_transforms'
		v-global:applyTransforms='applyTransforms'
		class="transform-list"
	>
		<button @click='applyTransforms.value(active_transforms)'>Apply Transform{{ active_transforms.length === 1 ? '' : 's' }}</button><br>
		<button @click='addSparqlTransform'>Add SPARQL Transform</button><br>
		<button @click='addRegexTransform'>Add RegEx Transform</button><br>
		<button v-if='last_deleted_transform !== null' @click='restoreTransform()'>Undo Delete Transform</button><br>
		<template v-for='(transform, index) in active_transforms' :key='index'>
			<SparqlTransform v-if='transform.value.type === "sparql"'
				:transform-index='index'
				v-model='transform.value'
				@delete='deleteTransform(index)'
			/>
			<RegexTransform v-else-if='transform.value.type === "regex"'
				:transform-index='index'
				v-model='transform.value'
				@delete='deleteTransform(index)'
			/>
		</template>
	</div>
</template>

<style>
.transform-list {
	background-color: lightskyblue;
	height: 100%;
	overflow-y: auto;
	padding: 10px;
}

.transform-list > button {
	margin: 2px;
}

.transform {
	margin: 10px 0 10px 0;
	padding: 2px;
}

.transform * {
	margin: 2px;
}
</style>

<script lang="ts">
export { default } from "@/components/TransformList";
</script>

<template>
	<div class="transform-list"
		v-global:active_transforms='active_transforms'
		v-global:applyTransforms='applyTransforms'
	>
		<div class="transform-list-buttons">
			<button @click='applyTransforms.value(active_transforms)'>{{ active_transforms.length === 0 ? 'Unapply all' : 'Apply' }} {{ active_transforms.length === 1 ? 'Transform' : 'Transforms' }}</button>
			<br>
			<button @click='addSparqlTransform'>Add SPARQL Transform</button>
			<br>
			<button @click='addRegexTransform'>Add RegEx Transform</button>
			<br>
			<button @click='restoreTransform()' :disabled='last_deleted_transform === null'>Undo Delete Transform</button><br>
		</div>
		<template v-for='(transform, index) in active_transforms' :key='index'>
			<SparqlTransform v-if='transform.value.type === "sparql"'
				:transform-index='index'
				:transform-max-index='active_transforms.length - 1'
				v-model='transform.value'
				@delete='deleteTransform(index)'
				@move-down='moveDownTransform(index)'
				@move-up='moveUpTransform(index)'
			/>
			<RegexTransform v-else-if='transform.value.type === "regex"'
				:transform-index='index'
				:transform-max-index='active_transforms.length - 1'
				v-model='transform.value'
				@delete='deleteTransform(index)'
				@move-down='moveDownTransform(index)'
				@move-up='moveUpTransform(index)'
			/>
		</template>
	</div>
</template>

<style>
.transform-disabled {
	opacity: .5;
}

.transform-list {
	background-color: lightskyblue;
	height: 100%;
	overflow-y: auto;
}

.transform-list-buttons {
	padding: 10px;
}

.transform-list-buttons > button {
	margin: 2px;
}

.transform {
	margin: 10px;
	padding: 2px;
}

.transform * {
	margin: 2px;
}
</style>

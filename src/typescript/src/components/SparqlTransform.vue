<script lang="ts">
export { default } from "@/components/SparqlTransform";
</script>

<template>
	<div
		class="transform transform-sparql"
		:class='[
			`transform-sparql-${query_type ?? "unknown"}`,
			{
				"transform-disabled": !modelValue.enabled
			}
		]'
	>
		<TransformHeader
			:enabled='modelValue.enabled'
			:name='modelValue.name'
			:transform-index='transformIndex'
			:transform-max-index='transformMaxIndex'
			@delete='requestDelete()'
			@move-down='requestMoveDown()'
			@move-up='requestMoveUp()'
			@update:enabled='updateEnabled($event)'
			@update:name='updateName($event)'
		/>
		<br>
		<textarea :id='`transform-${transformIndex}-query`'
			class="transform-sparql-query"
			ref="input_query"
			:value='modelValue.query'
			@input='updateQuery($event.target)'
		/>
		<br>
		<template v-if='query_type === "solutions"'>
			<span class="transform-sparql-query-type">Solutions-type</span>
		</template>
		<template v-else-if='query_type === "boolean"'>
			<span class="transform-sparql-query-type">Boolean-type</span>
		</template>
		<template v-else-if='query_type === "graph"'>
			<span class="transform-sparql-query-type">Graph-type</span>
		</template>
		<template v-else>
			<span class="transform-sparql-query-type">Unknown type</span>
		</template>
	</div>
</template>

<style>
.transform-sparql-unknown {
	background-color: darkgrey;
}

.transform-sparql-solutions {
	background-color: violet;
}

.transform-sparql-boolean {
	background-color: mediumpurple;
}

.transform-sparql-graph {
	background-color: mediumseagreen;
}

.transform-sparql-query {
	width: 90%;
	overflow-y: hidden;
	resize: none;
}

.transform-sparql-query-type {
	font-size: .9rem;
}
</style>

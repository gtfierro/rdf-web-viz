<script lang="ts">
export { default } from "@/components/SparqlTransform";
</script>

<template>
	<div class="transform transform-sparql" :class='[`transform-sparql-${query_type ?? "unknown"}`]'>
		<input :id='`transform-${transformIndex}-name`'
			class="transform-sparql-name"
			:placeholder='`SPARQL Transform #${transformIndex + 1}`'
			:value='modelValue.name'
			@input='updateName($event.target.value)'
		/>
		<button :id='`transform-${transformIndex}-name`'
			class="transform-sparql-delete"
			@click='requestDelete()'
		>–</button>
		<br>
		<textarea :id='`transform-${transformIndex}-query`'
			class="transform-sparql-query"
			ref="input_query"
			:value='modelValue.query'
			@readystatechange='console.log($event.target)'
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
	background-color: mediumpurple;
}

.transform-sparql-solutions {
	background-color: violet;
}

.transform-sparql-boolean {
	background-color: aqua;
}

.transform-sparql-graph {
	background-color: lime;
}

.transform-sparql-delete {
	background-color: rgba(255, 255, 255, .5);
	border: 0;
	float: right;
	font-size: 1rem;
}

.transform-sparql-delete:hover {
	background-color: rgba(255, 255, 255, .75);
}

.transform-sparql-name {
	background-color: rgba(255, 255, 255, .5);
	border: 0;
	font-size: 1rem;
}

.transform-sparql-name:hover {
	background-color: rgba(255, 255, 255, .75);
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

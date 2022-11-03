import init, * as oxigraph from "oxigraph/web.js";
import * as vis from "vis-network/standalone";
import type * as vue from "vue";

import * as tf from "./transform_element";
import * as util from "./util";

declare global{
	interface Window{
		active_transforms: {value: tf.TransformElement<util.TransformType>}[];
		applyTransforms: vue.Ref<(transforms: typeof window.active_transforms) => void>;
		generateTransforms: () => util.Transform[];
	}
}

function getAllNodeIds(store: oxigraph.Store): Set<vis.IdType>{
	return new Set(
		(store.match(null, null, null, null) as oxigraph.Quad[])
			.map(quad => {
				return [
					quad.subject as oxigraph.NamedNode,
					quad.object as oxigraph.NamedNode
				]
			})
			.flat()
			.map(node => node.value)
	);
}

let matching_set = new Set<vis.IdType>();
let node_view: vis.DataView<vis.Node, "id">;
let store: oxigraph.Store;

async function main(){
	await init();
	await util.onceTrue(() => window.active_transforms !== undefined);

	util.onceTrue(() => window.applyTransforms !== undefined)
		.then(() => {
			window.applyTransforms.value = function(transforms: {value: tf.TransformElement<util.TransformType>}[]){
				let transformed_store = transforms
					.map(({value}) => value)
					.reduce((current_store, transform) => {
						let applied = transform.apply(current_store);
						return applied;
					}, new oxigraph.Store(store.match(null, null, null, null)));

				matching_set = getAllNodeIds(transformed_store);
				node_view.refresh();
			};
		});

	window.generateTransforms = function(){
		return window.active_transforms
			.map(({value}) => value)
			.map(transform => transform.toTransform());
	}

	fetch(`${window.location.href}/view.json`)
		.then(response => response.json() as unknown as util.View)
		.then(view => {
			util.clearArray(window.active_transforms);

			view.transforms.forEach(transform => {
				switch(transform.type){
					case "sparql":
						window.active_transforms.push({
							value: tf.createTransformElement(transform)
						});
						break;
					case "regex":
						window.active_transforms.push({
							value: tf.createTransformElement(transform)
						});
						break;
				}
			});

			return util.loadBrl(view as util.Brl);
		})
		.then(text => {
			store = new oxigraph.Store();
			store.load(text, "text/turtle", null, null);

			let nodes = new vis.DataSet((store.query("SELECT DISTINCT ?s WHERE { ?s ?p ?o }")! as Map<String, oxigraph.NamedNode>[])
				.map(result => result.get('s')!)
				.map(node => {
					return {
						id: node.value,
						label: util.displayName(node.value)
					};
				}) as vis.Node[]);

			let edges = new vis.DataSet((store.match(null, null, null, null) as oxigraph.Quad[])
				.map(quad => {
					return {
						from: quad.subject.value,
						to: quad.object.value,
						label: util.displayName(quad.predicate.value),
						relation: quad.predicate.value,
						arrows: "to",
						font: {
							align: "middle"
						}
					};
				}) as vis.Edge[]);

			for(let node of nodes.getIds()){
				let match = false;
				for(let edge of edges.map(it=>it.to)){
					if(edge === node){
						match = true;
						break;
					}
				}
				if(!match) nodes.remove(node);
			}

			console.log(`${nodes.length} nodes and ${edges.length} edges created`);

			node_view = new vis.DataView(nodes, {
				filter: function(item){
					if(item.id === undefined) return false;
					return matching_set.has(item.id);
				}
			});

			let network = new vis.Network(
				document.getElementById("placeholder")!,
				{
					nodes: node_view,
					edges: edges
				},
				{
					layout: {
						improvedLayout: false
					},
					nodes: {
						shapeProperties: {
							interpolation: false
						}
					},
					physics: {
						stabilization: {
							iterations: 512,
							updateInterval: 100
						}
					},
					edges: {
						smooth: {
							enabled: true,
							type: "continuous",
							roundness: 0
						}
					}
				}
			);

			console.log("Graph created, loading...");

			network.on("selectNode", (event: {nodes: vis.IdType[], edges: vis.IdType[]}) => {
				let selected_node_id = event.nodes[0]!;
				if(network.isCluster(selected_node_id)){
					network.openCluster(selected_node_id);
				}else{
					let selected_node = nodes.get(selected_node_id)!;

					// Rather than what looping through all the event edges (which also requires keeping every single event in memory).
					// precompute a set containing all the ids (and, at some point, make a shorter way of IDing the nodes, rather than just their full name)
					let nodes_to_cluster = new Set<vis.IdType>([
						selected_node_id,
						...event.edges
							.map(edge_id => edges.get(edge_id)?.to)
							.filter(el => el != undefined) as vis.IdType[]
					]);

					network.cluster({
						clusterNodeProperties: {
							label: selected_node.label ?? "Cluster",
							color: "#ff6666"
						},
						joinCondition: (node: {id: vis.IdType}) => nodes_to_cluster.has(node.id)
					});
				}
			});
		})
		.then(() => {
			window.applyTransforms.value(window.active_transforms);
		});
}

main();

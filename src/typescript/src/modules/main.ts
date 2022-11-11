import init, * as oxigraph from "oxigraph/web.js";
import Swal from "sweetalert2";
import * as vis from "vis-network/standalone";
import type * as vue from "vue";

import * as tf from "./transform_element";
import * as util from "./util";

declare global{
	interface Window{
		active_transforms: {value: tf.TransformElement<util.TransformType>}[];
		applyTransforms: vue.Ref<(transforms: typeof window.active_transforms) => void>;
		generateTransforms: () => util.Transform[];
		view_location_options: {
			active_graph: util.Nullable<util.View["graph"]>,
			hostname: string,
			username: string,
			series_name: string,
			onLoad: (hostname: string, username: string, series_name: string) => void,
			onSave: (hostname: string, username: string, api_key: string) => void,
			validateHost: (hostname: string) => Promise<boolean>
		}
	}
}

let matching_set = new Set<vis.IdType>();
let node_view: vis.DataView<vis.Node, "id">;
let store: oxigraph.Store;

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

async function onLoad(hostname: string, username: string, series_name: string){
	fetch(`${hostname}/view/${username}/${series_name}/${new Date().toISOString().replace(/Z$/, "+00:00")}/view.json`)
		.then(response => response.json() as unknown as util.View)
		.then(view => {
			util.toast.fire({
				icon: "info",
				title: `Loading View: ${window.view_location_options.username}/${window.view_location_options.series_name}`
			});

			util.clearArray(window.active_transforms);

			window.view_location_options.active_graph = view.graph;
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

			return util.loadBrl(view as util.Brl, window.view_location_options.hostname);
		})
		.then(text => {
			store = new oxigraph.Store();
			store.load(text, "text/turtle", null, null);

			let nodes = new vis.DataSet((store.query(`
				SELECT DISTINCT ?node WHERE {
					{ ?node ?p ?o }
					UNION
					{ ?s ?p ?node }
					FILTER (!isBlank(?node) && !isLiteral(?node))
				}
			`)! as Map<String, oxigraph.NamedNode>[])
				.map(result => result.get("node")!)
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

async function onSave(hostname: string, username: string, api_key: string){
	let series_name: string = '';

	Swal.fire({
		confirmButtonText: "Save",
		html: `
			<span>Enter series name:</span><br>
			<input id="input-series-name" class="swal2-input" placeholder="Series Name" value=${window.view_location_options.series_name}>
		`.trim(),
		showCancelButton: true,
		title: "Save new view",
		preConfirm(){
			series_name = (Swal.getPopup()?.querySelector('#input-series-name') as util.Nullable<HTMLInputElement>)?.value ?? '';

			if(series_name.length === 0){
				Swal.showValidationMessage("Missing series name")
			}
		}
	}).then(result => {
		if(result.isConfirmed){
			return fetch(`${hostname}/view/${username}/${series_name}/${new Date().toISOString().replace(/Z$/, "+00:00")}/series.json`);
		}else{
			return new Promise<Response>((_, reject) => reject("User cancelled saving"));
		}
	}).then(response => new Promise((resolve, reject) => {
		switch(response.status){
			case 200: // Series exists
				Swal.fire({
					icon: "warning",
					showCancelButton: true,
					text: "Add a new view to the existing series?",
					title: "Series exists"
				}).then(confirmation_result => {
					if(confirmation_result.isConfirmed){
						resolve(response);
					}else{
						reject("User cancelled saving, opting not to add a new view");
					}
				})
				break;
			case 422: // Series doesn't exist
				resolve(response);
				break;
			default:
				reject(`Unknown status code: ${response.status}`)
		}
	})).then(_response => {
		let view: util.View;

		if((window.view_location_options.active_graph as any).url !== undefined){
			view = {
				format: "brl",
				graph: {...window.view_location_options.active_graph} as util.Brl["graph"],
				transforms: window.active_transforms.map(transform_element => transform_element.value.toTransform())
			};
		}else{
			view = {
				format: "bru",
				graph: {...window.view_location_options.active_graph} as util.Bru["graph"],
				transforms: window.active_transforms.map(transform_element => transform_element.value.toTransform())
			};
		}

		return fetch(`${hostname}/view/${username}/${series_name}/${new Date().toISOString().replace(/Z$/, "+00:00")}/view.json`, {
			body: JSON.stringify(view),
			headers: {
				"Authentication": api_key,
				"Content-Type": "application/json"
			},
			method: "POST"
		});
	}).then(response => {
		switch(response.status){
			case 200:
			case 201:
			case 204:
				let link = response.url.match(/^(.+?)\/view.json/)?.[1];
				Swal.fire({
					icon: "success",
					html: `<a href="${link}">${link}</a>`,
					title: "View saved"
				});

				try{
					window.history.replaceState(null, '', link);
				}catch(e){}
				break;
			default:
				util.toast.fire({
					icon: "error",
					title: "View failed to save"
				});
				break;
		}
	}).catch(() => {});
}

async function validateHost(hostname: string): Promise<boolean>{
	try{
		let url = new URL(`${hostname}/bruplint`);
		return await fetch(url)
			.then(response => response.status === 204)
			.catch(() => false);
	}catch{
		return false;
	}
}

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

	util.onceTrue(() => window.view_location_options !== undefined)
		.then(() => {
			let current_location_match = window.location.href.match(/^(?<hostname>.+?)\/view\/(?<username>[^\/]+)\/(?<series_name>[^\/]+)/);
			if(current_location_match !== null){
				window.view_location_options.hostname = current_location_match.groups?.hostname ?? '';
				window.view_location_options.username = current_location_match.groups?.username ?? '';
				window.view_location_options.series_name = current_location_match.groups?.series_name ?? '';
			}

			window.view_location_options.onLoad = onLoad;
			window.view_location_options.onSave = onSave;
			window.view_location_options.validateHost = validateHost;

			// If all fields are already populated, immediately try to load
			if(
				window.view_location_options.hostname !== '' &&
				window.view_location_options.username !== '' &&
				window.view_location_options.series_name !== ''
			) window.view_location_options.validateHost(window.view_location_options.hostname)
				.then(host_is_valid => {
					if(host_is_valid) window.view_location_options.onLoad(
						window.view_location_options.hostname,
						window.view_location_options.username,
						window.view_location_options.series_name
					)
				});
		});
}

main();

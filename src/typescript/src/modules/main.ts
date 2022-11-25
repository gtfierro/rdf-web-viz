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
			onDownload: (type: "turtle" | util.ViewFormat, format?: string) => void,
			onFileUploaded: (file: File) => void,
			onLoad: (hostname: string, username: string, series_name: string) => void,
			onSave: (hostname: string, username: string, api_key: string) => void,
			validateHost: (hostname: string) => Promise<boolean>
		}
	}
}

let matching_set = new Set<vis.IdType>();
let node_view: vis.DataView<vis.Node, "id">;
let store: oxigraph.Store;
let transformed_store: oxigraph.Store;

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

async function readAsText(file: File): Promise<string>{
	return new Promise((resolve, reject) => {
		let reader = new FileReader();
		reader.onload = () => {
			if(reader.result === null){
				reject("File contents are null");
			}else{
				resolve(reader.result as string);
			}
		};
		reader.onerror = reject;

		reader.readAsText(file);
	});
}

function loadGraph(content: string){
	store = new oxigraph.Store();
	store.load(content, "text/turtle", null, null);

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

	window.applyTransforms.value(window.active_transforms);
}

function createView(): util.View{
	if((window.view_location_options.active_graph as any).url !== undefined){
		return {
			format: "brl",
			graph: {...window.view_location_options.active_graph} as util.Brl["graph"],
			transforms: window.active_transforms.map(transform_element => transform_element.value.toTransform())
		};
	}else{
		return {
			format: "bru",
			graph: {...window.view_location_options.active_graph} as util.Bru["graph"],
			transforms: window.active_transforms.map(transform_element => transform_element.value.toTransform())
		};
	}
}

function onDownload(format: "turtle" | util.ViewFormat, filename: string = "bruplint_view"){
	let formatted_filename: string;

	switch(format){
		case "turtle":
			formatted_filename = filename.endsWith(".ttl") ? filename : `${filename}.ttl`;
			console.log(`Downloading ${formatted_filename}...`);
			util.download(
				formatted_filename,
				transformed_store.dump("text/turtle", null),
				"text/turtle"
			);
			return;
		case "bru":
		case "brl":
			formatted_filename = filename.endsWith(`.${format}.json`) ? filename : `${filename}.${format}.json`;
			let view = createView();

			if(view.format === format){
				console.log(`Downloading ${formatted_filename}...`);
				util.download(
					formatted_filename,
					JSON.stringify(createView()),
					"application/json"
				);
			}else{
				// Attemping to save a BRU as a BRL, which is impossible becasue there is no link to use (as BRUs only appear from users uploading files client-side)
				if(format === "brl") return;

				// Attempting to save a BRL as a BRU, dump the original store being used
				let bru: util.Bru = {
					format: "bru",
					graph: {
						type: "turtle",
						content: {
							data: store.dump("text/turtle", null)
						}
					},
					transforms: window.active_transforms.map(transform_element => transform_element.value.toTransform())
				};

				console.log(`Downloading ${formatted_filename}...`);
				util.download(
					formatted_filename,
					JSON.stringify(bru),
					"application/json"
				);
			}
			return;
	}
}

function loadFromJson(json: object, name: string){
	if(util.isView(json)){
		util.toast.fire({
			icon: "info",
			title: `Loading View: ${name}`
		});

		util.clearArray(window.active_transforms);

		window.view_location_options.active_graph = json.graph;
		json.transforms.forEach(transform => {
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

		if(util.isBrl(json)){
			util.loadBrl(json, window.view_location_options.hostname)
				.then(loadGraph);
		}else{
			switch(json.graph.type){
				case "turtle":
					loadGraph((json.graph.content as {data: string}).data);
					break;
				default:
					util.toast.fire({
						icon: "error",
						title: `Unable to fully load BRU: Unknown graph type ${json.graph.type}`
					});
					break;
			}
		}
	}else{
		util.toast.fire({
			icon: "error",
			title: "Unable to load: Invalid format"
		});
	}
}

async function onFileUploaded(file: File){
	console.log(`Uploading ${file.name}...`);
	switch(file.type){
		case "text/turtle":
			readAsText(file).then(text => {
				util.toast.fire({
					icon: "success",
					title: `Loaded local file: ${file.name}`
				});

				window.view_location_options.active_graph = {
					type: "turtle",
					content: {
						data: text
					}
				};

				loadGraph(text);
			}).catch((e) => util.toast.fire({
				icon: "error",
				title: `Unable to read local file: ${file.name}, ${e}`
			}));
			break;
		case "application/json":
			readAsText(file).then(text => {
				util.toast.fire({
					icon: "success",
					title: `Loaded local file: ${file.name}`
				});

				loadFromJson(JSON.parse(text), file.name);
			}).catch((e) => util.toast.fire({
				icon: "error",
				title: `Unable to read local file: ${file.name}, ${e}`
			}));
			break;
		default:
			util.toast.fire({
				icon: "error",
				title: `Unsupported MIME type: ${file.type}`
			});
			break;
	}
}

async function onLoad(hostname: string, username: string, series_name: string){
	fetch(`${hostname}/view/${username}/${series_name}/view.json`)
		.then(response => response.json() as object)
		.then(json => loadFromJson(json, `${window.view_location_options.username}/${window.view_location_options.series_name}`));
}

async function onSave(hostname: string, username: string, api_key: string){
	let series_name: string = '';

	Swal.fire({
		confirmButtonText: "Save",
		html: `
			<span>Enter view name:</span><br>
			<input id="input-series-name" class="swal2-input" placeholder="View Name" value=${window.view_location_options.series_name}>
		`.trim(),
		showCancelButton: true,
		title: "Save new view",
		preConfirm(){
			series_name = (Swal.getPopup()?.querySelector('#input-series-name') as util.Nullable<HTMLInputElement>)?.value ?? '';

			if(series_name.length === 0){
				Swal.showValidationMessage("Missing view name")
			}
		}
	}).then(result => {
		if(result.isConfirmed){
			return fetch(`${hostname}/view/${username}/${series_name}/view.json`);
		}else{
			return new Promise<Response>((_, reject) => reject("User cancelled saving"));
		}
	}).then(response => new Promise((resolve, reject) => {
		switch(response.status){
			case 200: // View exists
				Swal.fire({
					icon: "warning",
					showCancelButton: true,
					text: "Overwrite?",
					title: "View exists"
				}).then(confirmation_result => {
					if(confirmation_result.isConfirmed){
						resolve(response);
					}else{
						reject("User cancelled saving, opting not to overwrite");
					}
				})
				break;
			case 422: // View doesn't exist
				resolve(response);
				break;
			default:
				reject(`Unknown status code: ${response.status}`)
		}
	})).then(_response => {
		return fetch(`${hostname}/view/${username}/${series_name}/view.json`, {
			body: JSON.stringify(createView()),
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
				}).then(_result => {
					window.view_location_options.username = username;
					window.view_location_options.series_name = series_name;
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
				transformed_store = transforms
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
			window.view_location_options.hostname = window.location.origin;
			let current_location_match = window.location.href.match(/^(?<hostname>.+?)\/view\/(?<username>[^\/]+)\/(?<series_name>[^\/]+)/);
			if(current_location_match !== null){
				window.view_location_options.username = current_location_match.groups?.username ?? '';
				window.view_location_options.series_name = current_location_match.groups?.series_name ?? '';
			}

			window.view_location_options.onDownload = onDownload;
			window.view_location_options.onFileUploaded = onFileUploaded;
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

import type * as oxigraph from "oxigraph";
import Swal from "sweetalert2";

export type Nullable<T> = T | null;

export type VersionedViewLink = {
	timestamp: string,
	url: string
};

export type Series = {
	format: "series",
	metadata: {
		username: string,
		series_name: string,
		last_modified: string
	},
	versions: VersionedViewLink[]
};

export type BasicTransform = {
	type: string,
	name: string,
	enabled: boolean,
	params: object
};

export type SparqlTransform = BasicTransform & {
	type: "sparql",
	params: {
		query: string
	}
};

export type TripleElement = "subject" | "predicate" | "object";

export type RegexTransform = BasicTransform & {
	type: "regex",
	params: {
		regex: string,
		flags: string,
		match_over: TripleElement,
		display_as?: string,
	}
};

export type Transform = BasicTransform & (SparqlTransform | RegexTransform);
export type TransformType = Transform["type"];

export type Bru = {
	format: "bru",
	graph: {
		type: string,
		content: object
	},
	transforms: Transform[]
};

export type Brl = {
	format: "brl",
	graph: {
		type: string,
		url: string
	},
	transforms: Transform[]
};

export type View = Bru | Brl;
export type ViewFormat = View["format"];

export async function loadBrl(brl: Brl, hostname: string = window.origin): Promise<string>{
	console.log("Loading Brl:", brl);
	if(brl.graph.type !== "turtle") return "";

	let url = (brl.graph.url[0] === '/') ? `${hostname}${brl.graph.url}` : brl.graph.url;
	return fetch(url).then(response => response.text());
}

export function displayName(full_name: string): string{
	let match_string = full_name.match(/#([^#]+)$/g)
	if(match_string === null) match_string = full_name.match(/\/([^/]+)$/g);

	return match_string![0]!
		.substring(1)
		.match(/([A-Z]?[0-9a-z]+|[A-Z])/g)!
		.map(word => {
			let [first, ...rest] = word.toLowerCase();
			return [first!.toUpperCase(), ...rest].join('');
		})
		.join(' ');
}

export type QueryResultSolutions = Map<string, oxigraph.NamedNode>[];
export type QueryResultBoolean = boolean;
export type QueryResultGraph = oxigraph.Quad[];

export type QueryResultType =
	| "solutions"
	| "boolean"
	| "graph";

export type QueryResults =
	| QueryResultSolutions
	| QueryResultBoolean
	| QueryResultGraph;

export function isQueryResultSolutions(query_result: QueryResults): query_result is QueryResultSolutions{
	return (query_result instanceof Array) && (
		query_result.length === 0 ||
		query_result[0] instanceof Map<string, oxigraph.NamedNode>
	);
}

export function isQueryResultBoolean(query_result: QueryResults): query_result is QueryResultBoolean{
	return typeof query_result === "boolean";
}

export function isQueryResultGraph(query_result: QueryResults): query_result is QueryResultGraph{
	return (query_result instanceof Array) && (
		query_result.length === 0 ||
		!(query_result[0] instanceof Map<string, oxigraph.NamedNode>)
	);
}

export function isTransformType(transform_type: string): transform_type is TransformType{
	return (
		transform_type === "sparql" ||
		transform_type === "regex"
	);
}

export function isSparqlTransform(transform: any): transform is SparqlTransform{
	return (
		transform?.type === "sparql" &&
		typeof transform?.params?.query === "string"
	);
}

export function isRegexTransform(transform: any): transform is RegexTransform{
	return (
		transform?.type === "regex" &&
		typeof transform?.params?.regex === "string" &&
		typeof transform?.params?.flags === "string" &&
		typeof transform?.params?.match_over === "string" &&
		(transform?.params?.display_as === undefined || typeof transform?.params?.display_as === "string")
	);
}

export function isTransform(transform: any): transform is Transform{
	return isSparqlTransform(transform) || isRegexTransform(transform);
}

export function createDefaultTransform(type: "sparql"): SparqlTransform;
export function createDefaultTransform(type: "regex"): RegexTransform;
export function createDefaultTransform(type: TransformType): Transform & {type: typeof type}{
	switch(type){
		case "sparql":
			return {
				type,
				name: '',
				enabled: true,
				params: {
					query: "SELECT * WHERE {\n  ?s ?p ?o\n}"
				}
			};
		case "regex":
			return {
				type,
				name: '',
				enabled: true,
				params: {
					regex: ".*",
					flags: "gi",
					match_over: "subject"
				}
			}
	}
}

export type QueryType =
	| "solutions"
	| "boolean"
	| "graph";

export function queryType(query: string): Nullable<QueryType>{
	let query_type = query.match(/\b(?:SELECT|ASK|CONSTRUCT|DESCRIBE)\b/g);

	if(query_type?.length !== 1){
		return null;
	}else{
		switch(query_type[0]){
			case "SELECT":
				return "solutions";
			case "ASK":
				return "boolean";
			case "CONSTRUCT":
			case "DESCRIBE":
				return "graph";
			default:
				// TODO: Should be unreachable
				return null;
		}
	}
}

export type RegexFlag = 'g' | 'i' | 'm' | 's' | 'u' | 'y';

export function mapFrom<K, V>(entries: [K, V][]): Map<K, V>{
	let output_map = new Map<K, V>();

	entries.forEach(([key, value]) => {
		output_map.set(key, value);
	});

	return output_map;
}

export function resizeTextArea(text_area: HTMLTextAreaElement){
	text_area.style.height = "0px";
	text_area.style.height = `${text_area.scrollHeight}px`;
}

export function resizeInputWidth(input: HTMLInputElement){
	input.style.width = "0px";
	input.style.width = `${input.scrollWidth}px`;
}

export async function onceTrue(condition: () => boolean, polling_rate: number = 20, timeout: number = -1): Promise<() => boolean>{
	let time_elapsed: number = 0;
	let pollingFunction = function(resolve: (value: () => boolean) => void, reject: (reason?: any) => void){
		if(condition()){
			resolve(condition);
		}else{
			if(timeout < 0 || time_elapsed < timeout){
				setTimeout(pollingFunction, polling_rate, resolve, reject);
				time_elapsed += polling_rate;
			}else{
				reject(`Timeout reached after ${time_elapsed} ms`);
			}
		}
	};

	return new Promise((resolve, reject) => {
		pollingFunction(resolve, reject);
	})
}

export function clearArray<T>(array: T[]){
	while(array?.length > 0) array.pop();
}

export const toast = Swal.mixin({
	position: "bottom-end",
	showConfirmButton: false,
	timerProgressBar: true,
	timer: 1500,
	toast: true
});

export function download(filename: string, contents: string, mime_type: string = "text/plain"){
	let download_element = document.createElement('a');
	download_element.download = filename;
	download_element.href = `data:${mime_type};charset=utf-8,${encodeURIComponent(contents)}`;
	download_element.style.display = "none";

	document.body.appendChild(download_element);
	download_element.click();
	document.body.removeChild(download_element);
}

export function isBru(view: object): view is Bru{
	if(Object.keys(view).length !== 3) return false;
	for(let [key, value] of Object.entries(view)){
		switch(key){
			case "format":
				if(value !== "bru") return false;
				break;
			case "graph":
				if(Object.keys(value).length !== 2) return false;
				for(let [graph_key, graph_value] of Object.entries(value as object)){
					switch(graph_key){
						case "type":
							if(typeof(graph_value) !== "string") return false;
							break;
						case "content":
							if(typeof(graph_value) !== "object" || Array.isArray(graph_value)) return false;
							break;
						default:
							return false;
					}
				}
				break;
			case "transforms":
				if(!Array.isArray(value)) return false;
				for(let transform of value){
					if(!isTransform(transform)) return false;
				}
				break;
			default:
				return false;
		}
	}
	return true;
}

export function isBrl(view: object): view is Brl{
	if(Object.keys(view).length !== 3) return false;
	for(let [key, value] of Object.entries(view)){
		switch(key){
			case "format":
				if(value !== "brl") return false;
				break;
			case "graph":
				if(Object.keys(value).length !== 2) return false;
				for(let [graph_key, graph_value] of Object.entries(value as object)){
					switch(graph_key){
						case "type":
							if(typeof(graph_value) !== "string") return false;
							break;
						case "url":
							if(typeof(graph_value) !== "string") return false;
							break;
						default:
							return false;
					}
				}
				break;
			case "transforms":
				if(!Array.isArray(value)) return false;
				for(let transform of value){
					if(!isTransform(transform)) return false;
				}
				break;
			default:
				return false;
		}
	}
	return true;
}

export function isView(view: object): view is View{
	return isBru(view) || isBrl(view);
}

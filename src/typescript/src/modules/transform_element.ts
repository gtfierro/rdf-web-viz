import * as oxigraph from "oxigraph";
import * as util from "./util";

type TypedTransform<T extends util.TransformType> = util.Transform & {type: T};

export interface TransformElement<T extends util.TransformType>{
	readonly type: T;
	readonly name: string;
	readonly enabled: boolean;
	apply(store: oxigraph.Store): oxigraph.Store;
	clone(): TransformElement<T>;
	toTransform(): TypedTransform<T>;
}

type GenericTransformElement = TransformElement<util.TransformType>;

export class SparqlTransformElement implements TransformElement<"sparql">{
	readonly type = "sparql";

	private boolean_query_result: boolean = false;
	private output_store_size: number = 0;
	private query_type: util.Nullable<util.QueryResultType> = null;

	constructor(
		public query: string,
		public name: string = '',
		public enabled: boolean = true
	){}

	apply(store: oxigraph.Store): oxigraph.Store{
		if(!this.enabled) return new oxigraph.Store(store.match(null, null, null, null));

		let query_result: util.QueryResults;

		try{
			query_result = store.query(this.query) as util.QueryResults;
		}catch(e){
			this.query_type = null;
			return new oxigraph.Store(store.match(null, null, null, null));
		}

		let match_store = new oxigraph.Store();

		if(util.isQueryResultSolutions(query_result)){
			this.query_type = "solutions";
			let matching_node_ids = new Set<string>(
				query_result
					.map(solution => [...solution.values()])
					.flat()
					.map(solution_value => solution_value.value)
			);

			(store.match(null, null, null, null) as oxigraph.Quad[])
				.forEach(quad => {
					let has_subject = matching_node_ids.has(quad.subject.value);
					let has_object = matching_node_ids.has(quad.object.value);

					if(has_subject && has_object){
						match_store.add(quad);
					}else if(has_subject){
						match_store.add(oxigraph.quad(
							quad.subject,
							oxigraph.namedNode("null://"),
							oxigraph.namedNode("null://"),
							oxigraph.namedNode("null://")
						));
					}else if(has_object){
						match_store.add(oxigraph.quad(
							oxigraph.namedNode("null://"),
							oxigraph.namedNode("null://"),
							quad.object,
							oxigraph.namedNode("null://")
						));
					}
				});
		}else if(util.isQueryResultBoolean(query_result)){
			this.query_type = "boolean";
			this.boolean_query_result = query_result;
			// ASK queries don't have a concept of filtering
			match_store = new oxigraph.Store(store.match(null, null, null, null));
		}else if(util.isQueryResultGraph(query_result)){
			this.query_type = "graph";
			match_store = new oxigraph.Store(query_result);
		}

		this.output_store_size = match_store.size;
		return match_store;
	}

	clone(): SparqlTransformElement{
		return new SparqlTransformElement(this.query, this.name, this.enabled);
	}

	toTransform(): util.SparqlTransform{
		return {
			type: "sparql",
			name: this.name,
			enabled: this.enabled,
			params: {
				query: this.query
			}
		};
	}

	booleanQueryResult(): util.Nullable<boolean>{
		if(this.query_type === "boolean") return this.boolean_query_result;
		return null;
	}

	outputStoreSize(): number{
		return this.output_store_size;
	}

	queryType(): util.Nullable<util.QueryResultType>{
		return this.query_type;
	}
}

export class RegexTransformElement implements TransformElement<"regex">{
	readonly type = "regex";

	private output_store_size: number = 0;

	constructor(
		public regex: string,
		public flags: string,
		public match_over: util.TripleElement,
		public name: string = '',
		public enabled: boolean = true
	){}

	apply(store: oxigraph.Store): oxigraph.Store{
		if(!this.enabled) return new oxigraph.Store(store.match(null, null, null, null));

		let match_store = new oxigraph.Store();

		switch(this.match_over){
			case "subject":
				(store.match(null, null, null, null) as oxigraph.Quad[])
					.forEach(quad => {
						if((quad.subject as oxigraph.NamedNode).value.match(this.regex)) match_store.add(quad);
					});
				break;
			case "predicate":
				(store.match(null, null, null, null) as oxigraph.Quad[])
					.forEach(quad => {
						if((quad.predicate as oxigraph.NamedNode).value.match(this.regex)) match_store.add(quad);
					});
				break;
			case "object":
				(store.match(null, null, null, null) as oxigraph.Quad[])
					.forEach(quad => {
						if((quad.object as oxigraph.NamedNode).value.match(this.regex)) match_store.add(quad);
					});
				break;
		}

		this.output_store_size = match_store.size;
		return match_store;
	}

	clone(): RegexTransformElement{
		return new RegexTransformElement(
			this.regex,
			this.flags,
			this.match_over,
			this.name,
			this.enabled
		);
	}

	toTransform(): util.RegexTransform{
		return {
			type: "regex",
			name: this.name,
			enabled: this.enabled,
			params: {
				regex: this.regex,
				flags: this.flags,
				match_over: this.match_over,
			}
		};
	}

	outputStoreSize(): number{
		return this.output_store_size;
	}
}

export function createTransformElement(transform: util.SparqlTransform): SparqlTransformElement;
export function createTransformElement(transform: util.RegexTransform): RegexTransformElement;
export function createTransformElement(transform: util.BasicTransform): util.Nullable<GenericTransformElement>{
	switch(transform.type){
		case "sparql":
			let sparql_transform = transform as util.SparqlTransform
			return new SparqlTransformElement(
				sparql_transform.params.query,
				sparql_transform.name,
				sparql_transform.enabled
			);
		case "regex":
			let regex_transform = transform as util.RegexTransform;
			return new RegexTransformElement(
				regex_transform.params.regex,
				regex_transform.params.flags,
				regex_transform.params.match_over,
				regex_transform.name,
				regex_transform.enabled
			);
		default:
			return null;
	}
}

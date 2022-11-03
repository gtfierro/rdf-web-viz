import { defineComponent } from "vue";

import * as util from "@/modules/util";
import type * as tf from "@/modules/transform_element";

export default defineComponent({
	data(){
		return {
			query_type: util.queryType((this.modelValue as tf.SparqlTransformElement).query)
		}
	},
	emits: [
		"update:modelValue",
		"delete"
	],
	methods: {
		requestDelete(){
			this.$emit("delete");
		},
		updateName(name: string){
			let output_transform = (this.modelValue as tf.SparqlTransformElement).clone();
			output_transform.name = name;

			this.$emit("update:modelValue", output_transform);
		},
		updateQuery(text_area: HTMLTextAreaElement){
			let query = text_area.value;
			this.query_type = util.queryType(query);

			let output_transform = (this.modelValue as tf.SparqlTransformElement).clone();
			output_transform.query = query;

			this.$emit("update:modelValue", output_transform);

			util.resizeTextArea(text_area);
		}
	},
	mounted(){
		util.resizeTextArea(this.$refs.input_query as HTMLTextAreaElement);
	},
	props: [
		"transform-index",
		"modelValue"
	]
});

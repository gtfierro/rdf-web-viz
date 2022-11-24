import { defineComponent } from "vue";

// @ts-ignore: Vue components have no types
import TransformHeader from "@/components/TransformHeader.vue";

import * as util from "@/modules/util";
import type * as tf from "@/modules/transform_element";

export default defineComponent({
	components: {
		TransformHeader
	},
	beforeUpdate(){
		this.query_type = util.queryType((this.modelValue as tf.SparqlTransformElement).query);
	},
	data(){
		return {
			query_type: util.queryType((this.modelValue as tf.SparqlTransformElement).query) as util.Nullable<util.QueryType>
		}
	},
	emits: [
		"delete",
		"move-down",
		"move-up",
		"update:modelValue"
	],
	methods: {
		requestDelete(){
			this.$emit("delete");
		},
		requestMoveDown(){
			this.$emit("move-down");
		},
		requestMoveUp(){
			this.$emit("move-up");
		},
		updateEnabled(enabled: boolean){
			let output_transform = (this.modelValue as tf.RegexTransformElement).clone();
			output_transform.enabled = enabled;

			this.$emit("update:modelValue", output_transform);
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
		"transform-max-index",
		"modelValue"
	],
	updated(){
		util.resizeTextArea(this.$refs.input_query as HTMLTextAreaElement);
	}
});

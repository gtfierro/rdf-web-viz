import { defineComponent, reactive } from "vue";

// @ts-ignore: Vue components have no types
import SparqlTransform from "@/components/SparqlTransform.vue";
// @ts-ignore: Vue components have no types
import RegexTransform from "@/components/RegexTransform.vue";

import * as tf from "@/modules/transform_element";
import * as util from "@/modules/util";

export default defineComponent({
	components: {
		SparqlTransform,
		RegexTransform
	},
	data() {
		return {
			active_transforms: reactive([] as {value: tf.TransformElement<util.TransformType>}[]),
			applyTransforms: reactive({value: (_transforms: typeof this.active_transforms) => {}}),
			last_deleted_transform: null as util.Nullable<{
				index: number,
				value: tf.TransformElement<util.TransformType>
			}>
		}
	},
	methods: {
		addSparqlTransform(){
			this.active_transforms.push({
				value: tf.createTransformElement(util.createDefaultTransform("sparql"))
			});
		},
		addRegexTransform(){
			this.active_transforms.push({
				value: tf.createTransformElement(util.createDefaultTransform("regex"))
			});
		},
		deleteTransform(index: number){
			let {value} = this.active_transforms.splice(index, 1)[0] ?? {value: undefined};
			if(value !== undefined) this.last_deleted_transform = {
				index,
				value
			};
		},
		restoreTransform(){
			if(this.last_deleted_transform !== null){
				this.active_transforms.splice(
					this.last_deleted_transform.index,
					0,
					{value: this.last_deleted_transform.value}
				);

				this.last_deleted_transform = null;
			}
		}
	}
});

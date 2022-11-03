import { defineComponent } from "vue";

import * as util from "@/modules/util";
import type * as tf from "@/modules/transform_element";

export default defineComponent({
	data(){
		return {
			selected_flags: (this.modelValue as tf.RegexTransformElement).flags.split('').sort(),
			valid_flags: util.mapFrom<util.RegexFlag, string>([
				['g', "Global"],
				['i', "Case Insensitive"],
				['m', "Multiline"],
				['s', "Dotall"],
				['u', "Unicode"],
				['y', "Sticky"]
			]),
			valid_match_overs: util.mapFrom<util.TripleElement, string>([
				["subject", "Subject"],
				["predicate", "Predicate"],
				["object", "Object"]
			])
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
			let output_transform = (this.modelValue as tf.RegexTransformElement).clone();
			output_transform.name = name;

			this.$emit("update:modelValue", output_transform);
		},
		updateRegex(regex: string){
			let output_transform = (this.modelValue as tf.RegexTransformElement).clone();
			output_transform.regex = regex;

			this.$emit("update:modelValue", output_transform);
		},
		updateFlags(){
			let output_transform = (this.modelValue as tf.RegexTransformElement).clone();
			output_transform.flags = this.selected_flags.sort().join('');

			this.$emit("update:modelValue", output_transform);
		},
		updateMatchOver(match_over: util.TripleElement){
			let output_transform = (this.modelValue as tf.RegexTransformElement).clone();
			output_transform.match_over = match_over;

			this.$emit("update:modelValue", output_transform);
		}
	},
	props: [
		"transform-index",
		"modelValue"
	],
});

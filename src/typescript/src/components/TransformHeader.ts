import { defineComponent } from "vue";

export default defineComponent({
	emits: [
		"delete",
		"move-down",
		"move-up",
		"update:enabled",
		"update:name"
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
			this.$emit("update:enabled", enabled);
		},
		updateName(name: string){
			this.$emit("update:name", name);
		}
	},
	props: [
		"enabled",
		"name",
		"transform-index",
		"transform-max-index"
	]
});

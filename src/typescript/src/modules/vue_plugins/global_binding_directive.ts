import type { App, Plugin } from "vue";

const DIRECTIVE_NAME = "global"

export default {
	install(app: App, _options){
		app.directive(DIRECTIVE_NAME, {
			created(el, binding){
				if(binding.arg === undefined) throw new Error(`v-${DIRECTIVE_NAME} arg not specified in element ${el}`);
				Object.assign(window, {
					[binding.arg]: binding.value
				});
			}
		});
	}
} as Plugin;

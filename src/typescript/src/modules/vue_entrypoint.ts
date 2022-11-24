import type { App } from "vue";

import global_binding_directive from "./vue_plugins/global_binding_directive";

export default function(app: App){
	app.use(global_binding_directive);
}

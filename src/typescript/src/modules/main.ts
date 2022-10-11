import init, {greet_rs} from "@/modules/brutil-js";

init().then(() => {
	let greet_rs_target = document.querySelector("#greet_rs-target") as HTMLHeadingElement;
	greet_rs_target.innerText = greet_rs(greet_rs_target.getAttribute("name") ?? "world");
});

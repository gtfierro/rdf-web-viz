use wasm_bindgen::prelude::*;
use brutil::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen(js_name = "greet_rs")]
pub fn wasm_greet_rs(name: &str) -> String {
    greet_rs(&format!("via WebAssembly, {name}"))
}

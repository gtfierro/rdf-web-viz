use pyo3::prelude::*;
use brutil::*;

/// Formats the sum of two numbers as string.
#[pyfunction]
fn sum_as_string(a: usize, b: usize) -> PyResult<String> {
    Ok((a + b).to_string())
}

/// A Python module implemented in Rust.
#[pymodule]
fn brutil_py(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
    // m.add_function(wrap_pyfunction!(greet_rs, m)?)?;


    // Is there a way to just decorate the reexport?
    // Can a wrapper macro be made?
    #[pyfn(m, name = "greet_rs")]
    fn py_greet_rs(name: &str) -> PyResult<String> {
        Ok(greet_rs(&format!("via Python, {name}")))
    }

    Ok(())
}

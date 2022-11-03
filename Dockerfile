ARG BRUTIL_DIRECTORY=/opt/brutil
ARG BRUPLINT_DIRECTORY=/opt/bruplint

FROM python:3.10.7-alpine3.16 as brutil-builder
ARG BRUTIL_DIRECTORY

LABEL bruplint=full

# Add dependencies...
RUN apk add --no-cache \
    # ...for installing Wasm-Pack
    curl \
    # ...for Rust
    gcc \
    # ...for Maturin and Wasm-Pack
    musl-dev \
    # ...for Maturin
    patchelf

# Set up variables for Rust
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo
ENV PATH=$CARGO_HOME/bin:$PATH

# Copy in Rust files
COPY --from=rust:1.64.0-alpine3.16 $RUSTUP_HOME $RUSTUP_HOME
COPY --from=rust:1.64.0-alpine3.16 $CARGO_HOME $CARGO_HOME

# Install Wasm-Pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install Maturin
RUN pip install maturin==0.13.5

# Set working directory
WORKDIR $BRUTIL_DIRECTORY

# Bring in Rust source code
COPY src/rust .

# Build Wasm package with Wasm-Pack
RUN wasm-pack build \
    --release \
    --out-name index \
    --target web \
    wasm

# Build Python package with Maturin
RUN maturin build \
    --release \
    --strip \
    --bindings pyo3 \
    --out python/target/wheels \
    --target-dir python/target \
    --manifest-path python/Cargo.toml

FROM node:18.10.0-alpine3.16 as bruplint-frontend-builder
ARG BRUTIL_DIRECTORY
ARG BRUPLINT_DIRECTORY

# Copy over and install requirements for Node
WORKDIR /tmp
COPY src/typescript/package.json package.json
RUN npm install

# Copy over Brutil_js package
WORKDIR $BRUPLINT_DIRECTORY/
COPY --from=brutil-builder $BRUTIL_DIRECTORY/wasm/pkg src/modules/brutil-js

# Bring in Node source
COPY src/typescript .

# Link to Node dependencies
RUN ln -s /tmp/node_modules node_modules

# Patch type definition to appease tsc
RUN sed -i "20c \  stack: string" node_modules/vfile-message/index.d.ts

# Build Node code
# RUN npm run check && \
#     npm run build

# Install again or it doesn't build
RUN npm install
RUN npm run build

FROM python:3.10.7-alpine3.16 as release
ARG BRUTIL_DIRECTORY
ARG BRUPLINT_DIRECTORY

ARG BRUPLINT_DIST_DIRECTORY=$BRUPLINT_DIRECTORY/dist
ARG BRUTIL_WHEEL_DIRECTORY=/opt/brutil_py
ARG VIRTUAL_ENV=/opt/venv

# Install and set up virtual environment
RUN pip install virtualenv && \
    virtualenv $VIRTUAL_ENV

# Update PATH (`source` command not available in this context)
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy over and install Brutil_py wheel
COPY --from=brutil-builder $BRUTIL_DIRECTORY/python/target/wheels $BRUTIL_WHEEL_DIRECTORY
RUN pip install $BRUTIL_WHEEL_DIRECTORY/*

WORKDIR $BRUPLINT_DIRECTORY

# Set up Python requirements for Python
COPY src/python/requirements.txt /tmp/requirements.txt
RUN pip install \
    --requirement /tmp/requirements.txt \
    --require-virtualenv \
    --no-cache-dir

# Bring in Python source
COPY src/python/bruplint_backend src

# Copy over compiled webpages
COPY --from=bruplint-frontend-builder $BRUPLINT_DIST_DIRECTORY astro

# Move assets to static files location and adjust template files as needed
#RUN mkdir -p static && \
#    mv -t static templates/assets && \
#    find templates -type f -and -name *.html -print0 | xargs -0 sed -i "s/\/assets/\/static\/assets/g"

# Run app
CMD ["python", "src"]

FROM release

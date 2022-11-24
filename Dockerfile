ARG BRUPLINT_DIRECTORY=/opt/bruplint

FROM node:18.10.0-alpine3.16 as bruplint-frontend-builder
ARG BRUPLINT_DIRECTORY

# Copy over and install requirements for Node
WORKDIR /tmp
COPY src/typescript/package.json package.json
RUN npm install

# Bring in Node source
WORKDIR $BRUPLINT_DIRECTORY/
COPY src/typescript .

# Link to Node dependencies
RUN ln -s /tmp/node_modules node_modules

# Patch type definition to appease tsc
# RUN sed -i "20c \  stack: string" node_modules/vfile-message/index.d.ts

# Build Node code
# RUN npm run check && \
#     npm run build

# Install again or it doesn't build
RUN npm install && \
    npm run build

FROM python:3.10.7-alpine3.16 as release
ARG BRUPLINT_DIRECTORY

# Add dependencies...
RUN apk add --no-cache \
    # ...for Rust
    gcc \
    # ...for Maturin (used by Pyoxigraph)
    musl-dev \
    patchelf \
    # ...for Pyoxigraph
    clang \
    g++ \
    linux-headers

ARG BRUPLINT_DIST_DIRECTORY=$BRUPLINT_DIRECTORY/dist
ARG VIRTUAL_ENV=/opt/venv

# Set up variables for Rust
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo
ENV PATH=$CARGO_HOME/bin:$PATH

# Copy in Rust files
COPY --from=rust:1.64.0-alpine3.16 $RUSTUP_HOME $RUSTUP_HOME
COPY --from=rust:1.64.0-alpine3.16 $CARGO_HOME $CARGO_HOME

# Add rustfmt, required for building Pyoxigraph
RUN rustup component add rustfmt

# Install and set up virtual environment
RUN pip install virtualenv && \
    virtualenv $VIRTUAL_ENV

# Update PATH (`source` command not available in this context)
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Set up Python requirements for Python
WORKDIR $BRUPLINT_DIRECTORY
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

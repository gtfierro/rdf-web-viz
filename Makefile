DOCKER=docker
DOCKERFILE=Dockerfile

DOCKER_DEV_COMMAND=flask --app app:create --debug run --host 0.0.0.0 --port 8000
DOCKER_DEV_VOLUME_BINDING=--mount type=bind,source=src/python/bruplint_backend,destination=/opt/bruplint/src
DOCKER_IMAGE_NAME=bruplint
DOCKER_PRUNE_ARGS=--all --force
DOCKER_PORT_BINDINGS=--publish 8000:8000
DOCKER_RUN_ARGS=--interactive --rm --tty

RUN_INTERACTIVE_COMMAND=/bin/sh

INFO_PREFIX=[make] Info: 

all: $(DOCKERFILE) pull-images
	$(info $(INFO_PREFIX)Building Dockerfile)
	@$(DOCKER) build . -f $(DOCKERFILE) -t $(DOCKER_IMAGE_NAME)

check: check-backend check-frontend

check-backend: check-rust-lib check-rust-python check-python

check-frontend: check-rust-lib check-rust-wasm check-typescript

check-rust-lib:
	$(info $(INFO_PREFIX)Checking core Rust library)
	@cd src/rust/lib && cargo check

check-rust-python:
	$(info $(INFO_PREFIX)Checking PyO3 wrapper library)
	@cd src/rust/python && cargo check

check-rust-wasm:
	$(info $(INFO_PREFIX)Checking Wasm-Bindgen wrapper library)
	@cd src/rust/wasm && cargo check

check-python:

check-typescript:
	$(info $(INFO_PREFIX)Checking Astro and Typescript)
	@cd src/typescript && npm run check

clean:
	$(info $(INFO_PREFIX)Pruning Bruplint Docker data)
	@$(DOCKER) system prune $(DOCKER_PRUNE_ARGS) --filter label=bruplint

clean-all:
	$(info $(INFO_PREFIX)Pruning all Docker data)
	@$(DOCKER) system prune $(DOCKER_PRUNE_ARGS)

dev-backend:
	$(info $(INFO_PREFIX)Running Docker image in development mode)
	@$(DOCKER) run $(DOCKER_RUN_ARGS) $(DOCKER_PORT_BINDINGS) $(DOCKER_DEV_VOLUME_BINDING) $(DOCKER_IMAGE_NAME) $(DOCKER_DEV_COMMAND)

dev-frontend:
	$(info $(INFO_PREFIX)Running Astro in development mode)
	@cd src/typescript && npm run dev

pull-images:
	$(info $(INFO_PREFIX)Pulling needed Docker images)
	@$(DOCKER) pull docker.io/library/node:18.10.0-alpine3.16
	@$(DOCKER) pull docker.io/library/python:3.10.7-alpine3.16
	@$(DOCKER) pull docker.io/library/rust:1.64.0-alpine3.16

run:
	$(info $(INFO_PREFIX)Running Docker image in production mode)
	@$(DOCKER) run $(DOCKER_RUN_ARGS) $(DOCKER_PORT_BINDINGS) $(DOCKER_IMAGE_NAME)

run-interactive:
	$(info $(INFO_PREFIX)Running Docker image in interactive mode)
	@$(DOCKER) run $(DOCKER_RUN_ARGS) $(DOCKER_PORT_BINDINGS) $(DOCKER_IMAGE_NAME) $(RUN_INTERACTIVE_COMMAND)

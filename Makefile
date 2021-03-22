include .env

TAG=`git rev-parse --short HEAD`
IMAGE="$(AWS_REPOSITORY)/pegasus:v$(TAG)"

default: build

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

login:
	@aws ecr get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

push: login
	@echo "## Pushing image to AWS ##"
	@docker push $(IMAGE)

publish:
	@kubectl set image deployment/pegasus-api pegasus-api=$(IMAGE)
	@kubectl set image deployment/pegasus-scheduler pegasus-scheduler=$(IMAGE)
	@kubectl set image deployment/pegasus-worker pegasus-worker=$(IMAGE)

publish-staging:
	@kubectl set image deployment/pegasus-api pegasus-api=$(IMAGE) --namespace staging
	@kubectl set image deployment/pegasus-scheduler pegasus-scheduler=$(IMAGE) --namespace staging
	@kubectl set image deployment/pegasus-worker pegasus-worker=$(IMAGE) --namespace staging

publish-dev:
	@kubectl set image deployment/pegasus-api pegasus-api=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-scheduler pegasus-scheduler=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-worker pegasus-worker=$(IMAGE) --namespace dev

	@kubectl set image deployment/pegasus-2-api pegasus-2-api=$(IMAGE) --namespace dev
    @kubectl set image deployment/pegasus-2-scheduler pegasus-2-scheduler=$(IMAGE) --namespace dev
    @kubectl set image deployment/pegasus-2-worker pegasus-2-worker=$(IMAGE) --namespace dev

deploy: build push publish

dev: build push publish-dev

stage: build push publish-staging

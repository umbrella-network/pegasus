REPOSITORY=008205684207.dkr.ecr.us-east-2.amazonaws.com/pegasus
TAG=`git rev-parse --short HEAD`
IMAGE="$(REPOSITORY):v$(TAG)"

default: build

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

login:
	`aws ecr get-login --no-include-email`

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

deploy: build push publish

dev: build push publish-dev

stage: build push publish-staging

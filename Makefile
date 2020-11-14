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

deploy: build push publish

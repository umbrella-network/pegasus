include .env

TAG=`git rev-parse --short HEAD`
IMAGE="$(AWS_REPOSITORY)/pegasus:v$(TAG)"
NEWIMAGE="$(NEW_AWS_REPOSITORY)/pegasus:v$(TAG)"
DEVELOP="$(NEW_AWS_REPOSITORY)/pegasus:develop"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := us-east-2

default: build

assume:
	@aws sts assume-role --profile default \
	--role-arn $(ECR_ROLE_ARN) \
	--region us-east-2 --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-central configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-central configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-central configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )


build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

build-bnc-testnet:
	@echo "## Building the docker image ##"
	@docker buildx build  --push --platform linux/amd64 -t $(DEVELOP) -t $(NEWIMAGE)  .

login:
	@aws ecr get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

login-new-dev:
	@aws ecr --profile umb-central --region $(AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(NEW_AWS_REPOSITORY)

push: login
	@echo "## Pushing image to AWS ##"
	@docker push $(IMAGE)


publish-new-dev: assume login-new-dev build-bnc-testnet 

publish-dev:
	@kubectl set image deployment/pegasus-api pegasus-api=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-scheduler pegasus-scheduler=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-worker pegasus-worker=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-2-api pegasus-2-api=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-2-scheduler pegasus-2-scheduler=$(IMAGE) --namespace dev
	@kubectl set image deployment/pegasus-2-worker pegasus-2-worker=$(IMAGE) --namespace dev



dev: build push publish-dev

dev-bnc-testnet: build-bnc-testnet newpush


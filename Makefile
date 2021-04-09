include .env

TAG=`git rev-parse --short HEAD`
IMAGE="$(AWS_REPOSITORY)/pegasus:v$(TAG)"
NEWIMAGE="$(NEW_AWS_REPOSITORY)/pegasus:v$(TAG)"

# CREDENTIALS = `aws sts assume-role --role-arn arn:aws:iam::087036112235:role/Developers --role-session-name 'ECR-Access' --query 'Credentials' --output json`
# AWS_ACCESS_KEY_ID = echo $(CREDENTIALS) | jq -r '.AccessKeyId'
# AWS_SECRET_ACCESS_KEY = echo $(CREDENTIALS) | jq -r '.SecretAccessKey'
AWS_SESSION_TOKEN = echo $(CREDENTIALS) | jq -r '.SessionToken'


CRED_TMP := /tmp/.credentials.tmp
ROLE_ARN := arn:aws:iam::087036112235:role/Developers
DURATION := 900

CREDENTIALS := `aws sts assume-role --profile default \
	--role-arn arn:aws:iam::087036112235:role/Developers \
	--region us-east-2 --role-session-name temp-session --duration $(DURATION) --query 'Credentials'`

AWS_ACCESS_KEY_ID := $(shell echo $(CREDENTIALS) | jq -r '.AccessKeyId')
AWS_SECRET_ACCESS_KEY := $(shell echo $(CREDENTIALS) | jq -r '.SecretAccessKey')
AWS_SESSION_TOKEN := $(shell echo $(CREDENTIALS) | jq -r '.SessionToken')



default: build

assume:
	aws --profile umb-central configure set aws_access_key_id "$(AWS_ACCESS_KEY_ID)"
	aws --profile umb-central configure set aws_secret_access_key "$(AWS_SECRET_ACCESS_KEY)"
	aws --profile umb-central configure set aws_session_token "$(AWS_SESSION_TOKEN)"


build:
	@echo "## Building the docker image ##"
        @docker buildx build --platform linux/amd64 -t $(IMAGE) .

build-bnc-testnet:
	@echo "## Building the docker image ##"
	@docker buildx build --platform linux/amd64 -t $(NEWIMAGE) -t bnc-testnet .

login:
	@aws ecr --profile umb-central --region us-east-2 get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

push: login
	@echo "## Pushing image to AWS ##"
	@docker push $(IMAGE)

newlogin:
	
	


newpush: assume login
	@echo "## Pushing image to AWS ##"
	@docker push $(NEWIMAGE)

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

dev-bnc-testnet: build-bnc-testnet newpush


include .env

TAG=`git rev-parse --short HEAD`
IMAGE="pegasus"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := eu-central-1
ECR_AWS_REGION := us-east-2

default: auth

assume:
	@aws sts assume-role --profile umb-master \
	--role-arn $(ECR_ROLE_ARN) \
	--region $(ECR_AWS_REGION) --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-central configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-central configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-central configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )

update-stg-kubeconfig:
	@aws sts assume-role --profile umb-master \
	--role-arn $(KUBE_ROLE_ARN) \
	--region $(AWS_REGION) --role-session-name temp-session --duration $(DURATION) --query 'Credentials' > $(CRED_TMP)
	@aws --profile umb-staging configure set aws_access_key_id $$(cat ${CRED_TMP} | jq -r '.AccessKeyId' )
	@aws --profile umb-staging configure set aws_secret_access_key $$(cat ${CRED_TMP} | jq -r '.SecretAccessKey' )
	@aws --profile umb-staging configure set aws_session_token $$(cat ${CRED_TMP} | jq -r '.SessionToken' )
	@aws --profile umb-staging --region $(AWS_REGION) eks update-kubeconfig --kubeconfig ~/.kube/config-staging --name umb_staging

build:
	@echo "## Building the docker image ##"
	@docker build -t $(IMAGE) .

build-sbx1:
	@docker buildx build  --push --platform linux/amd64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')" .
	@docker buildx build  --push --platform linux/arm64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')_arm64" .

build-sbx2:
	@docker buildx build  --push --platform linux/amd64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc02 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')" .
	@docker buildx build  --push --platform linux/arm64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc02 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')_arm64" .

login:
	@aws ecr --profile umb-central --region $(ECR_AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)

publish-sbx1:
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-metrics-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-minting-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-dispatcher-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-scheduler-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-agent-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-deviation-leader-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-liquidity-worker-bsc01 -n sandbox
	
publish-sbx2:
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-api-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-metrics-worker-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-minting-worker-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-dispatcher-worker-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-scheduler-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-agent-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-deviation-leader-worker-bsc02 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging rollout restart deployment/pegasus-liquidity-worker-bsc02 -n sandbox
	
auth: assume login update-stg-kubeconfig

sbx1: auth build-sbx1 publish-sbx1
sbx2: auth build-sbx2 publish-sbx2

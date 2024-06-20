include .env

TAG=`git rev-parse --short HEAD`
DEVELOP="$(AWS_REPOSITORY)/pegasus:develop"

CRED_TMP := /tmp/.credentials.tmp
DURATION := 900
AWS_REGION := eu-central-1
ECR_AWS_REGION := us-east-2


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


build-dev1:
	@echo "## Building the docker image for validator 1 ##"
	@docker buildx build  --push --platform linux/amd64 -t "$(DEVELOP)1" .;\

build-dev2:
	@echo "## Building the docker image for validator 2 ##"
	@docker buildx build  --push --platform linux/amd64 -t "$(DEVELOP)2" .;\

build-sbx:
	@docker buildx build  --push --platform linux/amd64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')" .
	@docker buildx build  --push --platform linux/arm64 -t "$(shell kubectl --kubeconfig ~/.kube/config-staging get deployments -n sandbox pegasus-api-bsc01 -o=jsonpath='{$$.spec.template.spec.containers[:1].image}')_arm64" .

login:
	@aws ecr --profile umb-central --region $(ECR_AWS_REGION) get-login-password  | docker login --username AWS --password-stdin $(AWS_REPOSITORY)


publish-bsc1:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-api-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-metrics-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-metrics-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-minting-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-minting-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-dispatcher-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-dispatcher-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-scheduler-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-scheduler-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-agent-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-agent-bsc01 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-feeddata-worker-bsc01 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-feeddata-worker-bsc01 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-feedwsdata-worker-bsc01 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-feedwsdata-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-deviation-leader-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-deviation-leader-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-liquidity-worker-bsc01 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-liquidity-worker-bsc01 -n dev

publish-bsc2:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-api-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-api-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-metrics-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-metrics-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-minting-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-minting-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-dispatcher-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-dispatcher-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-scheduler-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-scheduler-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-agent-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-agent-bsc02 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-feeddata-worker-bsc02 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-feeddata-worker-bsc02 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-feedwsdata-worker-bsc02 -n dev
	# @kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-feedwsdata-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-deviation-leader-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-deviation-leader-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-liquidity-worker-bsc02 -n dev
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-liquidity-worker-bsc02 -n dev

publish-sbx1:
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-api-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-metrics-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-metrics-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-minting-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-minting-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-dispatcher-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-dispatcher-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-scheduler-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-scheduler-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-agent-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-agent-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=0 deployment/pegasus-deviation-leader-worker-bsc01 -n sandbox
	@kubectl --kubeconfig ~/.kube/config-staging scale --replicas=1 deployment/pegasus-deviation-leader-worker-bsc01 -n sandbox

auth: assume login update-stg-kubeconfig

sbx: auth build-sbx publish-sbx1

dev-validator1: auth build-dev1 publish-bsc1

dev-validator2: auth build-dev2 publish-bsc2

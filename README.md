## Status DEVELOP
[![tests](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml/badge.svg?branch=develop)](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml)

* `pegasus-bsc-01`: ![pegasus-bsc-01-dev](https://argocd.dev.umb.network/api/badge?name=pegasus-bsc-01-dev)
* `pegasus-bsc-02`: ![pegasus-bsc-02-dev](https://argocd.dev.umb.network/api/badge?name=pegasus-bsc-02-dev)
* `pegasus-eth-01`: ![pegasus-eth-01-dev](https://argocd.dev.umb.network/api/badge?name=pegasus-eth-01-dev)
* `pegasus-eth-02`: ![pegasus-eth-02-dev](https://argocd.dev.umb.network/api/badge?name=pegasus-eth-02-dev)

## Status PROD

[![tests](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml)
[![ci](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml)

* `pegasus-bsc-01`: ![pegasus-bsc01](https://argocd.umb.network/api/badge?name=pegasus-bsc01)
* `pegasus-bsc-02`: ![pegasus-bsc02](https://argocd.umb.network/api/badge?name=pegasus-bsc02)
* `pegasus-eth-01`: ![pegasus-eth01](https://argocd.umb.network/api/badge?name=pegasus-eth01)
* `pegasus-eth-02`: ![pegasus-eth02](https://argocd.umb.network/api/badge?name=pegasus-eth02)

# Description

Umbrella Validator

# Setup
Install packages.

```shell script
npm install
```

Setup a dotenv file (`.env`) with local configuration values. 
```shell script
cp example.env .env
```

## ENV variables
```
# A unique node name for multi-node configuration
COMPOSE_PROJECT_NAME=

# API port to be exposed
PORT=3030

# MongoDB port to be exposed for managed db
MONGO_PORT=27017

# Redis URL
REDIS_URL=redis://cache:6379

# MongoDB URL
MONGODB_URL=mongodb://db:27017/pegasus

# Ethereum-compatible node URL
BLOCKCHAIN_PROVIDER_URL=http://eth:8545

# Secret key of the node
VALIDATOR_PRIVATE_KEY=0x000000000000000000000000000000000000000000000000000000000000000

# Contract registry address
REGISTRY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Gas price for block submission
GAS_PRICE=100000000

# Interval to wake up the worker service
BLOCK_CREATION_JOB_INTERVAL=10000

# Cryptocompare API Key
CRYPTOCOMPARE_API_KEY=

# Genesis Volatility API Key
GENESIS_VOLATILITY_API_KEY=

# Polygon.io API Key
POLYGON_IO_API_KEY=

# IEX API Key
IEX_API_KEY=

# Coinmarketcap API Key
COINMARKETCAP_API_KEY=

# Path to a file with L2 definitions
FEEDS_FILE=

# Path to a file with On-Chain definitions
FEEDS_ON_CHAIN_FILE=

# A corn rule that allows for caching the feeds file
FEEDS_CACHE_REFRESH_CRON_RULE=

# AWS repository for docker containers (dev only)
AWS_REPOSITORY=

# NewRelic App name
NEW_RELIC_APP_NAME=

# NewRelic License Key
NEW_RELIC_LICENSE_KEY=
```
# Network

Instructions how to run blockchain locally you can find in phoenix, you need to:
- start local blockchain node
- deploy smart contracts to local blockchain node
- get address of Chain and keys for validator

# Commands

## Building
First, compile the application:
```shell script
npm run build
```

## Run

### Local development

```shell
# Run core services (redis and MongoDB) through docker-compose
docker-compose -f docker-compose.core.yml up
# run in the debug mode
npm run start:dev:scheduler
# run in the debug mode
npm run start:dev:worker -- --worker BlockMintingWorker
# run in the debug mode
npm run start:dev
```

### Local QA with multiple validators

One-line command:
```shell script
cp example.env .env.node1
docker-compose --env-file=.env.node1 build && docker-compose --env-file=.env.node1 up -d

cp example.env .env.node2
docker-compose --env-file=.env.node2 build && docker-compose --env-file=.env.node2 up -d

cp example.env .env.node3
docker-compose --env-file=.env.node3 build && docker-compose --env-file=.env.node3 up -d
```

## Run core services (redis and MongoDB) through docker-compose

```shell script
docker-compose -f docker-compose.core.yml up

# alternatively
docker-compose up db cache

# run with a custom env file
docker-compose -f docker-compose.core.yml --env-file=.env

# alternatively
docker-compose -f docker-compose.core.yml up db cache
```

## Run core services + validator through docker-compose

```shell script
docker-compose up

# run with a custom env file
docker-compose --env-file=.env up
```

## Run validator w/o core services through docker-compose

```shell script
docker-compose -f docker-compose.yml up

# run with a custom env file
docker-compose -f docker-compose.yml --env-file=.env
```

## Run the worker service
```shell script
npm run start:worker -- --worker BlockMintingWorker

# run in the debug mode
npm run start:dev:worker -- --worker BlockMintingWorker
```

## Run the scheduler service
```shell script
npm run start:scheduler

# run in the debug mode
npm run start:dev:scheduler
```

## Run Web API service
```shell script
npm run start

# run in the debug mode
npm run start:dev
```

## Edit On-Chain and L2 definitions 

```shell script
vi config/feeds.json
vi config/feedsOnChain.json
```

# Testing

```shell script
echo 'MONGODB_URL=mongodb://localhost:27017/pegasus' > .testing.env

docker-compose up -d db

npm run test
```


# Deployment

```shell script

echo 'AWS_REPOSITORY=...' >> .env
make
```

## kubectl examples

```shell script
# set env variable
kubectl get pods -n dev
kubectl logs pegasus-worker-74cffb4588-dmrbs -n dev -f
kubectl set env deployment/pegasus-worker REGISTRY_CONTRACT_ADDRESS='0x622c7725a8D1103E44F89341A6358A0e811Df0a5' -n dev
```

# API Reference

We document our API using swagger. Access `http://localhost:3003/docs` after the server starts to explore the available endpoints. 

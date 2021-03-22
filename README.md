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

# AWS repository for docker containers (dev only)
AWS_REPOSITORY=
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
npm start:dev
```

## Edit On-Chain and L2 definitions 

```shell script
vi config/feeds.json
vi config/feedsOnChain.json
```

## Running multiple validators
One-line command:
```shell script
cp example.env .env.node1
docker-compose --env-file=.env.node1 up -d

cp example.env .env.node2
docker-compose --env-file=.env.node2 up -d

cp example.env .env.node3
docker-compose --env-file=.env.node3 up -d
```

# Testing

```shell script
echo 'MONGODB_URL=mongodb://localhost:27017/pegasus' > .testing.env

docker-compose up db -d

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

# API

`http://localhost:3030/blocks/latest`:
`http://localhost:3030/blocks/3`:

```json
{
  "data": {
    "numericFcdKeys": [
      [
        "eth-eur",
        "eth-usd"
      ]
    ],
    "numericFcdValues": [
      481.92,
      587.56
    ],
    "_id": "83620f18-a289-4f04-b7c4-1eea3d416a7c",
    "timestamp": "2020-12-16T09:01:51.015Z",
    "height": 3,
    "root": "0x8817cbe7d10306b7991cc85aefcddc750c2f6be82b2b81193a138be92c777d42",
    "data": {
      "eth-usd": 587.56,
      "eth-eur": 481.92,
      "eth-usdt": 587.25,
      "usdt-eur": 0.8217,
      "usdt-usd": 1.001,
      "wbtc-usd": 19477.16,
      "aave-usd": 81.66,
      "yfi-usd": 24665.35,
      "uni-usd": 3.346,
      "comp-usd": 155.55
    },
    "__v": 0
  }
}
```

`http://localhost:3030/info`:

```json
{
  "validator": "0x...",
  "contractRegistryAddress": "0x...",
  "validatorRegistryAddress":"0x...",
  "chainContractAddress":"0x...",
  "version":"0.3.2",
  "name": "default"
}
```

`http://localhost:3030/health`:

```text
pong
```

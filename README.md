![Umbrella network - logo](./assets/umb.network-logo.png)

[![tests](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml)
[![ci](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml)


# Documentation

Visit the [Umbrella Network](https://umbrella-network.readme.io/docs/umbrella-network-architecture) website for more information.

# Description

Umbrella Validator fetches data from third-party data sources, agrees with other validators in the sidechain on the right values, and submits the data to the blockchain.

# Prerequisites

## Hardware Requirements

Hardware requirements are light. The only heavy part is you'll need a blockchain node connection. You can use a machine with as little as 10GB of storage and 2GB of RAM.

## Validator Requirements

- docker - [Install](https://docs.docker.com/engine/install/)
- docker-compose - [Install](https://docs.docker.com/compose/install/)

In order to run scheduler, worker and API separately you need nodejs and npm.
- node >= 16 - [Install](https://nodejs.org/en/download/)

# Network

Instructions how to run blockchain locally you can find in [phoenix](https://github.com/umbrella-network/phoenix), you need to:
- start local blockchain node
- deploy smart contracts to local blockchain node
- get address of Chain and keys for validator

# Run Validator 

There are two docker compose file: `docker-compose.yml` and `docker-compose.core.yml`
- docker-compose.yml: It starts mongodb, redis, schedulers, workers and api.
- docker-compose-core.yml: It starts mongodb and redis.

In the section **Run Validator Fully** you will need to use `docker-compose.yml`.
In the section **Run Validator Separately** you will need to use `docker-compose.core.yml`.

**NOTE** For `docker-compose.yml` you need to replace the MONGO_URL and REDIS_URL settings to work with docker.

```shell script
echo 'MONGODB_URL=mongodb://db:27017/pegasus'>> .env
echo 'REDIS_URL=redis://cache:6379' >> .env
```

## Run Validator Fully 

### Local QA

One-line command:
```shell script
cp example.env .env
docker-compose --env-file=.env build && docker-compose --env-file=.env
```

### Local QA with multiple validators

It is the same previous command but you can specify different envs.

One-line command:
```shell script
#node 1
cp example.env .env.node1
docker-compose --env-file=.env.node1 build && docker-compose --env-file=.env.node1 up -d

#node 2
cp example.env .env.node2
docker-compose --env-file=.env.node2 build && docker-compose --env-file=.env.node2 up -d

#node 3
cp example.env .env.node3
docker-compose --env-file=.env.node3 build && docker-compose --env-file=.env.node3 up -d
```

## Run Validator Separately

### Setup

Install packages.

```shell script
npm install
```

Build
```shell script
npm build 
```

Setup a dotenv file (`.env`) with local configuration values. 
```shell script
cp example.env .env
```

### Run core services (redis and MongoDB) through docker-compose

```shell script
docker-compose -f docker-compose.core.yml up

# run with a custom env file
docker-compose --env-file=.env -f docker-compose.core.yml  up
```

## Run the worker service

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.core.yml up
```

Run worker start script, you need to inform what worker you want to start
```shell script
npm run start:worker -- --worker BlockMintingWorker

# run in the debug mode
npm run start:dev:worker -- --worker BlockMintingWorker
```

## Run the scheduler service

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.core.yml up
```

Run start scheduler script
```shell script
npm run start:scheduler

# run in the debug mode
npm run start:dev:scheduler
```

## Run Web API service

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.core.yml up
```

Run start API service script
```shell script
npm run start

# run in the debug mode
npm run start:dev
```

## Run Agents
```shell script
npm run start:dev:agent

# run only FeedAgent agent
npm run start:dev:agent -- --agent FeedAgent
```

## Edit On-Chain and L2 definitions 

```shell script
npm run start:dev:agent

# run only FeedAgent agent
npm run start:dev:agent -- --agent FeedAgent
```

# Testing

Setup a testing dotenv file (`.testing.env`) with local configuration values and set MONDODB_URL for use local instance. 
```shell script
echo 'MONGODB_URL=mongodb://localhost:27017/pegasus' > .testing.env
```

Build docker imagine using docker-compose
```shell script
docker-compose -f docker-compose.core.yml up
```

In another terminal run the test script
```shell script
npm run test
```

# Deployment

```shell script

echo 'AWS_REPOSITORY=...' >> .env
make
```

# Create your own fetcher

## Create Fetcher

Fetchers is responsible to fetch data. You can use HTTP or WS protocols.

### HTTP

1. Add the new fetcher under `src/services/fetchers` this class must have apply method that does the fetch for a specif endpoint. Refer to `src/services/fetchers/CryptoCompareHistoDayFetcher.ts` for more details;
2. Export the new fetcher at `src/services/fetchers/index.ts`;
3. Add the new fetcher in collection object at `src/repositories/FeedFetcherRepository.ts`, it will be used on `src/services/FeedProcessor.ts`.

### WS

1. Create a WS Client at `src/services/ws`, check `src/services/ws/CryptoCompareWSClient.ts` to get more details;
2. Create a initializer at `src/services`, check `src/services/CryptoCompareWSInitializer.ts` to get more details;
3. At `src/tasks.ts` start the initializer. Check how `PolygonIOPriceInitializer` and `CryptoCompareWSInitializer` initialize;
4. Add the new fetcher under `src/services/fetchers` this class must have apply method that does the fetch for a specific data source. Refer to `src/services/fetchers/CryptoCompareHistoDayFetcher.ts` for more details;
5. Export the new fetcher at `src/services/fetchers/index.ts`;
6. Add the new fetcher in collection object at `src/repositories/FeedFetcherRepository.ts`, it will be used on `src/services/FeedProcessor.ts`.

## Create Calculator

Calculators are responsible to receive data and return it formatted.

1. Create the new calculator on `src/services/calculators`, check `src/services/calculators/OptionsPriceCalculator.ts` to get more details;
2. Export the new calculator at `src/services/calculators/index.ts`;
3. Add the new calculator in collection object at `src/repositories/CalculatorRepository.ts`, it will be used on `src/services/FeedProcessor.ts`.

## Add new dispatcher
1. Add new chainId on `src/types/ChainsIds.ts`.
2. Add the new settings on `src/config/settings.ts`.
3. Create the Dispatcher class under `src/services/dispatcher/` folder (see `src/services/dispatcher/BSCBlockDispatcher.ts`).
4. Add the dispatcher instance inside `this.dispatcher` in the constructor method on `src/services/dispatcher/BlockChainDispatcher.ts`

# API Reference

We document our API using swagger. Access `http://localhost:3003/docs` after the server starts to explore the available endpoints. 

# Release History

See the [Change Log.](https://github.com/umbrella-network/pegasus/blob/develop/CHANGELOG.md)

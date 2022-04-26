![Umbrella network - logo](./assets/umb.network-logo.png)

[![tests](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/tests.yml)
[![ci](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml/badge.svg?branch=main)](https://github.com/umbrella-network/pegasus/actions/workflows/cicd.yml)


# Documentation

Visit the [Umbrella Network](https://umbrella-network.readme.io/docs/umbrella-network-architecture) website for more information.

# Description

Umbrella Validator fetches data from third-party data sources, agrees with other validators in the sidechain on the right values, and submits the data to the blockchain

# Setup

Install packages.

```shell script
npm install
```

Setup a dotenv file (`.env`) with local configuration values. 
```shell script
cp example.env .env
```

# Docker Install

Make sure docker is installed on the machine. Check if `docker info` is available.

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

# Network

Instructions how to run blockchain locally you can find in [phoenix](https://github.com/umbrella-network/phoenix), you need to:
- start local blockchain node
- deploy smart contracts to local blockchain node
- get address of Chain and keys for validator

# Commands

## Building

First, compile the application:
```shell script
npm run build
```

## Local QA with multiple validators

One-line command:
```shell script
cp example.env .env.node1
docker-compose --env-file=.env.node1 build && docker-compose --env-file=.env.node1 up -d

cp example.env .env.node2
docker-compose --env-file=.env.node2 build && docker-compose --env-file=.env.node2 up -d

cp example.env .env.node3
docker-compose --env-file=.env.node3 build && docker-compose --env-file=.env.node3 up -d
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

# API Reference

We document our API using swagger. Access `http://localhost:3003/docs` after the server starts to explore the available endpoints. 

# Release History

See the [Change Log.](https://github.com/umbrella-network/pegasus/blob/develop/CHANGELOG.md)

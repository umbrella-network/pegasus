# Description

Umbrella Validator

# Setup
Install packages.

```shell script
$ npm install
```

Setup a dotenv file (`.env`) with local configuration values. Example:

```
PORT=3000 # HTTP port the server will listen to.
```

# Commands
## Running Locally (Development)

Instructions how to run blockchain locally you can find in phoenix, you need to:
- start local blockchain node
- deploy smart contracts to local blockchain node
- get address of Chain and keys for validator

When blockchain is running locally:

```shell script
docker-compose up

# clean up collections if needed:
npm run task:dev -- --task db:cleanup

# make sure config folder contains feeds
cat config/feeds.json
cat config/feedsOnChain.json

npm run start:dev:scheduler
npm run start:dev:worker -- --worker BlockMintingWorker

npm run start:dev
```

## Worker
```shell script
$ npm run start:worker -- --worker BlockMintingWorker
```

## Scheduler
```shell script
$ npm run start:scheduler
```

## Building & Releasing
First, compile the application:
```shell script
$ npm run build
```

This will create a directory with optimized JS files under `dist`.

Run the application under production via:

```shell script
$ npm run start
```

### Deploying

```shell script
make stage

# clean up collections if needed:
npm run task -- --task db:cleanup

# make sure config folder contains feeds
cat config/feeds.json
cat config/feedsOnChain.json
```

### Kubctl cheats

```shell script
# set env variable
kubectl set env deployment/pegasus-worker REGISTRY_CONTRACT_ADDRESS='0x622c7725a8D1103E44F89341A6358A0e811Df0a5' --namespace staging
```

## Api

Sample response for `http://localhost:3000/blocks/height/3`:

```json
{
  "data": {
    "numericFcdKeys": [
      [
        "eth-eur",
        "eth-usd"
      ]
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

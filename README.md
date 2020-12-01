# Description

ADD PEGASUS' DESCRIPTION HERE.

# Setup
Install packages.

```
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

```
docker-compose up

# load feeds on first run
npm run task:dev -- --task db:load:feeds

npm run start:dev:scheduler
npm run start:dev:worker -- --worker BlockMintingWorker

npm run start:dev
```

## Worker
```
$ npm run start:worker -- --worker BlockMintingWorker
```

## Scheduler
```
$ npm run start:scheduler
```

## Building & Releasing
First, compile the application:
```
$ npm run build
```

This will create a directory with optimized JS files under `dist`.

Run the application under production via:

```
$ npm run start
```

### Deploying

```shell script
make deploy

# on first deploy - ssh to pod and run:
npm run task -- --task db:load:feeds
```

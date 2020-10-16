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
```
$ npm run start:dev
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
$ npm run bundle
```

This will create a directory with optimized JS files under `dist`.

Run the application under production via:

```
$ npm run start
```

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased
- Added a new fetcher for the OptionPrices
- Added a default value for discrepancy in consensus

## [5.2.0] - 2021-09-23
### Added
- add `KaikoPriceStream` stream fetcher

## [5.1.1] - 2021-09-03
### Fixed
- now it just logs and does not break feed processing if does not find fetcher

## [5.1.0] - 2021-08-31
### Changed
- Ignore validators with high discrepancies

## [5.0.9] - 2021-08-30
### Changed
- turn off power check

### Fixed
- exclude validator from consensus if check for its status fails

## [5.0.8] - 2021-08-25
### Changed
- change gas calculation

## [5.0.7] - 2021-08-25
### Changed
- unify way for executing "normal" and canceling transactions
- update `ethers`

## [5.0.6] - 2021-08-24
### Added
- add additional logs for `BlockMintingWorker`

## [5.0.5] - 2021-08-24
### Added
- add handling for `nonce has already been used` error

## [5.0.4] - 2021-08-19
### Added
- add additional logs for tracking number of leaves and FCDs

## [5.0.3] - 2021-08-13
### Changed
- change enqueueing rules

## [5.0.2] - 2021-08-12
### Changed
- update ethers to version that supports EIP-1559 London

## [5.0.1] - 2021-08-11
### Changed
- use SDK v4.0.1
- as temporary fix change `jobId`

## [5.0.0] - 2021-08-07
### Added
- add InfluxDB to docker-compose core

### Changed
- support for `Chain` with 2 signatures requirement
- update toolbox

## [4.2.17] - 2021-08-06
### Fixed
- adds JobId to ensure jobs are unique (limits task queue growing indefinitely)

## [4.2.16] - 2021-08-05
### Removed
- removed `ValidatorRegistry` settings

## [4.2.15] - 2021-07-30
### Changed
- better gas estimation

## [4.2.14] - 2021-07-29
### Added
- detailed logs about gas

## [4.2.13] - 2021-07-29
### Added
- add gas price to logs

## [4.2.12] - 2021-07-29
### Changed
- clear logs after debugging

## [4.2.11] - 2021-07-29
### Added
- more logs for minting tx process for debugging purpose

## [4.2.10] - 2021-07-28
### Added
- more logs for minting tx process

## [4.2.9] - 2021-07-26
### Added
- DB Migration service
- add version to API block endpoint

### Changed
- store all signed blocks and let explorer choose valid one
- return list of all blocks for `blockId` call
- wait for new block to be minted before set timeout for submitted tx

### Removed
- remove `RevertedBlockResolver`

## [4.2.8] - 2021-07-15
### Fixed
- fix `obfuscate` function

## [4.2.7] - 2021-07-14
### Added
- add more details to `/info` endpoint
- add protection to not override minted blocks

## [4.2.6] - 2021-07-13
### Added
- Add SANDBOX workflow

## [4.2.5] - 2021-07-12
### Fixed
- wait for canceling tx to be minted

## [4.2.4] - 2021-07-09
### Fixed
- fix linters errors

## [4.2.3] - 2021-07-09
### Fixed
- fix default paths to feeds files

## [4.2.2] - 2021-07-07
### Added
- better error handling for `predict the future` error 

## [4.2.1] - 2021-07-07
### Changed
- Updated /debug endpoint

## [4.2.0] - 2021-07-06
### Added
- Polygon.io for crypto

## [4.1.2] - 2021-07-06
### Changed
- change error message for `SignatureCollector` to reflect issue better 

## [4.1.1] - 2021-07-05
### Added
- make log level configurable

### Fixed
- fix gas calculation

## [4.1.0] - 2021-07-02
### Added
- new fetcher CoinmarketcapHistoDay
- new fetcher CoinmarketcapHistoHour

## [4.0.0] - 2021-06-29
### Added
- `OnChain` feed collector

### Changed
- restrict packages versions with `~`

## [3.3.1] - 2021-06-28
### Fixed
- Remove last block if it was not minted

## [3.3.0] - 2021-06-26
### Added
- save blocks at Block Sign request

### Changed
- refactored block saving mechanism for code reuse
- typo fix. revered -> reverted
- split BlockSigner into services for better QA

### Fixed
- potentially fix issue with discrepancies by refactoring code

### Removed
- leaf collection is no longer used
- DB migrations

## [3.2.3] - 2021-06-23
### Fixed
- Ignore out-of-date crypto prices in CryptoCompareWSClient

## [3.2.2] - 2021-06-18
### Fixed
- Fixed VWAP calculation
- Fixed aggregate price calculation

## [3.2.1] - 2021-06-18
### Added
- CryptoCompare re-connect timeout

## [3.2.0] - 2021-06-18

### Changed
- remove loadFeeds to use toolbox's loadFeeds
- calculate gas price dynamically
- TX cancellation for pending TXs
- worker's jobs are now deleted from redis when completed
- Minted blocks are reported to NewRelic

### Removed
- remove unnecessary consensus data, that block explorer is getting directly from blockchain

## [3.1.1] - 2021-06-09
### Added
- Moves constants to its own directory

## [3.1.0] - 2021-06-03

### Added
- added reporting of reverted blocks to NewRelic
- added reporting of data source errors to NewRelic
- added reporting of transaction errors to NewRelic
- support CryptoCompare Multiple Symbols Price API

## [3.0.2] - 2021-06-01
### Fixed
- cicd workflow run to set production tag

## [3.0.1] - 2021-06-01
### Added
- add new worker to report metrics to NewRelic
- Improve tests execution and cleanup
- Ensure Prod build is not executed if tests failed
- Add develop workflow for the E2E testing (SDK and Reff App)
- Add Badges for actions and Argocd

## [3.0.0] - 2021-05-24
### Added
- collect consensus data from events

### Changed
- support storing only latest FCDs
- support full `Chain` storage optimisation
  
### Removed
- delete deprecated blocks on boot
- remove `MerkleTree` class (use one from SDK)

## [2.0.4] - 2021-05-20
### Changed
- Average CPI implemented

## [2.0.3] - 2021-05-10
### Changed
- Fixed BlockSigner and the case when validator fails to calculate values

## [2.0.2] - 2021-05-10
### Changed
- Support hundreds of US equities

## [2.0.1] - 2021-04-23
### Added
- logging for consensus retries and version check

## [2.0.0] - 2021-04-22
### Added
- added new event `PriceDiscrepancy` reported to NewRelic
- self-adjusting consensus, that can ignore discrepancy pairs

## [1.0.1] - 2021-04-16

## Changed
- set `dataTimestamp` with an offset

## [1.0.0] - 2021-04-15

## Changed
- use `dataTimestamp` as part of consensus
- use `chain.getStatus` to pull all consensus data

## Removed
- `ValidatorRegistry`

## [0.10.6] - 2021-04-15

### Fix
- cryptocompare logging

## [0.10.5] - 2021-04-15

### Added
- Resubscribe stale subscriptions

## [0.10.4] - 2021-04-13

### Added
- Check cryptocompare heartbeat

## [0.10.2] - 2021-04-13

### Fix
- Save all values and timestamps on redis

## [0.10.1] - 2021-04-13

### Fix
- Debug endpoint

## [0.10.0] - 2021-04-13

### Added
- code prettier

### Fix
- Keep at least one value provided by cryptocompare

## [0.9.3] - 2021-04-09

### Fix
- Fixed SIGNATURE_TIMEOUT

## [0.9.2] - 2021-04-08

### Change
- SIGNATURE_TIMEOUT is defaulted to 15 seconds

## [0.9.1] - 2021-04-08

### Change
- optimized getValidators
- configure CryptoCompare price expiry
- added extra logs

## [0.9.0] - 2021-04-07

### Added
- Added StatsD Client

### Change
- submit prices based on a timestamp

## [0.8.2] - 2021-04-02

### Change
- better error handling in /info

## [0.8.1] - 2021-04-02

### Added
- timout for /signature endpoint

## [0.8.0] - 2021-04-02

### Added
- More logging to BlockSigner
- Disconnect CryptoCompare WS every 4 hours

### Changed
- feed files can be loaded from a remote host
- check for the leader based on the next block
- NewRelic is disabled by default

## [0.7.2] - 2021-03-25

### Fix
- feedsOnChain.yaml

## [0.7.1] - 2021-03-25

### Added
- CryptoCompare data source for UMB

## [0.7.0] - 2021-03-25

### Added
- Extra logging with coloring
- Multiple optimizations to speed up consensus

## [0.6.2] - 2021-03-24

### Fixed
- The leader includes his signature first

## [0.6.1] - 2021-03-23

### Fixed
- No EX for CryptoCompare WS
- Fixed MongoDB queries to be compatible with 4.0.0

## [0.6.0] - 2021-03-23

### Fixed
- deal with discrepancies

### Removed
- /blocks endpoint

### Fixed
- renamed HOLO to HOT

## [0.5.0] - 2021-03-13
### Added
- documented all env variables
- multi-node set-up

### Fixed
- do not cache `ValidatorRegistry`

## [0.4.0] - 2021-03-12

### Added

- Repository Migration

## [0.3.3] - 2021-03-12

### Fixed

- Support case when blocks can be reverted

## [0.3.2] - 2021-03-09

### Fixed

- precision in FeedProcessor

## [0.3.1] - 2021-03-09

### Fixed

- do not cache `Chain` address, pull it from registry
- environment info

### Changed

- update toolbox version

## [0.3.0] - 2021-03-09

### Fixed

- FeedProcessor assigned the same label to all values

## [0.2.3] - 2021-03-08

### Added

- add validator to `/info` endpoint

## [0.2.2] - 2021-03-08

### Fixed

- fix `/info` endpoint

## [0.2.1] - 2021-03-03

### Changed

- updated package.json version

## [0.2.0] - 2021-03-03

### Added

### Changed

- fixed an bug in ChainContract::submit when Signer was not provided
- bumped toolbox version

## [0.1.0] - 2021-02-24

### Added

- initial version
- use registry to resolve Chain address
- support numeric first class data
- cryptocompare API support
- Genesis Volatility support
- support multiple data sources
- validate feeds.json through schema

### Changed

- use `@umb-network/toolbox` for fetching ABIs for contracts

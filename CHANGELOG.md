# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

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

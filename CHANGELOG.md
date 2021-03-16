# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

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

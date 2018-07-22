# Waka

[![Maintainability](https://api.codeclimate.com/v1/badges/bf59f49c861eee7e624e/maintainability)](https://codeclimate.com/github/consindo/waka/maintainability)
[![Dependency Status](https://david-dm.org/consindo/waka.svg?theme=shields.io)](https://david-dm.org/consindo/waka)
[![devDependency Status](https://david-dm.org/consindo/waka/dev-status.svg?theme=shields.io)](https://david-dm.org/consindo/waka#info=devDependencies)

![Waka Icon](https://raw.githubusercontent.com/consindo/waka/master/dist/branding/launcher-icon-3x.png)

Your guide around public transport in Auckland & Wellington. Help us add more cities!

<https://getwaka.com>

## Public API

We have a public API! Check here for the documentation: <https://getwaka.com/docs/index.html>

## Quickstart Client Development

* You'll need node.js & npm installed. (at least v8)
* `npm install` to install deps.
* `npm run watch:live` to watch and recompile js & css
* Go to `http://localhost:8009`

## Slowstart Client + Server Dev

Install Microsoft SQL Server - use the following command to do it easily in Docker
`docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Str0ngPassword" -p 1433:1433 -d microsoft/mssql-server-linux:latest`

Then open SQL Server, and run `CREATE DATABASE transit_master`

You'll also need Azure Storage Emulator installed - https://azure.microsoft.com/en-us/downloads/

Check out the following links for more info:

* <https://www.jono.nz/2017/10/08/transit-part1/>
* <https://www.jono.nz/2018/02/25/transit-part2/>

### Code Style

* Run it through Prettier <https://github.com/prettier/prettier>

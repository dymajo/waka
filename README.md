# Waka

[![Maintainability](https://api.codeclimate.com/v1/badges/bf59f49c861eee7e624e/maintainability)](https://codeclimate.com/github/consindo/waka/maintainability)
[![Dependency Status](https://david-dm.org/consindo/waka.svg?theme=shields.io)](https://david-dm.org/consindo/waka)
[![devDependency Status](https://david-dm.org/consindo/waka/dev-status.svg?theme=shields.io)](https://david-dm.org/consindo/waka#info=devDependencies)

![Waka Icon](https://raw.githubusercontent.com/consindo/waka/master/dist/branding/launcher-icon-3x.png)

Your guide around public transport in Auckland & Wellington. Help us add more cities!

<https://getwaka.com>

## Public API

We have a public API! Check here for the documentation: <https://waka.app/docs/index.html>

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

## Adding a new city

We're currently working on making new cities easier to add, so these instructions may change. But feel free to try add a city.

* Make sure you define the city/region names in `cityMetadata.json`.
* Set up an importer in `server-worker/importers/regions`
* Open the local admin interface at `localhost:8001`, and create a new worker with your prefix and an arbirtary version number.
* Start it, and hope it imports!
* Stations generally work okay.
* Lines require some work. You'll need to return a bunch of objects in order for it to display in Waka properly. Check out Wellington (nz-wlg) or Christchurch (nz-chc) for good examples. The Auckland example is horrible, but the data is garbage. Please try not to emulate it, unless you have to.
* Realtime requires work - we'll be building some standard realtime classes soon.
* Add an image for your city in `dist/photos`
* Once you have a working city implementation, you'll need to write an auto-updater in `server-master/updaters`

### Code Style

* Run it through Prettier <https://github.com/prettier/prettier>

# waka-server

This repository is structured into three microservices. It's load balanced and nice when running in the cloud (they're running as seperate Docker containers), but run as a monolith when doing local dev.

If you want to just run one microservice at a time, run the `standalone.js` file in every folder.

## Services

### waka-orchestrator

Sets up the services.

### waka-proxy

Used when someone requests a non-prefixed route.

### waka-worker

The API.

## Running Locally

First, start Microsoft SQL Server. It's recommended that you run it with Docker:

```
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Str0ngPassword" -p 1433:1433 -d --name="waka-db" microsoft/mssql-server-linux:latest
```

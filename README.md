# waka-server

This repository is structured into three microservices. It's load balanced and nice when running in the cloud (they're running as seperate Docker containers), but run as a monolith when doing local dev.

If you want to just run one microservice at a time, run the `standalone.js` file in every folder.

## Services

### waka-orchestrator

The idea behind Waka Orchestrator is that it's a lightweight layer on top of proper application orchestration (ECS, Fargate, or Kubernetes). It performs a few functions:

1. Has a number of updaters, for each particular city.
2. Schedules waka-importer as a task when it has not been imported.
3. Updates deployment of that city to change to latest version.
4. Has a management UI available at `/private`

#### Locally:

- Instead of DynamoDB, it just stores files in a JSON object on disk.
- Instead of Tasks (Fargate), it provides you a Docker command to do the import.
- Instead of Services (ECS or Kubernetes), it takes the existing deployment, updates the variables, and relies on the platform to deploy the new service.

#### In Production:

Because Waka Orchestrator doesn't lock the update process yet, it should not be run in High-Availability. It will probably spin up multiple importers on the same database, and they might hang or crash. This however does not matter, because **Waka Orchestrator doesn't do any routing** (when not running locally).

Your load balancer should be set up to route things in this order:

- /a/:region1/ - waka-server:worker (Your first region)
- /a/:regionN/ - waka-server:worker (Each of your next regions)
- /a/ - waka-server:proxy
- / - waka

The orchestrator `/private` UI should either be protected by authorization on your load balancer, or not be publicly routable.

#### Build:

```bash
docker build ./ -f waka-orchestrator/Dockerfile -t waka-server:orchestrator
```

### waka-proxy

Used when someone requests a non-prefixed route - returns a 302 to the appropriate worker. Use the ENDPOINT environment variable to choose where it does the discovery.

If you're running this on the load balancer, it should be of second to lowest priority - after all the regional waka-worker, but before the Waka client.

#### Build:

```bash
docker build ./ -f waka-proxy/Dockerfile -t waka-server:proxy
```

### waka-worker

The API for each specific city. Connects to it's own database that is created by waka-immporter (different per region/version, supports different servers). Can be run in multiple availablity zones, but for realtime-pull, it will query transit agencies multiple times.

#### Build:

```bash
docker build ./ -f waka-worker/Dockerfile -t waka-server:worker
```

## Running Locally

First, start Microsoft SQL Server. It's recommended that you run it with Docker:

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Str0ngPassword" -p 1433:1433 -d --name="waka-db" microsoft/mssql-server-linux:latest
```

We also recommend you run redis, as it's used for the realtime.

```bash
docker run -p 6379:6379 -d --name="waka-redis" redis:latest
```

Then, start the orchestrator. The Web UI will be available at <http://localhost:9001/private>. The orchestrator handles the starting of the workers, and proxy when running locally.

```bash
npm ci
npm start
```

### waka-realtime

open with the same config as a waka-worker except add the `newRealtime: true` flag

uses protobuf and redis

keeps all parsed trip/route/stop realtime information in redis for 60s

need to create a new class that extends either `MultiEndpoint` / `SingleEndpoint` / `CombinedFeed` depending on what your region requires

#### MultiEndpoint

- has a Trip Update / Vehicle Position / Service Alert endpoint for each mode of transport
- eg Transport for New South Wales

#### SingleEndpoint

- has a single Trip Update / Vehicle Position / Service Alert endpoint for all modes of transport
- eg Auckland Transport

#### CombinedFeed

- has a combined feed for all endpoints and all modes of transport
- eg ACT Transport
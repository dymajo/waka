# waka-server

This repository is structured into three microservices. It's load balanced and nice when running in the cloud (they're running as seperate Docker containers), but run as a monolith when doing local dev.

If you want to just run one microservice at a time, run the `standalone.js` file in every folder.

## Services

### waka-orchestrator

Sets up the services, manages the imports & updates - run this on your local machine, and it'll call out to waka-proxy, waka-worker, and waka-importer. There's also a Web UI available at `/private`.

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

Then, start the orchestrator. The Web UI will be available at <http://localhost:9001/private>. The orchestrator handles the starting of the workers, and proxy when running locally.

```bash
npm ci
node waka-orchestrator/standalone.js
```

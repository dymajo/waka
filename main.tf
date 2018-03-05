provider "docker" {
  host = "tcp://127.0.0.1:2375/"
}

# Create a container
resource "docker_container" "waka" {
  image = "waka"
  name  = "waka"
  env = [
    "sql_username=${var.sql_username}",
    "sql_password=${var.sql_password}",
    "sql_database=${var.sql_database}"
  ]
  depends_on = ["docker_container.mssql-server"]
  networks = ["private_network"]
  ports {
    internal = 8000 # public port
    external = 8000
  }
  ports {
    internal = 8001 # private api manager
    external = 8001
  }
}

resource "docker_container" "mssql-server" {
  image = "${docker_image.mssql-server.latest}"
  name  = "${var.sql_database}"
  env = [
    "ACCEPT_EULA=Y",
    "SA_PASSWORD=${var.sql_password}",
    "MSSQL_PID=Express"
  ]
  ports {
    ip = "127.0.0.1"
    internal = 1433
    external = 1401
  }
  networks = ["private_network"]
  volumes {
    volume_name = "waka_database"
    container_path = "/var/opt/mssql"
  }
}

resource "docker_image" "mssql-server" {
  name = "microsoft/mssql-server-linux:2017-latest"
}

resource "docker_network" "private_network" {
  name = "private_network"
}

resource "docker_volume" "waka_database" {
  name = "waka_database"
}


variable "sql_username" {}
variable "sql_password" {}
variable "sql_database" {
  type = "string"
  default = "mssql-server"
}

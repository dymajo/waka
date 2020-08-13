variable "endpoint" {
  type    = string
  default = "http:/"
}

variable "namespace" {
  type    = string
  default = "waka-test"
}

variable "region" {
  type = string
}

variable "environment" {
  type    = string
  default = "uat"
}

variable "orchestrator_host" {
  type    = string
  default = "uat-admin.waka.app"
}

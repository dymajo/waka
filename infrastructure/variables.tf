variable "name" {
  type = string
}

variable "tags" {
  type = object({
    portfolio = string
  })
  default = {
    portfolio = "waka"
  }
}

variable "region" {
  type = string
}

variable "assetsprefix" {
  type    = string
  default = "/"
}

variable "endpoint" {
  type    = string
  default = "https://waka.app"
}

variable "ecs_cluster_name" {
  type = string
}

variable "load_balancer_name" {
  type = string
}

variable "host_header" {
  type    = string
  default = "waka.app"
}

variable "vpc_id" {
  type    = string
  default = "vpc-39000740"
}

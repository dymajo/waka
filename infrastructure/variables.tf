variable "name" {
  type = "string"
}

variable "tags" {
  type = "map"
  default = {
    portfolio = "waka"
  }
}

variable "s3_bucket_arn" {
  default = ""
}

variable "dynamo_arn" {
  default = []
}

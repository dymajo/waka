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

variable "s3_bucket_arn" {
  type = string
  default = ""
}

variable "dynamo_arn" {
  type = list(string)
  default = []
}

variable "region" {
  type = string
}

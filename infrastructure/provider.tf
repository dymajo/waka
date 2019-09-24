provider "aws" {
  region = var.region
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

data "http" "git_sha" {
  url = "https://api.github.com/repos/dymajo/waka/branches/master"
}

resource "aws_dynamodb_table" "waka-versions" {
  name         = "waka-${var.environment}-k8s-versions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "waka-${var.environment}-k8s-versions"
  }
}

resource "aws_dynamodb_table" "waka-mappings" {
  name         = "waka-${var.environment}-k8s-mappings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "waka-${var.environment}-k8s-mappings"
  }
}

resource "aws_dynamodb_table" "waka-meta" {
  name         = "waka-${var.environment}-k8s-meta"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "waka-${var.environment}-k8s-meta"
  }
}

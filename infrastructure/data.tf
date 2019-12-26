data "aws_dynamodb_table" "meta" {
  name = "waka-${var.environment}-meta"
}

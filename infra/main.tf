terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state is fine for a personal project.
  # To use S3 remote state instead, uncomment and configure:
  #
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "europe-2026/flight-status/terraform.tfstate"
  #   region         = "eu-central-1"
  #   dynamodb_table = "your-terraform-lock-table"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

# ── CloudWatch log group ──────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "flight_status" {
  name              = "/aws/lambda/europe-2026-flight-status"
  retention_in_days = 30
}

# ── IAM ───────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "flight_status" {
  name = "europe-2026-flight-status-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "flight_status_logs" {
  role       = aws_iam_role.flight_status.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ── Lambda ────────────────────────────────────────────────────────────────────

data "archive_file" "flight_status" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "flight_status" {
  function_name    = "europe-2026-flight-status"
  role             = aws_iam_role.flight_status.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.flight_status.output_path
  source_code_hash = data.archive_file.flight_status.output_base64sha256

  environment {
    variables = {
      AVIATIONSTACK_API_KEY = var.aviationstack_api_key
      CORS_ORIGIN           = var.cors_origin
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.flight_status_logs,
    aws_cloudwatch_log_group.flight_status,
  ]
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.flight_status.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.flight_status.execution_arn}/*/*"
}

# ── API Gateway HTTP API ──────────────────────────────────────────────────────

resource "aws_apigatewayv2_api" "flight_status" {
  name          = "europe-2026-flight-status"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.cors_origin]
    allow_methods = ["GET"]
    allow_headers = ["content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "flight_status" {
  api_id                 = aws_apigatewayv2_api.flight_status.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.flight_status.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "flight_status" {
  api_id    = aws_apigatewayv2_api.flight_status.id
  route_key = "GET /"
  target    = "integrations/${aws_apigatewayv2_integration.flight_status.id}"
}

resource "aws_apigatewayv2_stage" "flight_status" {
  api_id      = aws_apigatewayv2_api.flight_status.id
  name        = "$default"
  auto_deploy = true
}

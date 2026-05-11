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

# ── Function URL (no API Gateway needed) ─────────────────────────────────────

resource "aws_lambda_function_url" "flight_status" {
  function_name      = aws_lambda_function.flight_status.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = [var.cors_origin]
    allow_methods = ["GET"]
    max_age       = 300
  }
}

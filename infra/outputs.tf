output "function_url" {
  description = "Paste this URL into js/flights.js as FLIGHT_STATUS_URL"
  value       = aws_lambda_function_url.flight_status.function_url
}

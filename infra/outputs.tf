output "api_url" {
  description = "Paste this URL into js/flights.js as FLIGHT_STATUS_URL"
  value       = aws_apigatewayv2_stage.flight_status.invoke_url
}

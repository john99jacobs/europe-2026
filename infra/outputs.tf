output "flight_status_url" {
  description = "Paste this URL into js/flights.js as FLIGHT_STATUS_URL"
  value       = aws_apigatewayv2_stage.flight_status.invoke_url
}

output "claude_proxy_url" {
  description = "Paste this URL into js/assistant.js as CLAUDE_PROXY_URL"
  value       = aws_apigatewayv2_stage.claude_proxy.invoke_url
}

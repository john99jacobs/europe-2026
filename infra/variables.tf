variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "eu-central-1"
}

variable "aviationstack_api_key" {
  description = "AviationStack API key — set in terraform.tfvars, never commit that file"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key — set in terraform.tfvars, never commit that file"
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "Allowed CORS origin — only this origin can call the function from a browser"
  type        = string
  default     = "https://john99jacobs.github.io"
}

export interface VerifyRequest {
  pattern?: string;
  since_seconds?: number;
  timeout_seconds?: number;
  poll_interval_seconds?: number;
}

export interface VerifyResponse {
  code: string | null;
  magic_link: string | null;
  subject: string;
  from_addr: string;
}

export interface HealthResponse {
  status: string;
  imap: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string | null;
}

export interface AnthropicClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface FormFieldDescriptor {
  selector: string;
  label: string;
  kind: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'file' | 'unknown';
  options?: string[];
  required?: boolean;
}

export interface FormFillPlan {
  values: Record<string, string>; // selector → value
}

export interface JobFitScore {
  score: number;
  reasons: string[];
}

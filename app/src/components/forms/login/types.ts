export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface LoginState {
  isLoading: boolean;
  error: string | null;
}
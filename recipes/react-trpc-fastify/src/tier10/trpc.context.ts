export interface Context {
  isAuthenticated(): Promise<boolean>;
  getCurrentUserId(): Promise<string | undefined>;
  authenticate(userId: string): Promise<void>;
  clearUser(): Promise<void>;
}

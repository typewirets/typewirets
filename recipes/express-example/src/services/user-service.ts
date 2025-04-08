export interface User {
  id: string;
  name: string;
  age: number;
}

export interface UserService {
  getUserById(id: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}

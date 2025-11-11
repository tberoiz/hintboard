export * from "./database.types";

export interface UserSettings {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  };
}

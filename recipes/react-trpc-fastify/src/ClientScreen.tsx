import { useTRPC } from "./tier120/trpc.client";
import { useQuery } from "@tanstack/react-query";
import { LoginForm } from "./components/ui/LoginForm";
import { UserScreen } from "./UserScreen";

export function ClientScreen() {
  const trpc = useTRPC();
  const { isLoading, data, refetch } = useQuery(trpc.users.me.queryOptions());

  if (isLoading) {
    return;
  }

  if (!data?.authenticated) {
    return <LoginForm onLoginChange={() => refetch()} />;
  }

  return <UserScreen onLoginChange={() => refetch()} />;
}

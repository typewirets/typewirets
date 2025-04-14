import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useTRPC } from "@typewirets/react-fastify/tier120/trpc.client";

export function LoginForm(props: {
  onLoginChange(): void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const login = useMutation(
    trpc.users.login.mutationOptions({
      onSuccess: (data) => {
        if (data) {
          queryClient.invalidateQueries({ queryKey: ["users", "me"] });
          props.onLoginChange();
        }
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await login.mutateAsync({ id: value.name, password: value.password });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4 w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      <div className="space-y-2">
        <form.Field name="name">
          {(field) => (
            <>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id={field.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>

      <div className="space-y-2">
        <form.Field name="password">
          {(field) => (
            <>
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id={field.name}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors && (
                <p className="text-sm text-red-500">
                  {field.state.meta.errors}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}

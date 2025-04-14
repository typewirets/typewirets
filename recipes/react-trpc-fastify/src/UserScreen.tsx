import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "./tier120/trpc.client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWire } from "./hooks/useWire";
import { AchievementStoreWire } from "./tier50/achivement/achievement.store";

export function UserScreen(props: {
  onLoginChange(): void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const useAchivementStore = useWire(AchievementStoreWire);
  const trackAction = useAchivementStore((state) => state.trackAction);
  const [newUser, setNewUser] = useState({ name: "", age: "" });

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery(trpc.users.getAll.queryOptions());

  const addUser = useMutation(
    trpc.users.save.mutationOptions({
      onSuccess: async () => {
        // Reset form
        setNewUser({ name: "", age: "" });
        trackAction("user-added");
        refetch();
      },
    }),
  );

  const removeUser = useMutation(
    trpc.users.delete.mutationOptions({
      onSuccess: async () => {
        trackAction("user-removed");
        refetch();
      },
    }),
  );

  const logout = useMutation(
    trpc.users.logout.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users", "me"] });
        props.onLoginChange();
      },
    }),
  );

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.age) {
      const age = Number.parseInt(newUser.age, 10);
      if (!Number.isNaN(age)) {
        addUser.mutate({ id: age.toString(), name: newUser.name, age });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          {logout.isPending ? "Logging out..." : "Logout"}
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <form onSubmit={handleAddUser} className="p-4 border-b border-gray-200">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter name"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="age"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Age (ID)
              </label>
              <input
                type="number"
                id="age"
                value={newUser.age}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, age: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter age"
              />
            </div>
            <button
              type="submit"
              disabled={addUser.isPending || !newUser.name || !newUser.age}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addUser.isPending ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading users...</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li
                key={user.id}
                className="p-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500">Age: {user.age}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUser.mutate(user.id)}
                    disabled={removeUser.isPending}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removeUser.isPending ? "Removing..." : "Remove"}
                  </button>
                </div>
                {addUser.isPending && addUser.variables?.name === user.name && (
                  <div className="mt-2 text-sm text-blue-600">
                    Adding user...
                  </div>
                )}
                {removeUser.isPending && removeUser.variables === user.id && (
                  <div className="mt-2 text-sm text-red-600">
                    Removing user...
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

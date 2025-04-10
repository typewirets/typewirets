import { typeWireOf } from "@typewirets/core";
import { create } from "zustand";
import type { Achievement } from "./achievement.type";
import { ToasterWire } from "../toaster/toaster.wire";
import { TRPCClientWire } from "@typewirets/react-fastify/tier120/trpc.client.wire";

interface AchievementState {
  achievements: Achievement[];
  trackAction(action: string): Promise<void>;
}

// stores/achievement.store.ts
export const AchievementStoreWire = typeWireOf({
  token: "AchievementStore",
  imports: {
    trpc: TRPCClientWire,
    toaster: ToasterWire,
  },
  createWith({ toaster }) {
    return create<AchievementState>()((set) => ({
      achievements: [
        {
          title: "Penta Kill",
          description: "Destoyed User more than 5",
          action: "user-removed",
          progress: 0,
          total: 5,
          completed: false,
        },
        {
          title: "Monster Kill",
          description: "Destoyed User more than 10",
          action: "user-removed",
          progress: 0,
          total: 10,
          completed: false,
        },
        {
          title: "Life Creator",
          description: "Created User more than 3",
          action: "user-added",
          progress: 0,
          total: 3,
          completed: false,
        },
      ],

      // Track user actions
      trackAction: async (action: string) => {
        // Update local state optimistically
        set((state) => {
          const freshCompletions: Achievement[] = [];
          const updatedAchievements = state.achievements.map((achievement) => {
            if (achievement.action === action && !achievement.completed) {
              const newProgress = achievement.progress + 1;
              const newState = {
                ...achievement,
                progress: newProgress,
                completed: newProgress >= achievement.total,
              };

              if (newState.completed) {
                freshCompletions.push(newState);
              }

              return newState;
            }
            return achievement;
          });

          if (freshCompletions.length > 0) {
            for (const item of freshCompletions) {
              toaster.success(item.title);
            }
          }

          return { achievements: updatedAchievements };
        });
      },
    }));
  },
});

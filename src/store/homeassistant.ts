import { create } from "zustand";
import type {
  HomeAssistantConnectionStatus,
  HomeAssistantEntity,
} from "../types/homeassistant";

interface HomeAssistantStore {
  status: HomeAssistantConnectionStatus;
  error: string | null;
  entities: Record<string, HomeAssistantEntity>;

  setStatus: (status: HomeAssistantConnectionStatus, error?: string | null) => void;
  setEntities: (entities: HomeAssistantEntity[]) => void;
  setEntity: (entity: HomeAssistantEntity) => void;
}

export const useHomeAssistantStore = create<HomeAssistantStore>((set) => ({
  status: "idle",
  error: null,
  entities: {},

  setStatus: (status, error = null) => {
    set({ status, error });
  },

  setEntities: (entities) => {
    const next: Record<string, HomeAssistantEntity> = {};

    for (const entity of entities) {
      next[entity.entity_id] = entity;
    }

    set({ entities: next });
  },

  setEntity: (entity) => {
    set((state) => ({
      entities: {
        ...state.entities,
        [entity.entity_id]: entity,
      },
    }));
  },
}));

export function useHAEntity(entityId: string) {
  return useHomeAssistantStore((state) => state.entities[entityId]);
}

import { create } from "zustand";

export interface CampaignSelectionState {
  selectedCampaignId: string | null;
  selectCampaign: (id: string) => void;
  clearSelection: () => void;
}

const initialState: Pick<CampaignSelectionState, "selectedCampaignId"> = {
  selectedCampaignId: null,
};

export const useCampaignSelectionStore = create<CampaignSelectionState>((set) => ({
  ...initialState,

  selectCampaign: (id: string) => {
    set({ selectedCampaignId: id });
  },

  clearSelection: () => {
    set(initialState);
  },
}));

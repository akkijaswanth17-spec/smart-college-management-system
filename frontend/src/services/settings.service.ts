import { api } from "./api";

export const settingsService = {
  async getFeeLink() {
    const res = await api.get<{ data: { value: string | null } }>("/settings/fee-link");
    return res.data.data.value;
  },
  async updateFeeLink(value: string) {
    await api.put("/settings/fee-link", { value });
  },
  async getResultsLink() {
    const res = await api.get<{ data: { value: string | null } }>("/settings/results-link");
    return res.data.data.value;
  },
  async updateResultsLink(value: string) {
    await api.put("/settings/results-link", { value });
  },
};

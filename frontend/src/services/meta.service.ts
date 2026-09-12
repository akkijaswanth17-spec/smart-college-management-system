import { api } from "./api";
import { Department, Subject, Block, Room } from "../types";

export const metaService = {
  async departments() {
    const res = await api.get<{ data: Department[] }>("/meta/departments");
    return res.data.data;
  },
  async subjects(departmentId?: string) {
    const res = await api.get<{ data: Subject[] }>("/meta/subjects", { params: { departmentId } });
    return res.data.data;
  },
  async blocks() {
    const res = await api.get<{ data: Block[] }>("/meta/blocks");
    return res.data.data;
  },
  async rooms(blockId?: string) {
    const res = await api.get<{ data: Room[] }>("/meta/rooms", { params: { blockId } });
    return res.data.data;
  },
};

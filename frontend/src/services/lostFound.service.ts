import { LostFoundItem } from "../types";
import { createCrudService } from "./resource";

export const lostFoundService = createCrudService<LostFoundItem>("/lost-found");

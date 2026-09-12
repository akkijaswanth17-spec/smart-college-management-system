import { Notice } from "../types";
import { createCrudService } from "./resource";

export const noticesService = createCrudService<Notice>("/notices");

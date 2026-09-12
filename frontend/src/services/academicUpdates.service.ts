import { AcademicUpdate } from "../types";
import { createCrudService } from "./resource";

export const academicUpdatesService = createCrudService<AcademicUpdate>("/academic-updates");

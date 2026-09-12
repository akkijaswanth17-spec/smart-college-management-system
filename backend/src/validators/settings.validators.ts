import { z } from "zod";

export const updateSettingSchema = z.object({
  body: z.object({
    value: z.string().trim().url("Must be a valid URL"),
  }),
});

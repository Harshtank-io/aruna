import { z } from 'zod';

import { PHOTOGRAPHY_TAGS } from '@/types/scouting';

export const scoutingFormSchema = z.object({
  locationName: z
    .string()
    .trim()
    .min(1, 'Location name is required')
    .max(120, 'Keep the name under 120 characters'),
  latitude: z
    .number()
    .min(-90, 'Latitude must be ≥ -90')
    .max(90, 'Latitude must be ≤ 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be ≥ -180')
    .max(180, 'Longitude must be ≤ 180'),
  tags: z
    .array(z.enum(PHOTOGRAPHY_TAGS))
    .min(1, 'Select at least one photography tag'),
});

export type ScoutingFormValues = z.infer<typeof scoutingFormSchema>;

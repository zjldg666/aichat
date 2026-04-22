import { worldTemplateService } from '@/services/worldTemplateService.js';

export function bootstrapTown() {
  return worldTemplateService.ensureDefaultWorldTemplate();
}

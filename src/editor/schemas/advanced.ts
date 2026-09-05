import { ChartCardBrushExtConfig, ChartCardExternalConfig } from '../../types-config';
import { HaFormSchema } from '../types';

export const EXPERIMENTAL_BOOL_FIELDS: readonly (keyof NonNullable<ChartCardExternalConfig['experimental']>)[] = [
  'color_threshold',
  'hidden_by_default',
  'brush',
  'disable_config_validation',
] as const;

export const BRUSH_SCHEMA: HaFormSchema<ChartCardBrushExtConfig>[] = [
  { name: 'selection_span', selector: { text: {} } },
];

// Locale text input; section_mode rendered separately via bool-grid
export const BEHAVIOR_SCHEMA: HaFormSchema<ChartCardExternalConfig>[] = [{ name: 'locale', selector: { text: {} } }];

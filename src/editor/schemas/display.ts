import { ChartCardExternalConfig, ChartCardHeaderExternalConfig } from '../../types-config';
import { HaFormSchema } from '../types';

// Header title text input (booleans rendered separately via bool-grid)
export const HEADER_TITLE_SCHEMA: HaFormSchema<ChartCardHeaderExternalConfig>[] = [{ name: 'title', selector: { text: {} } }];
export const HEADER_BOOL_FIELDS: readonly (keyof ChartCardHeaderExternalConfig)[] = [
  'show',
  'floating',
  'show_states',
  'colorize_states',
  'standard_format',
  'disable_actions',
] as const;

// Color/label text fields; `show` is rendered separately via bool-grid
export const NOW_SCHEMA: HaFormSchema<ChartCardExternalConfig['now']>[] = [
  { name: 'color', selector: { text: {} } },
  { name: 'label', selector: { text: {} } },
];

// `version` was missing here until the coverage test pointed it out.
export const SHOW_BOOL_FIELDS: readonly (keyof NonNullable<ChartCardExternalConfig['show']>)[] = [
  'loading',
  'last_updated',
  'version',
];

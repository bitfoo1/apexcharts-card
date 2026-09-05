import { LitElement } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

// ── ha-form schema types ──

/*
 * The schema types are generic over the config object a form section edits, so a
 * field name has to be a real key of that object. Without it `name` is a plain
 * string, and a typo or an option renamed in `types-config.ts` produces a form
 * field that silently writes a key the card's own validation then rejects — the
 * editor would look fine and the card would show a red error card.
 *
 * This keeps `src/types-config.ts` the single description of the config surface.
 * What stays here is presentation only: which selector, how fields group, labels,
 * helper text. None of that is derivable from a TypeScript type.
 */

/** Names addressable in `T`, unwrapping an array so `yaxis` edits one entry. */
type ConfigKey<T> = Extract<keyof Unwrap<T>, string>;
type Unwrap<T> = NonNullable<T> extends readonly (infer I)[] ? NonNullable<I> : NonNullable<T>;

/**
 * Descending into an untyped object keeps it untyped rather than collapsing to
 * `unknown`, which would have no keys at all and reject every field name. This is
 * what lets the `apex_config` forms nest freely while the card's own config stays
 * strict.
 */
type Descend<V> = unknown extends V ? Record<string, unknown> : V;

interface HaFormField<T> {
  name: ConfigKey<T>;
  type?: 'constant';
  required?: boolean;
  flatten?: boolean;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selector?: Record<string, any>;
  default?: unknown;
  helper?: string;
}

/** Layout only: a grid's children address the same object as the grid itself. */
interface HaFormGrid<T> {
  type: 'grid';
  name: '';
  column_min_width?: string;
  schema: HaFormSchema<T>[];
  title?: string;
  helper?: string;
}

/**
 * An expander descends: its children address the sub-object at `name`, which is
 * what ties, say, the fields under `span` to `ChartCardSpanExtConfig`.
 */
type HaFormExpandable<T> = {
  [K in ConfigKey<T>]: {
    type: 'expandable';
    name: K;
    title?: string;
    flatten?: boolean;
    helper?: string;
    schema: HaFormSchema<Descend<Unwrap<T>[K]>>[];
  };
}[ConfigKey<T>];

/**
 * `T` defaults to an open record for the `apex_config` forms: that object is
 * ApexCharts' own API, which the card deliberately does not type.
 */
export type HaFormSchema<T = Record<string, unknown>> = HaFormField<T> | HaFormGrid<T> | HaFormExpandable<T>;


export interface EditorTab {
  label: string;
  icon: string;
}

export const EDITOR_TABS: EditorTab[] = [
  { label: 'General', icon: 'mdi:cog' },
  { label: 'Series', icon: 'mdi:chart-line' },
  { label: 'Display', icon: 'mdi:palette' },
  { label: 'Y-Axis', icon: 'mdi:axis-y-arrow' },
  { label: 'Advanced', icon: 'mdi:code-braces' },
];

// Sentinel values used to round-trip boolean/undefined through string selects
export const SEL_TRUE = '_true';
export const SEL_FALSE = '_false';
export const SEL_UNDEFINED = '_undefined';

// ── HA component type declarations ──

declare global {
  interface HTMLElementTagNameMap {
    'ha-form': LitElement & {
      hass?: HomeAssistant;
      data: Record<string, unknown>;
      schema: HaFormSchema[];
      computeLabel?: (schema: HaFormSchema) => string;
      computeHelper?: (schema: HaFormSchema) => string;
    };
    'ha-entity-picker': LitElement & {
      hass?: HomeAssistant;
      value?: string;
      label?: string;
      allowCustomEntity?: boolean;
      includeDomains?: string[];
    };
    'ha-yaml-editor': LitElement & {
      hass?: HomeAssistant;
      defaultValue?: unknown;
      label?: string;
      readOnly?: boolean;
    };
    'ha-icon-button': LitElement & {
      path?: string;
      label?: string;
      disabled?: boolean;
    };
    'ha-icon': LitElement & {
      icon?: string;
    };
    'ha-textfield': LitElement & {
      value?: string;
      label?: string;
      placeholder?: string;
      type?: string;
      autoValidate?: boolean;
      disabled?: boolean;
    };
    'ha-expansion-panel': LitElement & {
      header?: string;
      outlined?: boolean;
      expanded?: boolean;
      leftChevron?: boolean;
    };
    'ha-svg-icon': LitElement & { path?: string };
  }
}

export {};

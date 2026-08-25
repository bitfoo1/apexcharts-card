import { css, CSSResultGroup } from 'lit';

export const stylesApex: CSSResultGroup = css`
  /*
   * 'visible' instead of 'hidden': with overflow hidden the card clipped the
   * right edge of a chart that briefly measured wider than its container
   * during layout. Part of upstream PR RomRider#1089 — revert this single
   * declaration first if tooltips, the legend or the card's rounded corners
   * start bleeding outside the card.
   */
  ha-card {
    overflow: visible;
    position: relative;
  }

  ha-card.section {
    height: 100%;
  }

  .wrapper {
    display: grid;
    grid-template-areas: 'header' 'graph';
    grid-template-columns: 1fr;
    grid-template-rows: min-content 1fr;
  }
  ha-card.section .wrapper {
    height: 100%;
    min-width: 0;
    min-height: 0;
  }

  #graph-wrapper {
    height: 100%;
    grid-area: graph;
  }
  ha-card.section #graph-wrapper {
    min-width: 0;
    min-height: 0;
  }

  #brush {
    margin-top: -30px;
  }

  /* Needed for minimal layout */
  svg:not(:root) {
    overflow: visible !important;
  }

  #header {
    padding: 8px 16px 0px;
    grid-area: header;
    overflow: hidden;
  }
  ha-card.section #header {
    min-width: 0;
  }
  #header.floating {
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
  }

  #header__title {
    color: var(--secondary-text-color);
    font-size: 16px;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-bottom: 5px;
  }

  #header__states {
    display: flex;
    justify-content: space-between;
    flex-flow: row wrap;
    margin: -5px;
  }

  #header__states > * {
    margin: 5px;
  }

  #states__state {
    flex: 0 0 10%;
    position: relative;
  }

  #header__title {
    position: relative;
  }

  #header__title.actions,
  #states__state.actions {
    cursor: pointer;
  }

  #header__title.disabled,
  #states__state.disabled {
    pointer-events: none;
  }

  #state__value {
    display: table;
    white-space: nowrap;
  }

  #state__value > #state {
    font-size: 1.8em;
    font-weight: 500;
    white-space: nowrap;
  }

  #state__value > #uom {
    font-size: 1em;
    font-weight: 400;
    opacity: 0.8;
    white-space: nowrap;
  }

  #state__name {
    font-size: 0.8em;
    font-weight: 300;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  #last_updated {
    font-size: 0.63em;
    font-weight: 300;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    position: absolute;
    bottom: 0px;
    right: 4px;
    opacity: 0.5;
  }

  #version_info {
    font-size: 0.63em;
    font-weight: 300;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    position: absolute;
    bottom: 0px;
    left: 4px;
    opacity: 0.5;
  }

  /* Apex Charts Default CSS */
  @keyframes opaque {
    0% {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes resizeanim {
    0%,
    to {
      opacity: 0;
    }
  }

  .apexcharts-canvas {
    position: relative;
    direction: ltr !important;
    user-select: none;
  }

  .apexcharts-canvas ::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 6px;
  }

  .apexcharts-canvas ::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
  }

  .apexcharts-inner {
    position: relative;
  }

  .apexcharts-text tspan {
    font-family: inherit;
  }

  rect.legend-mouseover-inactive,
  .legend-mouseover-inactive rect,
  .legend-mouseover-inactive path,
  .legend-mouseover-inactive circle,
  .legend-mouseover-inactive line,
  .legend-mouseover-inactive text.apexcharts-yaxis-title-text,
  .legend-mouseover-inactive text.apexcharts-yaxis-label {
    transition: 0.15s ease all;
    opacity: 0.2;
  }

  .apexcharts-legend-text {
    padding-left: 15px;
    margin-left: -15px;
  }

  .apexcharts-series-collapsed {
    opacity: 0;
  }

  .apexcharts-tooltip {
    --apx-tt-bg: #ffffff;

    --apx-tt-border: rgba(15, 23, 42, 0.12);

    --apx-tt-shadow-dir: 1;
    --apx-tt-shadow:
      0 calc(var(--apx-tt-shadow-dir) * 1px) 2px rgba(15, 23, 42, 0.06),
      0 calc(var(--apx-tt-shadow-dir) * 4px) 8px -2px rgba(15, 23, 42, 0.1),
      0 calc(var(--apx-tt-shadow-dir) * 12px) 20px -8px rgba(15, 23, 42, 0.14);
    --apx-tt-arrow-bg: var(--apx-tt-bg);
    --apx-tt-color: #0f172a;
    --apx-tt-color-muted: rgba(15, 23, 42, 0.55);
    border-radius: 8px;
    background: var(--apx-tt-bg);
    border: 1px solid var(--apx-tt-border);
    box-shadow: var(--apx-tt-shadow);
    color: var(--apx-tt-color);
    cursor: default;
    font-size: 13px;
    left: 0;
    top: 0;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 2px 0;
    white-space: nowrap;
    z-index: 12;
    transition: opacity 0.12s ease;
  }

  .apexcharts-tooltip.apexcharts-active {
    opacity: 1;
    transition: opacity 0.12s ease;
  }
  .apexcharts-tooltip.apexcharts-active[data-positioned='true'] {
    transition:
      opacity 0.12s ease,
      left 0.16s ease-out,
      top 0.16s ease-out;
  }

  .apexcharts-tooltip.apexcharts-theme-light {
  }

  .apexcharts-tooltip.apexcharts-theme-dark {
    --apx-tt-bg: #1c1c1f;
    --apx-tt-border: rgba(255, 255, 255, 0.16);

    --apx-tt-shadow:
      0 calc(var(--apx-tt-shadow-dir) * 1px) 2px rgba(0, 0, 0, 0.24),
      0 calc(var(--apx-tt-shadow-dir) * 4px) 8px -2px rgba(0, 0, 0, 0.3),
      0 calc(var(--apx-tt-shadow-dir) * 12px) 20px -8px rgba(0, 0, 0, 0.38);
    --apx-tt-color: #f3f4f6;
    --apx-tt-color-muted: rgba(243, 244, 246, 0.55);
  }

  .apexcharts-tooltip * {
    font-family: inherit;
  }

  .apexcharts-tooltip.apexcharts-annotation-tooltip {
    padding: 6px 10px;
    max-width: 240px;
    white-space: normal;
    line-height: 1.4;
    pointer-events: none;
    z-index: 13;
  }

  .apexcharts-tooltip-title {
    padding: 8px 12px 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--apx-tt-color-muted);
    background: transparent;
    border-bottom: none;
    margin-bottom: 0;
  }

  .apexcharts-tooltip.apexcharts-theme-light .apexcharts-tooltip-title,
  .apexcharts-tooltip.apexcharts-theme-dark .apexcharts-tooltip-title {
    background: transparent;
    border-bottom: none;
  }

  .apexcharts-tooltip.apexcharts-tooltip-fill-series {
    background: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border: none;
    padding: 0;
    overflow: hidden;
    color: #fff;
  }

  .apexcharts-tooltip.apexcharts-tooltip-fill-series .apexcharts-tooltip-title {
    background: rgba(0, 0, 0, 0.22);
    color: #fff;
    opacity: 1;
    padding: 6px 12px;
  }

  .apexcharts-tooltip.apexcharts-tooltip-fill-series .apexcharts-tooltip-series-group {
    color: #fff;
  }

  .apexcharts-tooltip-arrow {
    position: absolute;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    background: var(--apx-tt-arrow-bg);
    transform: rotate(45deg);
    pointer-events: none;
    top: calc(var(--apx-tt-arrow-y, 50%) - 5px);
  }

  .apexcharts-tooltip[data-placement='right'] .apexcharts-tooltip-arrow {
    left: -6px;
    border-left: 1px solid var(--apx-tt-border);
    border-bottom: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='left'] .apexcharts-tooltip-arrow {
    right: -6px;
    border-top: 1px solid var(--apx-tt-border);
    border-right: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='top'] .apexcharts-tooltip-arrow,
  .apexcharts-tooltip[data-placement='bottom'] .apexcharts-tooltip-arrow {
    top: auto;
    left: calc(var(--apx-tt-arrow-x, 50%) - 5px);
  }

  .apexcharts-tooltip[data-placement='top'] .apexcharts-tooltip-arrow {
    bottom: -6px;
    border-right: 1px solid var(--apx-tt-border);
    border-bottom: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='bottom'] .apexcharts-tooltip-arrow {
    top: -6px;
    border-top: 1px solid var(--apx-tt-border);
    border-left: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='bottom'] {
    --apx-tt-shadow-dir: -1;
  }

  .apexcharts-tooltip-text-goals-value,
  .apexcharts-tooltip-text-y-value,
  .apexcharts-tooltip-text-z-value {
    display: inline-block;
    margin-left: 5px;
    font-weight: 600;
  }

  .apexcharts-tooltip-text-goals-label:empty,
  .apexcharts-tooltip-text-goals-value:empty,
  .apexcharts-tooltip-text-y-label:empty,
  .apexcharts-tooltip-text-y-value:empty,
  .apexcharts-tooltip-text-z-value:empty,
  .apexcharts-tooltip-title:empty {
    display: none;
  }

  .apexcharts-tooltip-text-goals-label,
  .apexcharts-tooltip-text-goals-value {
    padding: 6px 0 5px;
  }

  .apexcharts-tooltip-goals-group,
  .apexcharts-tooltip-text-goals-label,
  .apexcharts-tooltip-text-goals-value {
    display: flex;
  }

  .apexcharts-tooltip-text-goals-label:not(:empty),
  .apexcharts-tooltip-text-goals-value:not(:empty) {
    margin-top: -6px;
  }

  .apexcharts-tooltip-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 12px;
    height: 12px;
    margin-right: 6px;
    vertical-align: middle;
    color: inherit;
  }

  .apexcharts-tooltip-marker svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .apexcharts-tooltip-series-group {
    padding: 4px 12px;
    display: none;
    gap: 8px;
    text-align: left;
    justify-content: left;
    align-items: center;
  }

  .apexcharts-tooltip-series-group.apexcharts-active .apexcharts-tooltip-marker {
    opacity: 1;
  }

  .apexcharts-tooltip-series-group.apexcharts-active:last-child,
  .apexcharts-tooltip-series-group:last-child {
    padding-bottom: 8px;
  }

  .apexcharts-tooltip-y-group {
    padding: 6px 0 5px;
  }

  .apexcharts-custom-tooltip,
  .apexcharts-tooltip-box {
    padding: 4px 8px;
  }

  .apexcharts-tooltip-boxPlot {
    display: flex;
    flex-direction: column-reverse;
  }

  .apexcharts-tooltip-box > div {
    margin: 4px 0;
  }

  .apexcharts-tooltip-box span.value {
    font-weight: 700;
  }

  .apexcharts-tooltip-rangebar {
    padding: 5px 8px;
  }

  .apexcharts-tooltip-rangebar .category {
    font-weight: 600;
    color: #777;
  }

  .apexcharts-tooltip-rangebar .series-name {
    font-weight: 700;
    display: block;
    margin-bottom: 5px;
  }

  .apexcharts-xaxistooltip,
  .apexcharts-yaxistooltip {
    --apx-axt-bg: #ffffff;
    --apx-axt-border: rgba(15, 23, 42, 0.08);
    --apx-axt-color: #0f172a;
    --apx-axt-shadow: 0 4px 12px -4px rgba(15, 23, 42, 0.18), 0 1px 3px -1px rgba(15, 23, 42, 0.12);
    opacity: 0;
    pointer-events: none;
    color: var(--apx-axt-color);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    border-radius: 6px;
    position: absolute;
    z-index: 10;
    background: var(--apx-axt-bg);
    border: 1px solid var(--apx-axt-border);
    box-shadow: var(--apx-axt-shadow);
  }

  .apexcharts-xaxistooltip.apexcharts-theme-dark,
  .apexcharts-yaxistooltip.apexcharts-theme-dark {
    --apx-axt-bg: #1c1c1f;
    --apx-axt-border: rgba(255, 255, 255, 0.1);
    --apx-axt-color: #f3f4f6;
    --apx-axt-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.55), 0 1px 3px -1px rgba(0, 0, 0, 0.45);
  }

  .apexcharts-xaxistooltip {
    padding: 4px 8px;
    transition: 0.15s ease all;
  }

  .apexcharts-xaxistooltip:after,
  .apexcharts-xaxistooltip:before {
    left: 50%;
    border: solid transparent;
    content: ' ';
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
  }

  .apexcharts-xaxistooltip:after {
    border-color: transparent;
    border-width: 5px;
    margin-left: -5px;
  }

  .apexcharts-xaxistooltip:before {
    border-color: transparent;
    border-width: 6px;
    margin-left: -6px;
  }

  .apexcharts-xaxistooltip-bottom:after,
  .apexcharts-xaxistooltip-bottom:before {
    bottom: 100%;
  }

  .apexcharts-xaxistooltip-top:after,
  .apexcharts-xaxistooltip-top:before {
    top: 100%;
  }

  .apexcharts-xaxistooltip-bottom:after {
    border-bottom-color: var(--apx-axt-bg);
  }

  .apexcharts-xaxistooltip-bottom:before {
    border-bottom-color: var(--apx-axt-border);
  }

  .apexcharts-xaxistooltip-top:after {
    border-top-color: var(--apx-axt-bg);
  }

  .apexcharts-xaxistooltip-top:before {
    border-top-color: var(--apx-axt-border);
  }

  .apexcharts-xaxistooltip.apexcharts-active {
    opacity: 1;
    transition: 0.15s ease all;
  }

  .apexcharts-yaxistooltip {
    padding: 3px 8px;
  }

  .apexcharts-yaxistooltip:after,
  .apexcharts-yaxistooltip:before {
    top: 50%;
    border: solid transparent;
    content: ' ';
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
  }

  .apexcharts-yaxistooltip:after {
    border-color: transparent;
    border-width: 5px;
    margin-top: -5px;
  }

  .apexcharts-yaxistooltip:before {
    border-color: transparent;
    border-width: 6px;
    margin-top: -6px;
  }

  .apexcharts-yaxistooltip-left:after,
  .apexcharts-yaxistooltip-left:before {
    left: 100%;
  }

  .apexcharts-yaxistooltip-right:after,
  .apexcharts-yaxistooltip-right:before {
    right: 100%;
  }

  .apexcharts-yaxistooltip-left:after {
    border-left-color: var(--apx-axt-bg);
  }

  .apexcharts-yaxistooltip-left:before {
    border-left-color: var(--apx-axt-border);
  }

  .apexcharts-yaxistooltip-right:after {
    border-right-color: var(--apx-axt-bg);
  }

  .apexcharts-yaxistooltip-right:before {
    border-right-color: var(--apx-axt-border);
  }

  .apexcharts-yaxistooltip.apexcharts-active {
    opacity: 1;
  }

  .apexcharts-yaxistooltip-hidden {
    display: none;
  }

  .apexcharts-tooltip.apexcharts-active[data-positioned='true'] {
    transition:
      opacity 0.12s ease,
      left 0.16s ease-out,
      top 0.16s ease-out;
  }

  .apexcharts-tooltip[data-placement='right'] .apexcharts-tooltip-arrow {
    left: -6px;
    border-left: 1px solid var(--apx-tt-border);
    border-bottom: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='left'] .apexcharts-tooltip-arrow {
    right: -6px;
    border-top: 1px solid var(--apx-tt-border);
    border-right: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='top'] .apexcharts-tooltip-arrow,
  .apexcharts-tooltip[data-placement='bottom'] .apexcharts-tooltip-arrow {
    top: auto;
    left: calc(var(--apx-tt-arrow-x, 50%) - 5px);
  }

  .apexcharts-tooltip[data-placement='top'] .apexcharts-tooltip-arrow {
    bottom: -6px;
    border-right: 1px solid var(--apx-tt-border);
    border-bottom: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='bottom'] .apexcharts-tooltip-arrow {
    top: -6px;
    border-top: 1px solid var(--apx-tt-border);
    border-left: 1px solid var(--apx-tt-border);
  }

  .apexcharts-tooltip[data-placement='bottom'] {
    --apx-tt-shadow-dir: -1;
  }

  .apexcharts-tooltip-box > div {
    margin: 4px 0;
  }

  /*
   * Home Assistant theming for the block above.
   *
   * The chart lives in this card's shadow root, so ApexCharts' own
   * document-level stylesheet never reaches it — everything above is a copy of
   * the library's CSS and must be kept in sync with the bundled ApexCharts
   * version (tests/tooltip-markup.test.ts guards the parts that matter).
   *
   * ApexCharts 6 paints the tooltip from design tokens, which makes theming a
   * matter of redefining those tokens rather than fighting the library with
   * !important. Home Assistant's theme is the source of truth, so both the
   * light defaults and the dark-theme block are pointed at HA variables; a
   * plain 'color' stays as a fallback for a version that drops the tokens.
   */
  .apexcharts-tooltip,
  .apexcharts-tooltip.apexcharts-theme-light,
  .apexcharts-tooltip.apexcharts-theme-dark {
    --apx-tt-bg: var(--card-background-color);
    --apx-tt-arrow-bg: var(--card-background-color);
    --apx-tt-border: var(--divider-color, #e3e3e3);
    --apx-tt-color: var(--primary-text-color);
    --apx-tt-color-muted: var(--secondary-text-color, var(--primary-text-color));
    color: var(--primary-text-color);
  }

  .apexcharts-xaxistooltip,
  .apexcharts-yaxistooltip,
  .apexcharts-xaxistooltip.apexcharts-theme-dark,
  .apexcharts-yaxistooltip.apexcharts-theme-dark {
    --apx-axt-bg: var(--card-background-color);
    --apx-axt-border: var(--divider-color, #90a4ae);
    --apx-axt-color: var(--primary-text-color);
    color: var(--primary-text-color);
  }

  .apexcharts-xcrosshairs,
  .apexcharts-ycrosshairs {
    pointer-events: none;
    opacity: 0;
    transition: 0.15s ease all;
  }

  .apexcharts-xcrosshairs.apexcharts-active,
  .apexcharts-ycrosshairs.apexcharts-active {
    opacity: 1;
    transition: 0.15s ease all;
  }

  .apexcharts-ycrosshairs-hidden {
    opacity: 0;
  }

  .apexcharts-selection-rect {
    cursor: move;
  }

  .svg_select_shape {
    stroke-width: 1;
    stroke-dasharray: 10 10;
    stroke: black;
    stroke-opacity: 0.1;
    pointer-events: none;
    fill: none;
  }

  .svg_select_handle {
    stroke-width: 3;
    stroke: black;
    fill: none;
  }

  .svg_select_handle_r {
    cursor: e-resize;
  }

  .svg_select_handle_l {
    cursor: w-resize;
  }

  .apexcharts-svg.apexcharts-zoomable.hovering-zoom {
    cursor: crosshair;
  }

  .apexcharts-svg.apexcharts-zoomable.hovering-pan {
    cursor: move;
  }

  .apexcharts-menu-icon,
  .apexcharts-pan-icon,
  .apexcharts-reset-icon,
  .apexcharts-selection-icon,
  .apexcharts-toolbar-custom-icon,
  .apexcharts-zoom-icon,
  .apexcharts-zoomin-icon,
  .apexcharts-zoomout-icon {
    cursor: pointer;
    width: 20px;
    height: 20px;
    line-height: 24px;
    color: var(--primary-text-color);
    text-align: center;
  }

  .apexcharts-menu-icon svg,
  .apexcharts-reset-icon svg,
  .apexcharts-zoom-icon svg,
  .apexcharts-zoomin-icon svg,
  .apexcharts-zoomout-icon svg {
    fill: var(--primary-text-color);
  }

  .apexcharts-selection-icon svg {
    fill: #444;
    transform: scale(0.76);
  }

  .apexcharts-theme-dark .apexcharts-menu-icon svg,
  .apexcharts-theme-dark .apexcharts-pan-icon svg,
  .apexcharts-theme-dark .apexcharts-reset-icon svg,
  .apexcharts-theme-dark .apexcharts-selection-icon svg,
  .apexcharts-theme-dark .apexcharts-toolbar-custom-icon svg,
  .apexcharts-theme-dark .apexcharts-zoom-icon svg,
  .apexcharts-theme-dark .apexcharts-zoomin-icon svg,
  .apexcharts-theme-dark .apexcharts-zoomout-icon svg {
    fill: #f3f4f5;
  }

  .apexcharts-canvas .apexcharts-reset-zoom-icon.apexcharts-selected svg,
  .apexcharts-canvas .apexcharts-selection-icon.apexcharts-selected svg,
  .apexcharts-canvas .apexcharts-zoom-icon.apexcharts-selected svg {
    fill: var(--primary-color);
  }

  .apexcharts-theme-light .apexcharts-menu-icon:hover svg,
  .apexcharts-theme-light .apexcharts-reset-icon:hover svg,
  .apexcharts-theme-light .apexcharts-selection-icon:not(.apexcharts-selected):hover svg,
  .apexcharts-theme-light .apexcharts-zoom-icon:not(.apexcharts-selected):hover svg,
  .apexcharts-theme-light .apexcharts-zoomin-icon:hover svg,
  .apexcharts-theme-light .apexcharts-zoomout-icon:hover svg {
    fill: var(--primary-color);
  }

  .apexcharts-menu-icon,
  .apexcharts-selection-icon {
    position: relative;
  }

  .apexcharts-reset-icon {
    margin-left: 5px;
  }

  .apexcharts-menu-icon,
  .apexcharts-reset-icon,
  .apexcharts-zoom-icon {
    transform: scale(0.85);
  }

  .apexcharts-zoomin-icon,
  .apexcharts-zoomout-icon {
    transform: scale(0.7);
  }

  .apexcharts-zoomout-icon {
    margin-right: 3px;
  }

  .apexcharts-pan-icon {
    transform: scale(0.62);
    position: relative;
    left: 1px;
    top: 0;
  }

  .apexcharts-pan-icon svg {
    fill: var(--primary-text-color);
    stroke: #6e8192;
    stroke-width: 2;
  }

  .apexcharts-pan-icon.apexcharts-selected svg {
    stroke: var(--primary-color);
  }

  .apexcharts-pan-icon:not(.apexcharts-selected):hover svg {
    stroke: var(--primary-color);
  }

  .apexcharts-toolbar {
    position: absolute;
    z-index: 1;
    max-width: 176px;
    text-align: right;
    border-radius: 3px;
    padding: 0 6px 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .apexcharts-menu {
    background: var(--primary-background-color);
    position: absolute;
    top: 100%;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 3px;
    right: 10px;
    opacity: 0;
    min-width: 110px;
    transition: 0.15s ease all;
    pointer-events: none;
  }

  .apexcharts-menu.apexcharts-menu-open {
    opacity: 1;
    pointer-events: all;
    transition: 0.15s ease all;
  }

  .apexcharts-menu-item {
    padding: 6px 7px;
    font-size: 12px;
    cursor: pointer;
  }

  .apexcharts-theme-light .apexcharts-menu-item:hover {
    background: var(--primary-color);
  }

  .apexcharts-theme-dark .apexcharts-menu {
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
  }

  @media screen and (min-width: 768px) {
    .apexcharts-canvas:hover .apexcharts-toolbar {
      opacity: 1;
    }
  }

  .apexcharts-canvas .apexcharts-element-hidden,
  .apexcharts-datalabel.apexcharts-element-hidden,
  .apexcharts-hide .apexcharts-series-points {
    opacity: 0;
  }

  .apexcharts-hidden-element-shown {
    opacity: 1;
    transition: 0.25s ease all;
  }

  .apexcharts-datalabel,
  .apexcharts-datalabel-label,
  .apexcharts-datalabel-value,
  .apexcharts-datalabels,
  .apexcharts-pie-label {
    cursor: default;
    pointer-events: none;
  }

  .apexcharts-pie-label-delay {
    opacity: 0;
    animation-name: opaque;
    animation-duration: 0.3s;
    animation-fill-mode: forwards;
    animation-timing-function: ease;
  }

  .apexcharts-radialbar-label {
    cursor: pointer;
  }

  .apexcharts-annotation-rect,
  .apexcharts-area-series .apexcharts-area,
  .apexcharts-gridline,
  .apexcharts-line,
  .apexcharts-point-annotation-label,
  .apexcharts-radar-series path:not(.apexcharts-marker),
  .apexcharts-radar-series polygon,
  .apexcharts-toolbar svg,
  .apexcharts-tooltip .apexcharts-marker,
  .apexcharts-xaxis-annotation-label,
  .apexcharts-yaxis-annotation-label,
  .apexcharts-zoom-rect,
  .no-pointer-events {
    pointer-events: none;
  }

  .apexcharts-tooltip-active .apexcharts-marker {
    transition: 0.15s ease all;
  }

  .apexcharts-radar-series .apexcharts-yaxis {
    pointer-events: none;
  }

  .resize-triggers {
    animation: 1ms resizeanim;
    visibility: hidden;
    opacity: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .contract-trigger:before,
  .resize-triggers,
  .resize-triggers > div {
    content: ' ';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
  }

  .resize-triggers > div {
    height: 100%;
    width: 100%;
    background: #eee;
    overflow: auto;
  }

  .contract-trigger:before {
    overflow: hidden;
    width: 200%;
    height: 200%;
  }

  .apexcharts-bar-goals-markers {
    pointer-events: none;
  }

  .apexcharts-bar-shadows {
    pointer-events: none;
  }

  .apexcharts-rangebar-goals-markers {
    pointer-events: none;
  }

  .apexcharts-disable-transitions * {
    transition: none !important;
  }

  /* spinner */
  #spinner-wrapper {
    position: absolute;
    top: 5px;
    right: 5px;
    height: 20px;
    width: 20px;
    opacity: 0.5;
  }

  #spinner {
    position: relative;
  }

  .lds-ring,
  .lds-ring div {
    box-sizing: border-box;
  }
  .lds-ring {
    display: inline-block;
    position: relative;
    width: 20px;
    height: 20px;
  }
  .lds-ring div {
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: 16px;
    height: 16px;
    margin: 2px;
    border: 2px solid var(--primary-text-color);
    border-radius: 50%;
    animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: var(--primary-text-color) transparent transparent transparent;
  }
  .lds-ring div:nth-child(1) {
    animation-delay: -0.45s;
  }
  .lds-ring div:nth-child(2) {
    animation-delay: -0.3s;
  }
  .lds-ring div:nth-child(3) {
    animation-delay: -0.15s;
  }
  @keyframes lds-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

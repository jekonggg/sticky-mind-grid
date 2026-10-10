export interface ContainerGeometry {
  padding: number;
  innerRadius: number;
  outerRadius: number;
  imageRadius: number;
  isCustom: boolean;
}

export const DEFAULT_COMFORTABLE_PADDING = 12;
export const DEFAULT_COMFORTABLE_INNER_RADIUS = 12;
export const DEFAULT_COMFORTABLE_OUTER_RADIUS = 24;

export const DEFAULT_COMPACT_PADDING = 8;
export const DEFAULT_COMPACT_INNER_RADIUS = 10;
export const DEFAULT_COMPACT_OUTER_RADIUS = 18;

/**
 * Calculates border-radius and padding for nested containers.
 * Allows independent customization of outer border radius, inner radius, and padding,
 * with concentric fallback (outer = inner + padding) when outer radius is not explicitly set.
 */
export function getContainerGeometry(
  isCompact: boolean,
  customPadding?: number | null,
  customInnerRadius?: number | null,
  customOuterRadius?: number | null
): ContainerGeometry {
  const defaultPadding = isCompact ? DEFAULT_COMPACT_PADDING : DEFAULT_COMFORTABLE_PADDING;
  const defaultInnerRadius = isCompact ? DEFAULT_COMPACT_INNER_RADIUS : DEFAULT_COMFORTABLE_INNER_RADIUS;
  const defaultOuterRadius = isCompact ? DEFAULT_COMPACT_OUTER_RADIUS : DEFAULT_COMFORTABLE_OUTER_RADIUS;

  const padding =
    customPadding !== null && customPadding !== undefined && customPadding >= 0
      ? customPadding
      : defaultPadding;

  const innerRadius =
    customInnerRadius !== null && customInnerRadius !== undefined && customInnerRadius >= 0
      ? customInnerRadius
      : defaultInnerRadius;

  const outerRadius =
    customOuterRadius !== null && customOuterRadius !== undefined && customOuterRadius >= 0
      ? customOuterRadius
      : (customInnerRadius !== null && customInnerRadius !== undefined) ||
        (customPadding !== null && customPadding !== undefined)
      ? innerRadius + padding
      : defaultOuterRadius;

  const imageRadius = Math.max(0, innerRadius - Math.max(2, Math.round(padding / 2)));
  const isCustom =
    (customPadding !== null && customPadding !== undefined) ||
    (customInnerRadius !== null && customInnerRadius !== undefined) ||
    (customOuterRadius !== null && customOuterRadius !== undefined);

  return {
    padding,
    innerRadius,
    outerRadius,
    imageRadius,
    isCustom,
  };
}

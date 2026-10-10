import { describe, it, expect } from "vitest";
import {
  getContainerGeometry,
  DEFAULT_COMFORTABLE_PADDING,
  DEFAULT_COMFORTABLE_INNER_RADIUS,
  DEFAULT_COMFORTABLE_OUTER_RADIUS,
  DEFAULT_COMPACT_PADDING,
  DEFAULT_COMPACT_INNER_RADIUS,
  DEFAULT_COMPACT_OUTER_RADIUS,
} from "@/utils/geometryUtils";

describe("geometryUtils - Container Geometry & Radii", () => {
  it("computes default comfortable geometry correctly", () => {
    const geom = getContainerGeometry(false);
    expect(geom.padding).toBe(DEFAULT_COMFORTABLE_PADDING); // 12px
    expect(geom.innerRadius).toBe(DEFAULT_COMFORTABLE_INNER_RADIUS); // 12px
    expect(geom.outerRadius).toBe(DEFAULT_COMFORTABLE_OUTER_RADIUS); // 24px
    expect(geom.imageRadius).toBe(6); // 12 - 6 = 6px
    expect(geom.isCustom).toBe(false);
  });

  it("computes default compact geometry correctly", () => {
    const geom = getContainerGeometry(true);
    expect(geom.padding).toBe(DEFAULT_COMPACT_PADDING); // 8px
    expect(geom.innerRadius).toBe(DEFAULT_COMPACT_INNER_RADIUS); // 10px
    expect(geom.outerRadius).toBe(DEFAULT_COMPACT_OUTER_RADIUS); // 18px
    expect(geom.imageRadius).toBe(6); // 10 - 4 = 6px
    expect(geom.isCustom).toBe(false);
  });

  it("applies custom padding and inner radius overrides dynamically with fallback outer radius", () => {
    const geom = getContainerGeometry(false, 16, 14);
    expect(geom.padding).toBe(16);
    expect(geom.innerRadius).toBe(14);
    expect(geom.outerRadius).toBe(30); // 14 + 16 = 30px
    expect(geom.imageRadius).toBe(6); // 14 - 8 = 6px
    expect(geom.isCustom).toBe(true);
  });

  it("allows direct independent customization of outer radius without relying on formula", () => {
    const geom = getContainerGeometry(false, 16, 14, 20);
    expect(geom.padding).toBe(16);
    expect(geom.innerRadius).toBe(14);
    expect(geom.outerRadius).toBe(20); // Explicitly 20px, not 14 + 16 (30px)
    expect(geom.imageRadius).toBe(6);
    expect(geom.isCustom).toBe(true);
  });

  it("allows setting only custom outer radius while retaining default inner radius and padding", () => {
    const geom = getContainerGeometry(false, null, null, 32);
    expect(geom.padding).toBe(DEFAULT_COMFORTABLE_PADDING); // 12px
    expect(geom.innerRadius).toBe(DEFAULT_COMFORTABLE_INNER_RADIUS); // 12px
    expect(geom.outerRadius).toBe(32); // 32px
    expect(geom.isCustom).toBe(true);
  });

  it("handles zero padding, zero inner radius, and zero outer radius (sharp corners)", () => {
    const geomSharp = getContainerGeometry(false, 0, 0, 0);
    expect(geomSharp.padding).toBe(0);
    expect(geomSharp.innerRadius).toBe(0);
    expect(geomSharp.outerRadius).toBe(0);
    expect(geomSharp.imageRadius).toBe(0);
    expect(geomSharp.isCustom).toBe(true);
  });

  it("resets to defaults when custom values are null or undefined", () => {
    const geom = getContainerGeometry(false, null, null, null);
    expect(geom.padding).toBe(DEFAULT_COMFORTABLE_PADDING);
    expect(geom.innerRadius).toBe(DEFAULT_COMFORTABLE_INNER_RADIUS);
    expect(geom.outerRadius).toBe(DEFAULT_COMFORTABLE_OUTER_RADIUS);
    expect(geom.isCustom).toBe(false);
  });
});

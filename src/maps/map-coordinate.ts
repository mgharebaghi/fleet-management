/**
 * Domain-neutral map position. Coordinates are decimal strings so
 * decimal(9,6) precision is not lost through binary floating point.
 * Latitude and longitude match common.Location: at most 6 decimal places.
 */
export type MapCoordinate = {
  latitude: string;
  longitude: string;
};

export type MapMarker = {
  id: string;
  coordinate: MapCoordinate;
  /** Accessible name for the pin. The canvas does not interpret it. */
  label?: string;
  /**
   * `false` draws an unselected pin. Omitted or `true` uses the selected pin,
   * so a single placed point stays visually selected.
   */
  selected?: boolean;
};

/** Geographic center of Iran, used when no point has been chosen yet. */
export const IRAN_MAP_OVERVIEW: MapCoordinate = {
  latitude: "32.427908",
  longitude: "53.688046",
};

export const IRAN_MAP_OVERVIEW_ZOOM = 5;
export const MAP_SELECTED_ZOOM = 15;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const COORDINATE_PATTERN = /^-?(?:0|[1-9]\d{0,2})(?:\.\d{1,6})?$/;

export function normalizeCoordinateText(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace("٫", ".");
  return normalized || null;
}

function coordinateInRange(
  value: string | null,
  minimum: number,
  maximum: number,
): value is string {
  if (value === null || !COORDINATE_PATTERN.test(value)) return false;
  const numeric = Number(value);
  return numeric >= minimum && numeric <= maximum;
}

export function parseMapCoordinate(
  latitude: string,
  longitude: string,
): MapCoordinate | null {
  const normalizedLatitude = normalizeCoordinateText(latitude);
  const normalizedLongitude = normalizeCoordinateText(longitude);
  if (
    !coordinateInRange(normalizedLatitude, -90, 90) ||
    !coordinateInRange(normalizedLongitude, -180, 180)
  ) {
    return null;
  }
  return {
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  };
}

/** Trims a fixed-scale decimal string without changing its numeric value. */
export function trimCoordinateScale(fixed: string): string | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(fixed)) return null;
  const trimmed = fixed.includes(".")
    ? fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    : fixed;
  if (trimmed === "-0") return "0";
  return trimmed;
}

/** Rounds a map click or provider coordinate to the 6 decimal places Location stores. */
export function mapCoordinateFromDegrees(
  latitude: number,
  longitude: number,
): MapCoordinate | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  const latitudeText = trimCoordinateScale(latitude.toFixed(6));
  const longitudeText = trimCoordinateScale(longitude.toFixed(6));
  if (latitudeText === null || longitudeText === null) return null;
  return parseMapCoordinate(latitudeText, longitudeText);
}

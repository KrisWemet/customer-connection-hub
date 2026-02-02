import { addDays, getDay, isAfter, differenceInCalendarDays } from "date-fns";

export type PackageType = "3_day_weekend" | "5_day_extended" | "10_day_experience";

const startDayRules: Record<PackageType, number[]> = {
  "3_day_weekend": [5], // Fri
  "5_day_extended": [3, 4], // Wed/Thu
  "10_day_experience": [3], // Wed
};

const durationNights: Record<PackageType, number> = {
  "3_day_weekend": 3,
  "5_day_extended": 5,
  "10_day_experience": 10,
};

export function getPackageNights(packageType: PackageType) {
  return durationNights[packageType];
}

export function isValidStartDay(packageType: PackageType, startDate: Date) {
  const day = getDay(startDate);
  return startDayRules[packageType].includes(day);
}

export function getPackageEndDate(packageType: PackageType, startDate: Date) {
  return addDays(startDate, durationNights[packageType]);
}

export function getPrepTeardownDates(startDate: Date, packageType: PackageType) {
  if (packageType !== "5_day_extended") {
    return { prepDays: [], teardownDays: [] };
  }
  const prepDays = [startDate, addDays(startDate, 1)];
  const endDate = getPackageEndDate(packageType, startDate);
  const teardownDays = [addDays(endDate, -2), addDays(endDate, -1)];
  return { prepDays, teardownDays };
}

export function hasMinimumResetGap(previousEndDate: Date, nextStartDate: Date) {
  if (!isAfter(nextStartDate, previousEndDate)) {
    return false;
  }
  const gap = differenceInCalendarDays(nextStartDate, previousEndDate);
  return gap >= 1;
}

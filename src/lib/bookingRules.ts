import { addDays, getDay, isAfter, differenceInCalendarDays } from "date-fns";

export type PackageType = "2-day" | "3-day" | "5-day";

const startDayRules: Record<PackageType, number[]> = {
  "2-day": [2, 3], // Tue/Wed
  "3-day": [5], // Fri
  "5-day": [3, 4], // Wed/Thu
};

const durationNights: Record<PackageType, number> = {
  "2-day": 2,
  "3-day": 3,
  "5-day": 5,
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
  if (packageType !== "5-day") {
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

/**
 * Returns current date string in YYYY-MM-DD format
 */
export const getTodayDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates work hours between check-in and check-out in decimal hours rounded to 2 decimal places.
 */
export const calculateWorkHours = (checkIn: Date, checkOut: Date): number => {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs < 0) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
};

/**
 * Calculates extra hours (overtime) beyond standard workday hours.
 */
export const calculateExtraHours = (workHours: number, standardHours = 8): number => {
  if (workHours <= standardHours) return 0;
  return Math.round((workHours - standardHours) * 100) / 100;
};

/**
 * Returns start date and end date (YYYY-MM-DD) for a given week (Monday to Sunday)
 */
export const getWeekRange = (targetDate: Date = new Date()): { startDate: string; endDate: string } => {
  const d = new Date(targetDate);
  const day = d.getDay();
  // day: 0 (Sun) to 6 (Sat)
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: getTodayDateString(monday),
    endDate: getTodayDateString(sunday),
  };
};

/**
 * Returns start date and end date (YYYY-MM-DD) for a given month (YYYY-MM)
 */
export const getMonthRange = (monthStr?: string): { startDate: string; endDate: string; yearMonth: string } => {
  let year: number;
  let month: number;

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const parts = monthStr.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of month

  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  return {
    startDate: getTodayDateString(start),
    endDate: getTodayDateString(end),
    yearMonth,
  };
};

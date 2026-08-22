import { config } from '../config/env';
import { prisma } from '../models/prisma';

/**
 * Extracts company prefix from company name.
 * Rule: First letters of the first two words of company name.
 * Example: "Odoo India" -> "OI", "Dayflow Technologies" -> "DT", "Dayflow" -> "DA"
 */
export const getCompanyPrefix = (companyName: string = config.companyName): string => {
  const cleaned = companyName.trim().toUpperCase();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return 'DF'; // Default DayFlow fallback
};

/**
 * Extracts 4-letter initials from first name and last name.
 * Rule: 2 letters first name + 2 letters last name (uppercase).
 * Example: "John Doe" -> "JODO", "Al Su" -> "ALSU", "A B" -> "AXBX"
 */
export const getNameInitials = (firstName: string, lastName: string): string => {
  const cleanFirst = (firstName || '').trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  const cleanLast = (lastName || '').trim().replace(/[^a-zA-Z]/g, '').toUpperCase();

  const firstPart = cleanFirst.length >= 2 
    ? cleanFirst.substring(0, 2) 
    : (cleanFirst + 'X').padEnd(2, 'X');

  const lastPart = cleanLast.length >= 2 
    ? cleanLast.substring(0, 2) 
    : (cleanLast + 'X').padEnd(2, 'X');

  return `${firstPart}${lastPart}`;
};

/**
 * Generates the next sequential Dayflow Login ID for an employee.
 * Format: [Company Prefix][2 letters first + 2 letters last][Joining Year][4-digit serial]
 * Example: OIJODO20220001
 * Includes automatic collision detection and sequential increment.
 */
export const generateLoginId = async (
  firstName: string,
  lastName: string,
  joiningDate: Date = new Date(),
  customCompanyName?: string
): Promise<string> => {
  const prefix = getCompanyPrefix(customCompanyName || config.companyName);
  const initials = getNameInitials(firstName, lastName);
  const year = joiningDate.getFullYear();
  const stem = `${prefix}${initials}${year}`;

  // Find existing employees with loginId matching this stem
  const existingEmployees = await prisma.employee.findMany({
    where: {
      loginId: {
        startsWith: stem,
      },
    },
    select: {
      loginId: true,
    },
  });

  let maxSerial = 0;
  existingEmployees.forEach((emp) => {
    const serialStr = emp.loginId.substring(stem.length);
    const parsedSerial = parseInt(serialStr, 10);
    if (!isNaN(parsedSerial) && parsedSerial > maxSerial) {
      maxSerial = parsedSerial;
    }
  });

  const nextSerial = maxSerial + 1;
  const serialFormatted = String(nextSerial).padStart(4, '0');

  const generatedLoginId = `${stem}${serialFormatted}`;

  // Verify no collision just in case
  const collision = await prisma.employee.findUnique({
    where: { loginId: generatedLoginId },
  });

  if (collision) {
    // If collision somehow occurs, loop forward to find next available
    let counter = nextSerial + 1;
    while (true) {
      const altId = `${stem}${String(counter).padStart(4, '0')}`;
      const exists = await prisma.employee.findUnique({ where: { loginId: altId } });
      if (!exists) {
        return altId;
      }
      counter++;
    }
  }

  return generatedLoginId;
};

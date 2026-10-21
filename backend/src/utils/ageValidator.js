/**
 * Age Validation Utilities
 * Calculates exact legal age in years from a given Date of Birth.
 */

export function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) {
    throw new Error('Invalid Date of Birth format');
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

export function isEligibleAdult(dateOfBirth, minimumAge = 18) {
  const age = calculateAge(dateOfBirth);
  return {
    isAdult: age >= minimumAge,
    age,
    minimumAge,
  };
}

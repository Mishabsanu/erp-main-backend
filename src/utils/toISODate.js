export const formatToDDMMYYYY = (value) => {
  if (!value) return "";

  let date;

  // Attempt to parse DD/MM/YYYY or DD-MM-YYYY
  if (/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.test(value)) {
    const parts = value.split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Simple heuristic: if day > 12, it's definitely DD-MM-YYYY. 
    // If month > 12, it's MM-DD-YYYY. 
    // Otherwise we assume DD-MM-YYYY as per project preference.
    if (month > 12 && day <= 12) {
      date = new Date(year, day - 1, month);
    } else {
      date = new Date(year, month - 1, day);
    }
  }
  // Attempt to parse YYYY-MM-DD
  else if (/^(\d{4})-(\d{1,2})-(\d{1,2})$/.test(value)) {
    const parts = value.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    date = new Date(year, month - 1, day);
  } else {
    // Fallback for other formats Date object or timestamp
    date = new Date(value);
  }

  if (!isNaN(date.getTime())) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  return "";
};

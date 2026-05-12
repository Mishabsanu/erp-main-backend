import { formatToDDMMYYYY } from "./toISODate.js";
export const mapRowToSale = async (row, index) => {
  const r = {};
  for (const [key, value] of Object.entries(row)) {
    r[key.toLowerCase().trim()] = value ? String(value).trim() : "";
  }

  const errors = [];
  if (!r.ticketno) errors.push("Ticket no missing");
  if (!r.companyname) errors.push("Company Name missing");
  if (!r.email) errors.push("Email missing");
  if (!r.contactpersonmobile) errors.push("Mobile missing");
  if (!r.referenceNo && !r.referenceno) errors.push("Reference No missing");
  if (!r.name) errors.push("Name missing");
  if (!r.position) errors.push("Position missing");
  if (!r.location) errors.push("Location missing");
  if (!r.region) errors.push("Region missing");
  if (!r.date) errors.push("Date missing");

  if (errors.length) return { rowNumber: index, errorData: errors };

  const sale = {
    ticketNo: r.ticketno,
    companyName: r.companyname,
    name: r.name,
    position: r.position,
    email: r.email,
    contactPersonMobile: r.contactpersonmobile,
    contactThrough: r.contactthrough || "Other",
    referenceNo: r.referenceNo || r.referenceno,
    location: r.location,
    region: r.region,
    date: formatToDDMMYYYY(r.date),
    nextFollowUpDate: formatToDDMMYYYY(r.nextfollowupdate) || "",
    remarks: r.remarks || "",
    businessType: r.businesstype || "",
    contactedBy: r.contactedby || "",
    status: r.status || "New Lead",
  };
  return sale;
};

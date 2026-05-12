
export const mapRowToQuote = async (row, index) => {
  const r = {};
  for (const [key, value] of Object.entries(row)) {
    r[key.toLowerCase().trim()] = value ? String(value).trim() : "";
  }

  const errors = [];
  if (!r.clientname) errors.push("Client Name missing");

  if (errors.length) return { rowNumber: index, errorData: errors };

  const quote = {
    clientName: r.clientname,
    currency: r.currency || "INR",
    exchangeRate: Number(r.exchangerate) || 83,
    totalContainers: Number(r.totalcontainers) || 0,
    costPerContainer: Number(r.costpercontainer) || 0,
    status: r.status || "Pending",
    referenceNo: r.referenceno || r.referencenote || "",
  };
  return quote;
};

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0] || {});
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(","));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Escape strings containing comma, quotes, or newlines
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const stringVal = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
      if (stringVal.includes(",") || stringVal.includes("\"") || stringVal.includes("\n")) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

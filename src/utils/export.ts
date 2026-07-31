function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (!data || !data.length) return;
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  downloadBlob(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

export async function exportToPDF(data: Record<string, unknown>[], filename: string, title?: string) {
  if (!data || !data.length) return;
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const headers = Object.keys(data[0] || {});
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- values here are already known to be primitives/JSON-serializable from the caller's export shape
      return val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
    })
  );

  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 15);
  }
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 22 : 10,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });
  doc.save(`${filename}.pdf`);
}

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

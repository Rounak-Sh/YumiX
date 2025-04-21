import path from "path";
import fs from "fs";

/**
 * Color palette for modern reports
 */
export const colors = {
  primary: "#4f46e5", // Indigo
  secondary: "#0ea5e9", // Sky
  accent: "#14b8a6", // Teal
  danger: "#ef4444", // Red
  success: "#10b981", // Emerald
  warning: "#f59e0b", // Amber
  text: "#1e293b", // Slate 800
  lightText: "#64748b", // Slate 500
  border: "#e2e8f0", // Slate 200
  background: "#ffffff", // White
};

/**
 * Chart colors for consistent styling
 */
export const chartColors = [
  "#4f46e5", // Indigo
  "#0ea5e9", // Sky
  "#14b8a6", // Teal
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#84cc16", // Lime
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#6366f1", // Indigo lighter
];

/**
 * Adds a standardized header to the PDF report
 * @param {Object} doc - PDFKit document instance
 * @param {string} reportType - Type of report
 */
export const addStandardHeader = (doc, reportType) => {
  try {
    // Validate input
    reportType = reportType || "Report";

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Draw background header bar
    doc.fillColor(colors.primary).rect(0, 0, doc.page.width, 80).fill();

    // Draw logo (placeholder position - actual logo rendering depends on image availability)
    try {
      const logoPath = path.join(process.cwd(), "public/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 20, { width: 40 });
      } else {
        // If no logo, just add a placeholder text instead
        doc
          .font("Helvetica-Bold")
          .fontSize(16)
          .fillColor("#ffffff")
          .text("YUMIX", 50, 30);
      }
    } catch (logoError) {
      console.error("Error loading logo:", logoError);
      // If error with logo, add text placeholder
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#ffffff")
        .text("YUMIX", 50, 30);
    }

    // Add report title
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#ffffff")
      .text(`${reportType} Report`, 110, 30);

    // Add date on the right
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#ffffff")
      .text(
        `Generated on: ${formattedDate} at ${formattedTime}`,
        doc.page.width - 230,
        35,
        { width: 200, align: "right" }
      );

    // Add subtle separator line
    doc
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .moveTo(50, 90)
      .lineTo(doc.page.width - 50, 90)
      .stroke();

    // Reset cursor position below the header
    doc.moveDown(5);
  } catch (error) {
    console.error("Error adding standard header:", error);
    // Try to continue without a header if there's an error
    try {
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor(colors.text)
        .text(`${reportType || "Report"}`, 50, 50);

      doc.moveDown(2);
    } catch (e) {
      // Silently fail if even this fallback fails
    }
  }
};

/**
 * Adds modern filter section to a PDF report
 * @param {Object} doc - PDFKit document instance
 * @param {Object} filters - Object containing filter information (e.g., filterText, dateText)
 * @returns {number} - The Y position after the filters section
 */
export const addFiltersSection = (doc, filters) => {
  const { filterText, dateText } = filters;

  // If no filters are applied, return early with minimal space used
  if (!filterText && !dateText) {
    return 100;
  }

  // Display "Filters Applied:" text with a light gray background
  doc
    .roundedRect(40, 110, 520, filterText && dateText ? 50 : 30, 5)
    .fillColor("#f9fafb")
    .fill();

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.text)
    .text("Filters Applied:", 50, 120);

  // Add status filter if available
  if (filterText) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(colors.text)
      .text(filterText, 135, 120);
  }

  // Add date range on the next line
  if (dateText) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(colors.text)
      .text(`Date Range: ${dateText}`, 50, 135);
  }

  return filterText && dateText ? 170 : 150; // Return the Y position after filters
};

/**
 * Creates a modern metrics box with shadow effect
 * @param {Object} doc - PDFKit document instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Box width
 * @param {number} height - Box height
 * @param {string} title - Box title
 * @param {string|number} value - Box value
 * @param {string} color - Accent color for the box
 * @param {number} radius - Corner radius
 */
export const drawMetricsBox = (
  doc,
  x,
  y,
  width,
  height,
  title,
  value,
  color = colors.primary,
  radius = 8
) => {
  // Validate numeric coordinates to avoid NaN errors
  try {
    // Ensure coordinates are valid numbers
    x = typeof x === "number" && !isNaN(x) ? x : 0;
    y = typeof y === "number" && !isNaN(y) ? y : 0;
    width = typeof width === "number" && !isNaN(width) ? width : 100;
    height = typeof height === "number" && !isNaN(height) ? height : 50;
    radius = typeof radius === "number" && !isNaN(radius) ? radius : 0;

    // Ensure value is a string
    const displayValue =
      value !== undefined && value !== null ? value.toString() : "0";

    // Add subtle shadow effect (multiple rectangles with decreasing opacity)
    doc
      .roundedRect(x + 3, y + 3, width, height, radius)
      .fillColor("#00000010") // Very light shadow (10% opacity)
      .fill();

    // Main box with white background and colored border
    doc
      .roundedRect(x, y, width, height, radius)
      .fillAndStroke(colors.background, color); // White fill, colored border

    // Add a subtle colored accent bar at the top
    doc
      .roundedRect(x + 1, y + 1, width - 2, 6, {
        topLeft: radius,
        topRight: radius,
      })
      .fillColor(color)
      .fill();

    // Box title
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor(colors.lightText) // Light text for the title
      .text(title || "Metric", x + 15, y + 20);

    // Box value
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor(colors.text) // Dark text for the value
      .text(displayValue, x + 15, y + 40);
  } catch (error) {
    console.error("Error drawing metrics box:", error);
    // Continue execution without failing
  }
};

/**
 * Draws a modern bar chart with subtle gradients and proper spacing
 * @param {Object} doc - PDFKit document instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 * @param {Object} data - Data points {labels: [], values: []}
 * @param {string} title - Chart title
 */
export const drawBarChart = (doc, x, y, width, height, data, title) => {
  try {
    // Validate parameters to prevent NaN errors
    x = typeof x === "number" && !isNaN(x) ? x : 0;
    y = typeof y === "number" && !isNaN(y) ? y : 0;
    width = typeof width === "number" && !isNaN(width) ? width : 500;
    height = typeof height === "number" && !isNaN(height) ? height : 300;

    // Ensure data is valid
    data = data || { labels: [], values: [] };
    data.labels = Array.isArray(data.labels) ? data.labels : [];
    data.values = Array.isArray(data.values) ? data.values : [];

    // Draw chart background with subtle border
    doc
      .roundedRect(x, y, width, height, 8)
      .fillColor("#f9fafb") // Light gray background
      .fillAndStroke()
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    // Draw chart title
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text(title || "Chart", x + 15, y + 15);

    if (!data.labels || data.labels.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.lightText)
        .text(
          "No data available for the selected period",
          x + width / 2 - 100,
          y + height / 2 - 10
        );
      return;
    }

    // Calculate chart dimensions
    const chartX = x + 40;
    const chartY = y + 45;
    const chartWidth = width - 60;
    const chartHeight = height - 80;

    // Calculate the max value for scaling (handle empty data)
    const maxValue =
      Math.max(
        ...data.values.filter((v) => typeof v === "number" && !isNaN(v)),
        1
      ) * 1.2; // Add 20% for visual space

    // Draw X and Y axes
    doc
      .strokeColor(colors.border)
      .lineWidth(1)
      .moveTo(chartX, chartY)
      .lineTo(chartX, chartY + chartHeight)
      .lineTo(chartX + chartWidth, chartY + chartHeight)
      .stroke();

    // Draw Y-axis labels and gridlines
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yPos = chartY + chartHeight - (i / ySteps) * chartHeight;
      const value = Math.round((i / ySteps) * maxValue);

      // Draw gridline
      doc
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .moveTo(chartX - 5, yPos)
        .lineTo(chartX + chartWidth, yPos)
        .stroke();

      // Draw label
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.lightText)
        .text(value.toString(), chartX - 25, yPos - 4, {
          width: 20,
          align: "right",
        });
    }

    // Draw bars and X-axis labels
    const barCount = data.labels.length;
    const barSpacing = 10;
    const availableWidth = chartWidth - barSpacing * (barCount + 1);
    const barWidth = Math.min(30, availableWidth / barCount);

    data.labels.forEach((label, i) => {
      try {
        const barX = chartX + barSpacing + i * (barWidth + barSpacing);
        const barValue =
          typeof data.values[i] === "number" && !isNaN(data.values[i])
            ? data.values[i]
            : 0;
        const barHeight = (barValue / maxValue) * chartHeight;
        const barY = chartY + chartHeight - barHeight;

        // Draw bar with gradient
        doc
          .rect(barX, barY, barWidth, barHeight)
          .fillColor(colors.primary)
          .fill();

        // Draw value on top if bar is tall enough
        if (barHeight > 20) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor("#ffffff")
            .text(barValue.toString(), barX, barY + 5, {
              width: barWidth,
              align: "center",
            });
        } else if (barValue > 0) {
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(colors.text)
            .text(barValue.toString(), barX, barY - 12, {
              width: barWidth,
              align: "center",
            });
        }

        // Draw X-axis label
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(colors.lightText)
          .text(label || "", barX, chartY + chartHeight + 5, {
            width: barWidth,
            align: "center",
          });
      } catch (barError) {
        console.error(`Error drawing bar ${i}:`, barError);
        // Continue with next bar
      }
    });
  } catch (error) {
    console.error("Error drawing bar chart:", error);
    // Draw error message in the chart area
    try {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.danger)
        .text("Error rendering chart", x + width / 2 - 50, y + height / 2 - 10);
    } catch (e) {
      // Silently fail if even the error message can't be drawn
    }
  }
};

/**
 * Draws a modern pie chart with clean legend
 * @param {Object} doc - PDFKit document instance
 * @param {number} x - X position for chart center
 * @param {number} y - Y position for chart center
 * @param {number} radius - Pie radius
 * @param {Object[]} data - Array of {label, value, percentage} objects
 * @param {string} title - Chart title
 */
export const drawPieChart = (doc, x, y, radius, data, title) => {
  try {
    // Validate parameters
    x = typeof x === "number" && !isNaN(x) ? x : 100;
    y = typeof y === "number" && !isNaN(y) ? y : 100;
    radius = typeof radius === "number" && !isNaN(radius) ? radius : 50;

    // Ensure data is valid
    data = Array.isArray(data) ? data : [];

    // Validate each data item and fix any issues
    data = data.map((item) => ({
      label: item.label || "Unknown",
      value:
        typeof item.value === "number" && !isNaN(item.value) ? item.value : 0,
      percentage:
        typeof item.percentage === "number" && !isNaN(item.percentage)
          ? item.percentage
          : 0,
    }));

    // Draw title
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.text)
      .text(title || "Distribution", x - radius, y - radius - 20, {
        width: radius * 2,
        align: "center",
      });

    // Exit early if no data
    if (!data || data.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.lightText)
        .text("No data available", x - radius, y, {
          width: radius * 2,
          align: "center",
        });
      return;
    }

    // Draw pie slices
    let startAngle = 0;
    data.forEach((item, i) => {
      try {
        // Skip items with zero percentage
        if (item.percentage <= 0) return;

        const endAngle = startAngle + item.percentage * Math.PI * 2;

        doc
          .fillColor(chartColors[i % chartColors.length])
          .moveTo(x, y)
          .arc(x, y, radius, startAngle, endAngle, false)
          .fill();

        startAngle = endAngle;
      } catch (sliceError) {
        console.error(`Error drawing pie slice ${i}:`, sliceError);
        // Continue with next slice
      }
    });

    // Draw center white circle for donut effect (optional)
    doc
      .fillColor(colors.background)
      .circle(x, y, radius * 0.6)
      .fill();

    // Set up legend position
    const legendX = x + radius + 30;
    const legendY = y - (data.length * 15) / 2;

    // Draw legend items
    data.forEach((item, i) => {
      try {
        const itemY = legendY + i * 25;

        // Color square
        doc
          .fillColor(chartColors[i % chartColors.length])
          .rect(legendX, itemY, 12, 12)
          .fill();

        // Label and values
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(colors.text)
          .text(item.label, legendX + 18, itemY)
          .font("Helvetica")
          .fontSize(9)
          .fillColor(colors.lightText)
          .text(
            `${item.value} (${Math.round(item.percentage * 100)}%)`,
            legendX + 18,
            itemY + 12
          );
      } catch (legendError) {
        console.error(`Error drawing legend item ${i}:`, legendError);
        // Continue with next legend item
      }
    });
  } catch (error) {
    console.error("Error drawing pie chart:", error);
    // Draw error message
    try {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.danger)
        .text("Error rendering chart", x - radius, y, {
          width: radius * 2,
          align: "center",
        });
    } catch (e) {
      // Silently fail if even the error message can't be drawn
    }
  }
};

/**
 * Adds modernized page numbering to the document
 * @param {Object} doc - PDFKit document instance
 */
export const addPageNumbers = (doc) => {
  const pageCount = doc.bufferedPageCount || 1;
  if (pageCount > 1) {
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Add page number with subtle styling
      doc
        .rect(doc.page.width / 2 - 30, doc.page.height - 25, 60, 18)
        .radius(9)
        .fillColor("#f9fafb")
        .fill();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.lightText)
        .text(
          `Page ${i + 1} of ${pageCount}`,
          doc.page.width / 2 - 25,
          doc.page.height - 20,
          {
            width: 50,
            align: "center",
          }
        );
    }
  }
};

/**
 * Draws a modern table with headers and data
 * @param {Object} doc - PDFKit document instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Table width
 * @param {string[]} headers - Array of header labels
 * @param {Object[]} data - Array of objects with data matching headers
 * @param {string[]} keys - Array of object keys matching headers
 * @param {number[]} widths - Array of column widths as percentages (should sum to 100)
 * @returns {number} The Y position after the table
 */
export const drawTable = (doc, x, y, width, headers, data, keys, widths) => {
  try {
    // Validate input parameters
    x = typeof x === "number" && !isNaN(x) ? x : 0;
    y = typeof y === "number" && !isNaN(y) ? y : 0;
    width = typeof width === "number" && !isNaN(width) ? width : 500;

    // Ensure required arrays are valid
    headers = Array.isArray(headers) ? headers : [];
    data = Array.isArray(data) ? data : [];
    keys = Array.isArray(keys) ? keys : [];
    widths = Array.isArray(widths)
      ? widths
      : Array(headers.length).fill(100 / Math.max(headers.length, 1));

    // Normalize width percentages to ensure they sum to 100
    const totalWidthPercentage = widths.reduce((sum, w) => sum + w, 0);
    if (totalWidthPercentage !== 100 && widths.length > 0) {
      const factor = 100 / totalWidthPercentage;
      widths = widths.map((w) => w * factor);
    }

    const rowHeight = 30;
    const textPadding = 5;

    // If no data and no headers, draw a message and return
    if ((!data || data.length === 0) && (!headers || headers.length === 0)) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.lightText)
        .text("No data available", x + width / 2 - 50, y + 20);
      return y + 40; // Return Y position after message
    }

    // Calculate column widths in points
    const colWidths = widths.map((percentage) => (width * percentage) / 100);

    // Draw header
    doc.fillColor(colors.primary).rect(x, y, width, rowHeight).fill();

    // Draw header text
    let xOffset = x;
    headers.forEach((header, i) => {
      try {
        const colWidth = colWidths[i] || width / headers.length;
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#ffffff")
          .text(header || "", xOffset + textPadding, y + textPadding, {
            width: colWidth - textPadding * 2,
            height: rowHeight - textPadding * 2,
            ellipsis: true,
          });
        xOffset += colWidth;
      } catch (headerError) {
        console.error(`Error drawing header ${i}:`, headerError);
        // Continue with next header
      }
    });

    // Draw rows
    let currentY = y + rowHeight;
    data.forEach((row, rowIndex) => {
      try {
        // Draw row background with alternating colors
        const bgColor = rowIndex % 2 === 0 ? "#ffffff" : "#f9fafb";
        doc
          .fillColor(bgColor)
          .rect(x, currentY, width, rowHeight)
          .fill()
          .strokeColor(colors.border)
          .lineWidth(0.5)
          .rect(x, currentY, width, rowHeight)
          .stroke();

        // Draw cell values
        xOffset = x;
        keys.forEach((key, colIndex) => {
          try {
            const colWidth = colWidths[colIndex] || width / keys.length;
            const cellValue =
              row[key] !== undefined && row[key] !== null
                ? String(row[key])
                : "";

            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor(colors.text)
              .text(cellValue, xOffset + textPadding, currentY + textPadding, {
                width: colWidth - textPadding * 2,
                height: rowHeight - textPadding * 2,
                ellipsis: true,
              });
            xOffset += colWidth;
          } catch (cellError) {
            console.error(
              `Error drawing cell [${rowIndex}][${colIndex}]:`,
              cellError
            );
            // Continue with next cell
          }
        });

        currentY += rowHeight;
      } catch (rowError) {
        console.error(`Error drawing row ${rowIndex}:`, rowError);
        currentY += rowHeight; // Still advance Y position
        // Continue with next row
      }
    });

    // Return the Y position after the table
    return currentY;
  } catch (error) {
    console.error("Error drawing table:", error);
    // Draw error message
    try {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.danger)
        .text("Error rendering table", x + width / 2 - 50, y + 20);
    } catch (e) {
      // Silently fail if even the error message can't be drawn
    }
    return y + 40; // Return Y position after error message
  }
};

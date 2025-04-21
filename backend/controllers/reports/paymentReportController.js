import { Payment, Subscription, SubscriptionPlan } from "../../models/index.js";
import PDFDocument from "pdfkit";
import adminNotificationController from "../admin/notificationController.js";
import path from "path";
import fs from "fs";

/**
 * Generate a PDF report for payments with optional filters
 */
export const generatePaymentReport = async (req, res) => {
  let doc = null;
  let docEnded = false; // Track if document has been ended

  try {
    console.log("Starting payment report generation...");
    // Extract query parameters
    const { startDate, endDate, status } = req.query;

    // Build the query based on filters
    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Status filter
    if (status) {
      if (status === "completed") {
        query.status = "completed";
      } else if (status === "pending") {
        query.status = "pending";
      } else if (status === "failed") {
        query.status = "failed";
      }
    }

    console.log(`Payment report query: ${JSON.stringify(query)}`);

    // Fetch payments based on filters
    const payments = await Payment.find(query)
      .populate({
        path: "subscriptionId",
        select: "planType amount startDate expiryDate",
      })
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${payments.length} payments for the report`);

    // Enhance payment data with additional info
    const enhancedPayments = payments.map((payment) => {
      const planName = payment.subscriptionId?.planType || "N/A";
      const planPrice = payment.subscriptionId?.amount || payment.amount || 0;
      const userName = payment.userId?.name || "Unknown User";

      return {
        ...payment,
        planName,
        planPrice,
        userName,
      };
    });

    // Create notification for report generation
    if (req.admin && req.admin._id) {
      await adminNotificationController.createAdminNotification({
        adminId: req.admin._id,
        title: "Payment Report Generated",
        message: "Payment report has been generated",
        type: "report",
        reportType: "payments",
        timestamp: new Date(),
      });
    } else {
      console.log("Admin ID not found in request, skipping notification");
    }

    // Get report filename with optional filters in name
    let filename = "payment-insights-report";
    if (status) {
      filename += `-${status}`;
    }
    if (startDate || endDate) {
      filename += "-filtered";
    }
    filename += ".pdf";

    // Create a PDF document
    doc = new PDFDocument({
      autoFirstPage: true,
      size: "A4",
      margin: 40,
      bufferPages: true,
    });

    // Set up response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // Set background color to white
    doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFFFF");

    // Check if logo exists before trying to include it
    const logoPath = path.resolve("public/images/logo.png");
    const hasLogo = fs.existsSync(logoPath);

    // Header with logo and title
    if (hasLogo) {
      doc.image(logoPath, 50, 20, { width: 65 });
    } else {
      // Skip logo if not found
      console.log("Logo not found at path:", logoPath);
    }

    doc
      .fillColor("#000000") // Black text
      .fontSize(20)
      .text("YuMix", 130, 40)
      .text("Payment Report", 130, 60)
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, 200, 75, {
        align: "right",
      });

    // Add filter information if applied
    let filterText = "";

    // Add status filter text
    if (status) {
      let statusLabel = "";
      if (status === "completed") {
        statusLabel = "Completed Payments";
      } else if (status === "pending") {
        statusLabel = "Pending Payments";
      } else if (status === "failed") {
        statusLabel = "Failed Payments";
      } else {
        statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      }
      filterText = `Status: ${statusLabel}`;
    }

    // Create date range text separately
    let dateText = "";
    if (startDate && endDate) {
      dateText = `From: ${new Date(
        startDate
      ).toLocaleDateString()} To: ${new Date(endDate).toLocaleDateString()}`;
    } else if (startDate) {
      dateText = `From: ${new Date(startDate).toLocaleDateString()}`;
    } else if (endDate) {
      dateText = `To: ${new Date(endDate).toLocaleDateString()}`;
    }

    // Display filters on separate lines to avoid overlap
    // First line - Status filter
    if (filterText) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000") // Black text
        .text(`Filters Applied: ${filterText}`, 50, 90);
    }

    // Second line - Date filter (positioned below the status filter)
    if (dateText) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000") // Black text
        .text(`Filters Applied: ${dateText}`, 50, filterText ? 105 : 90);
    }

    // Horizontal line - moved down to accommodate the two lines of filter text
    doc
      .strokeColor("#000000") // Black line
      .lineWidth(1)
      .moveTo(50, dateText ? 125 : 110)
      .lineTo(550, dateText ? 125 : 110)
      .stroke();

    // Payment Insights Title - adjusted to keep consistent spacing after the horizontal line
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Payment Insights", 50, dateText ? 130 : 130);

    // Define box dimensions consistent with other reports
    const boxWidth = 240;
    const boxHeight = 80;
    const boxSpacing = 20;
    const boxRadius = 10;

    // Calculate payment metrics
    const totalPayments = enhancedPayments.length;
    const completedPayments = enhancedPayments.filter(
      (payment) => payment.status === "completed"
    ).length;
    const pendingPayments = enhancedPayments.filter(
      (payment) => payment.status === "pending"
    ).length;
    const failedPayments = enhancedPayments.filter(
      (payment) => payment.status === "failed"
    ).length;

    // Calculate revenue - ensure amount is a valid number
    const totalRevenue = enhancedPayments
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => {
        const amount = payment.amount || 0;
        return sum + (isNaN(amount) ? 0 : Number(amount));
      }, 0);

    // Calculate average payment amount
    const avgPaymentAmount =
      completedPayments > 0 ? totalRevenue / completedPayments : 0;

    // First row of boxes
    // Total Payments Box
    doc
      .roundedRect(50, 155, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc.fillColor("#000000").fontSize(14).text("Total Payments", 70, 170);
    doc.fontSize(24).text(totalPayments.toString(), 70, 195);

    // Completed Payments Box
    doc
      .roundedRect(
        50 + boxWidth + boxSpacing,
        155,
        boxWidth,
        boxHeight,
        boxRadius
      )
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text("Completed Payments", 70 + boxWidth + boxSpacing, 170);
    doc
      .fontSize(24)
      .text(completedPayments.toString(), 70 + boxWidth + boxSpacing, 195);

    // Second row of boxes
    // Total Revenue Box
    doc
      .roundedRect(50, 155 + boxHeight + 20, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text("Total Revenue", 70, 170 + boxHeight + 20);
    doc
      .fontSize(24)
      .text(`$${totalRevenue.toFixed(2)}`, 70, 195 + boxHeight + 20);

    // Average Payment Box
    doc
      .roundedRect(
        50 + boxWidth + boxSpacing,
        155 + boxHeight + 20,
        boxWidth,
        boxHeight,
        boxRadius
      )
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text(
        "Average Payment",
        70 + boxWidth + boxSpacing,
        170 + boxHeight + 20
      );
    doc
      .fontSize(24)
      .text(
        `$${avgPaymentAmount.toFixed(2)}`,
        70 + boxWidth + boxSpacing,
        195 + boxHeight + 20
      );

    // Payment Trends Section
    doc.fontSize(16).fillColor("#000000").text("Payment Trends", 50, 350);

    // Calculate trend data
    const monthlyTrends = {};

    // Get the date range for the trend (6 months)
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);

    // Initialize the months
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo);
      date.setMonth(sixMonthsAgo.getMonth() + i);
      const monthYear = `${date.toLocaleString("default", {
        month: "short",
      })} ${date.getFullYear()}`;
      monthlyTrends[monthYear] = {
        count: 0,
        revenue: 0,
        completed: 0,
        failed: 0,
        pending: 0,
      };
    }

    // Add data to the trend months
    enhancedPayments.forEach((payment) => {
      const paymentDate = new Date(payment.createdAt);
      if (paymentDate >= sixMonthsAgo) {
        const monthYear = `${paymentDate.toLocaleString("default", {
          month: "short",
        })} ${paymentDate.getFullYear()}`;
        if (monthlyTrends[monthYear]) {
          monthlyTrends[monthYear].count++;

          if (payment.status === "completed") {
            monthlyTrends[monthYear].completed++;
            // Make sure amount is a valid number
            const amount = payment.amount || 0;
            monthlyTrends[monthYear].revenue += isNaN(amount)
              ? 0
              : Number(amount);
          } else if (payment.status === "failed") {
            monthlyTrends[monthYear].failed++;
          } else if (payment.status === "pending") {
            monthlyTrends[monthYear].pending++;
          }
        }
      }
    });

    console.log("Monthly trends data:", monthlyTrends);

    // Draw trend graph with black and white style
    const trendGraphY = 380;
    const graphWidth = 500;
    const graphHeight = 120;
    const barWidth = 60;
    const maxCount = Math.max(
      ...Object.values(monthlyTrends).map((t) => t.count),
      5
    ); // Min height of 5

    // Draw graph axis
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, trendGraphY)
      .lineTo(50, trendGraphY + graphHeight)
      .lineTo(50 + graphWidth, trendGraphY + graphHeight)
      .stroke();

    // Draw Y-axis labels
    doc
      .fontSize(8)
      .fillColor("#000000")
      .text("0", 40, trendGraphY + graphHeight - 5)
      .text(
        Math.round(maxCount / 2).toString(),
        40,
        trendGraphY + graphHeight / 2
      )
      .text(maxCount.toString(), 40, trendGraphY - 5);

    // Draw bars and labels
    let barX = 70;
    let currentY = trendGraphY + graphHeight;
    Object.entries(monthlyTrends).forEach(([month, data]) => {
      const barHeight = (data.count / maxCount) * graphHeight;

      // Draw bar outline in black (regardless of count)
      doc
        .strokeColor("#000000")
        .lineWidth(1)
        .rect(barX, currentY - barHeight, barWidth, barHeight)
        .stroke();

      // Fill with patterns for different status types
      if (data.count > 0) {
        // Completed payments (white)
        const completedHeight = (data.completed / data.count) * barHeight;
        if (completedHeight > 0) {
          doc
            .rect(barX, currentY - completedHeight, barWidth, completedHeight)
            .fill("#E5E5E5"); // Light gray instead of white

          currentY -= completedHeight;
        }

        // Pending payments (light gray)
        const pendingHeight = (data.pending / data.count) * barHeight;
        if (pendingHeight > 0) {
          doc
            .rect(barX, currentY - pendingHeight, barWidth, pendingHeight)
            .fill("#A0A0A0"); // Medium gray

          currentY -= pendingHeight;
        }

        // Failed payments (dark gray)
        const failedHeight = (data.failed / data.count) * barHeight;
        if (failedHeight > 0) {
          doc
            .rect(barX, currentY - failedHeight, barWidth, failedHeight)
            .fill("#555555"); // Dark gray
        }
      }

      // Add count on top of the bar
      if (data.count > 0) {
        doc
          .fontSize(10)
          .fillColor("#000000")
          .text(
            data.count.toString(),
            barX + barWidth / 2,
            currentY - barHeight - 15,
            { align: "center" }
          );
      }

      // Add month label
      doc
        .fontSize(8)
        .fillColor("#000000")
        .text(month, barX + barWidth / 2, currentY + 5, {
          align: "center",
        });

      barX += barWidth + 10;
    });

    // Add legend for the chart
    const barLegendY = trendGraphY + graphHeight + 30;

    // Draw legend items
    doc.rect(50, barLegendY, 15, 15).fill("#E5E5E5").stroke(); // Light gray
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text("Completed", 70, barLegendY + 2);

    doc.rect(150, barLegendY, 15, 15).fill("#A0A0A0").stroke(); // Medium gray
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text("Pending", 170, barLegendY + 2);

    doc.rect(250, barLegendY, 15, 15).fill("#555555").stroke(); // Dark gray
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text("Failed", 270, barLegendY + 2);

    // Payment Listing Table - position it below the chart legend instead of adding new page
    const tableY = barLegendY + 40; // Position the table 40 points below the chart legend

    // Payment Details heading
    doc.fillColor("#000000").fontSize(16).text("Payment Details", 50, tableY);

    // Table header - Fix column spacing to prevent overlap
    const colPositions = {
      user: 50, // User column starts at 50
      plan: 150, // Plan column starts at 150
      amount: 240, // Amount column starts at 240
      status: 310, // Status column starts at 310
      date: 380, // Date column starts at 380
      method: 490, // Method column starts at 490
    };

    // Column widths for text rendering
    const colWidths = {
      user: 90, // User name gets 90pt width
      plan: 80, // Plan name gets 80pt width
      amount: 60, // Amount gets 60pt width
      status: 60, // Status gets 60pt width
      date: 100, // Date gets 100pt width
      method: 60, // Method gets remaining width
    };

    const headerY = tableY + 25; // Position header below the "Payment Details" title

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("User", colPositions.user, headerY, { width: colWidths.user })
      .text("Plan", colPositions.plan, headerY, { width: colWidths.plan })
      .text("Amount", colPositions.amount, headerY, { width: colWidths.amount })
      .text("Status", colPositions.status, headerY, { width: colWidths.status })
      .text("Payment Date", colPositions.date, headerY, {
        width: colWidths.date,
      })
      .text("Method", colPositions.method, headerY, {
        width: colWidths.method,
      });

    // Draw table header line
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, headerY + 20)
      .lineTo(550, headerY + 20)
      .stroke();

    // Add payment rows
    let y = headerY + 30;
    const rowHeight = 25;
    const tableLimit = Math.min(enhancedPayments.length, 15); // Limit rows on first page

    for (let i = 0; i < tableLimit; i++) {
      const payment = enhancedPayments[i];

      // Alternating row backgrounds
      if (i % 2 === 1) {
        doc
          .rect(50, y - 5, 500, rowHeight)
          .fillColor("#F0F0F0") // Light gray for alternating rows
          .fill();
      }

      // Format payment date
      const paymentDate = payment.createdAt
        ? new Date(payment.createdAt).toLocaleDateString()
        : "N/A";

      // Format payment amount - ensure it's a valid number
      const amount = payment.amount || 0;
      const displayAmount = isNaN(amount)
        ? "$0.00"
        : `$${Number(amount).toFixed(2)}`;

      // Add payment data - use the same column positions and widths
      doc.font("Helvetica").fontSize(9).fillColor("#000000");

      // User name
      doc.text(
        payment.userName.length > 15
          ? payment.userName.substring(0, 15) + "..."
          : payment.userName,
        colPositions.user,
        y,
        { width: colWidths.user }
      );

      // Plan name
      doc.text(
        payment.planName.length > 10
          ? payment.planName.substring(0, 10) + "..."
          : payment.planName,
        colPositions.plan,
        y,
        { width: colWidths.plan }
      );

      // Amount
      doc.text(displayAmount, colPositions.amount, y, {
        width: colWidths.amount,
      });

      // Status - black text, consistent with other reports
      doc.text(
        payment.status
          ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
          : "N/A",
        colPositions.status,
        y,
        { width: colWidths.status }
      );

      // Payment date
      doc.text(paymentDate, colPositions.date, y, { width: colWidths.date });

      // Payment method
      doc.text(
        payment.paymentMethod && payment.paymentMethod.length > 8
          ? payment.paymentMethod.substring(0, 8) + "..."
          : payment.paymentMethod || "N/A",
        colPositions.method,
        y,
        { width: colWidths.method }
      );

      y += rowHeight;
    }

    // Show count of total payments if some are not displayed
    if (enhancedPayments.length > tableLimit) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#000000")
        .text(
          `... and ${enhancedPayments.length - tableLimit} more payments`,
          50,
          y + 5
        );
    }

    // Add page numbers
    const pageCount = doc.bufferedPageCount;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Add page number at the bottom
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#000000")
        .text(`Page ${i + 1} of ${pageCount}`, 500, doc.page.height - 20);
    }

    // Finalize and send PDF
    doc.end();
    docEnded = true;
    console.log("Payment report generated successfully");
    return;
  } catch (error) {
    console.error("Error generating payment report:", error);

    // Ensure we clean up the document if there was an error
    if (doc && !docEnded) {
      try {
        doc.end();
        docEnded = true;
      } catch (e) {
        console.error("Error ending PDF document:", e);
      }
    }

    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate payment report",
        error: error.message,
      });
    }
  }
};

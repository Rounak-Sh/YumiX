import { Subscription, SubscriptionPlan } from "../../models/index.js";
import PDFDocument from "pdfkit";
import adminNotificationController from "../admin/notificationController.js";
import path from "path";
import fs from "fs";
import { format } from "date-fns";

// Define formatter for currency formatting
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/**
 * Generate a PDF report for subscriptions with optional filters
 */
export const generateSubscriptionReport = async (req, res) => {
  let doc = null;
  let docEnded = false; // Track if document has been ended

  try {
    console.log("Starting subscription report generation...");
    console.log("Request query parameters:", req.query);

    // Add detailed logging for plan type debugging
    console.log("Plan type from query:", req.query.planType);
    console.log("Plan type type:", typeof req.query.planType);
    console.log(
      "Plan type strict comparison to empty string:",
      req.query.planType === ""
    );

    // Debug: Find all distinct plan types in the database for reference
    try {
      const allPlanTypes = await Subscription.distinct("planType");
      console.log("All plan types in database:", allPlanTypes);
    } catch (err) {
      console.error("Error fetching distinct plan types:", err);
    }

    // Extract query parameters
    const { startDate, endDate, planType, status } = req.query;

    // Build the query based on filters
    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
        console.log(`Start date filter: ${start.toISOString()}`);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
        console.log(`End date filter: ${end.toISOString()}`);
      }
    }

    // Plan type filter - fix the condition to check for non-empty string instead of "all"
    if (planType && planType !== "") {
      // Use regex to find plan types that contain the filter value (case insensitive)
      // This will match "Pro Plan" when the filter is "Pro"
      query.planType = { $regex: planType, $options: "i" };
      console.log(`Plan type filter: ${planType} (using partial match)`);
    }

    // Status filter
    if (status) {
      console.log(`Status filter: ${status}`);
      if (status === "active") {
        query.paymentStatus = "completed";
        query.expiryDate = { $gte: new Date() };
      } else if (status === "inactive") {
        query.$or = [
          { paymentStatus: { $ne: "completed" } },
          { expiryDate: { $lt: new Date() } },
        ];
      } else if (status === "expired") {
        query.expiryDate = { $lt: new Date() };
        query.paymentStatus = "completed";
      } else if (status === "pending") {
        query.paymentStatus = "pending";
      }
    }

    console.log(`Subscription report query: ${JSON.stringify(query)}`);

    // Fetch subscriptions based on filters
    console.log("Fetching subscriptions from database...");
    console.log("Final query:", JSON.stringify(query));
    const subscriptions = await Subscription.find(query)
      .populate({
        path: "userId",
        select: "name email phone createdAt",
      })
      .lean();

    console.log(`Found ${subscriptions.length} subscriptions for the report`);

    // Log all plan types found to aid in debugging
    if (subscriptions.length > 0) {
      const planTypesFound = subscriptions.map((sub) => sub.planType);
      console.log("Plan types found in results:", planTypesFound);
      console.log(
        "Sample subscription:",
        JSON.stringify(subscriptions[0], null, 2)
      );
    } else {
      console.log("No subscriptions found matching the criteria");
      if (planType && planType !== "") {
        console.log(
          `Check if any subscriptions exist with plan types containing "${planType}"`
        );
      }
    }

    // Calculate subscription metrics
    console.log("Calculating subscription metrics...");
    const currentDate = new Date();
    const processedSubscriptions = subscriptions.map((subscription) => {
      // Calculate if subscription is active
      let isActive = false;

      try {
        isActive =
          subscription.paymentStatus === "completed" &&
          subscription.startDate <= currentDate &&
          subscription.expiryDate > currentDate;
      } catch (err) {
        console.error("Error calculating active status:", err);
        console.log(
          "Subscription data:",
          JSON.stringify(subscription, null, 2)
        );
      }

      return {
        ...subscription,
        isActive,
      };
    });

    // Create notification for report generation
    console.log("Creating admin notification...");
    if (req.admin && req.admin._id) {
      try {
        await adminNotificationController.createAdminNotification({
          adminId: req.admin._id,
          title: "Subscription Report Generated",
          message: "Subscription report has been generated",
          type: "report",
          reportType: "subscriptions",
          timestamp: new Date(),
        });
        console.log("Admin notification created successfully");
      } catch (notifError) {
        console.error("Error creating admin notification:", notifError);
      }
    } else {
      console.log("Admin ID not found in request, skipping notification");
    }

    // Get report filename with optional filters in name
    let filename = "subscription-report";
    if (planType && planType !== "") {
      filename += `-${planType}`;
    }
    if (status) {
      filename += `-${status}`;
    }
    if (startDate || endDate) {
      filename += "-filtered";
    }
    filename += ".pdf";
    console.log(`Report filename: ${filename}`);

    // Create a PDF document
    console.log("Creating PDF document...");
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
      .text("Subscription Report", 130, 60)
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, 200, 75, {
        align: "right",
      });

    // Add filter information if applied
    let filterText = "";
    if (planType && planType !== "") {
      // Capitalize the plan type
      const planDisplay = planType.charAt(0).toUpperCase() + planType.slice(1);
      filterText = `Plan Type: ${planDisplay}`;

      // Add debugging log for actual matching plan types
      console.log(`Displaying filter for plan type: ${planDisplay}`);
    }
    if (status) {
      if (filterText) filterText += " | ";
      filterText += `Status: ${
        status.charAt(0).toUpperCase() + status.slice(1)
      }`;
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
    // First line - Plan Type/Status filter
    if (filterText) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000") // Black text
        .text(`Filters Applied: ${filterText}`, 50, 90);
    }

    // Second line - Date filter (positioned below the first filter)
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

    // Subscription Insights Title - adjusted to keep consistent spacing after the horizontal line
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Subscription Insights", 50, dateText ? 130 : 130);

    // Define box dimensions consistent with user report
    const boxWidth = 240;
    const boxHeight = 80;
    const boxSpacing = 20;
    const boxRadius = 10;

    // Calculate metrics for display
    console.log("Calculating subscription metrics...");
    const totalSubscriptions = processedSubscriptions.length;
    const activeSubscriptions = processedSubscriptions.filter(
      (s) => s.isActive
    ).length;
    const expiredSubscriptions = processedSubscriptions.filter(
      (s) => !s.isActive
    ).length;

    // Calculate total revenue from all subscriptions with proper validation
    const totalRevenue = processedSubscriptions
      .reduce((sum, sub) => {
        // Ensure amount is a valid number
        const amount =
          typeof sub.amount === "number" && !isNaN(sub.amount) ? sub.amount : 0;
        return sum + amount;
      }, 0)
      .toFixed(2);

    console.log(
      `Metrics calculated: total=${totalSubscriptions}, active=${activeSubscriptions}, expired=${expiredSubscriptions}, revenue=${totalRevenue}`
    );

    // First row of boxes
    // Total Subscriptions Box
    doc
      .roundedRect(50, 155, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc.fillColor("#000000").fontSize(14).text("Total Subscriptions", 70, 170);
    doc.fontSize(24).text(totalSubscriptions.toString(), 70, 195);

    // Active Subscriptions Box
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
      .text("Active Subscriptions", 70 + boxWidth + boxSpacing, 170);
    doc
      .fontSize(24)
      .text(activeSubscriptions.toString(), 70 + boxWidth + boxSpacing, 195);

    // Second row of boxes
    // Total Revenue Box
    doc
      .roundedRect(50, 155 + boxHeight + 20, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text("Total Revenue", 70, 170 + boxHeight + 20);
    doc.fontSize(24).text(`$${totalRevenue}`, 70, 195 + boxHeight + 20);

    // Expired Subscriptions Box
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
        "Expired Subscriptions",
        70 + boxWidth + boxSpacing,
        170 + boxHeight + 20
      );
    doc
      .fontSize(24)
      .text(
        expiredSubscriptions.toString(),
        70 + boxWidth + boxSpacing,
        195 + boxHeight + 20
      );

    // Subscription Growth Trends Section
    const trendsTop = 350;
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Subscription Growth Trends", 50, trendsTop);

    // Prepare data for trend graph
    const trendData = getMonthlyCounts(processedSubscriptions);
    console.log("Monthly trend data:", trendData);

    // Add timeframe context
    let trendTimeframe = "";
    if (startDate && endDate) {
      trendTimeframe = `Data shown for period: ${new Date(
        startDate
      ).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    } else if (startDate) {
      trendTimeframe = `Data shown from ${new Date(
        startDate
      ).toLocaleDateString()} to present`;
    } else if (endDate) {
      trendTimeframe = `Data shown up to ${new Date(
        endDate
      ).toLocaleDateString()}`;
    } else {
      trendTimeframe = "Data shown for the last 6 months";
    }

    // Draw the trend chart
    const chartStartX = 65;
    const chartStartY = trendsTop + 30;
    const chartWidth = 470;
    const chartHeight = 150;
    const days = Object.keys(trendData);
    const subscriptionCounts = Object.values(trendData);
    const maxCount = Math.max(...subscriptionCounts, 1);

    // Draw chart background - white fill with black border
    doc
      .roundedRect(chartStartX, chartStartY, chartWidth, chartHeight, 5)
      .fillAndStroke("#FFFFFF", "#000000");

    // Add timeframe context below the chart
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#000000")
      .text(trendTimeframe, chartStartX, chartStartY + chartHeight + 5, {
        width: chartWidth,
        align: "center",
      });

    // Check if we have any data points to display
    if (days.length === 0) {
      // No data available
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#000000")
        .text(
          "No subscription data available for the selected period.",
          chartStartX + 50,
          chartStartY + 60,
          {
            width: chartWidth - 100,
            align: "center",
          }
        );
    } else {
      // Draw X-axis line - black
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(chartStartX, chartStartY + chartHeight - 25)
        .lineTo(chartStartX + chartWidth, chartStartY + chartHeight - 25)
        .stroke();

      // Calculate bar dimensions
      const barWidth = Math.min(30, (chartWidth - 80) / days.length);
      const barSpacing =
        (chartWidth - barWidth * days.length) / (days.length + 1);

      // Draw X-axis labels (months)
      days.forEach((day, i) => {
        const x = chartStartX + barSpacing + i * (barWidth + barSpacing);
        doc
          .fontSize(8)
          .fillColor("#000000")
          .font("Helvetica")
          .text(day, x, chartStartY + chartHeight - 20, {
            width: barWidth,
            align: "center",
          });
      });

      // Draw Y-axis (tick marks and values) - black
      const yAxisMax = Math.ceil(maxCount * 1.1); // Add 10% padding
      const yAxisSteps = 5;
      const yAxisStepSize = yAxisMax / yAxisSteps;

      for (let i = 0; i <= yAxisSteps; i++) {
        const value = Math.round(i * yAxisStepSize);
        const y =
          chartStartY +
          chartHeight -
          25 -
          (i / yAxisSteps) * (chartHeight - 40);

        // Draw tick mark - black
        doc
          .strokeColor("#000000")
          .lineWidth(0.5)
          .moveTo(chartStartX - 5, y)
          .lineTo(chartStartX, y)
          .stroke();

        // Draw value - black text
        doc
          .fontSize(8)
          .fillColor("#000000")
          .font("Helvetica")
          .text(value.toString(), chartStartX - 25, y - 4, {
            width: 20,
            align: "right",
          });
      }

      // Draw bars
      subscriptionCounts.forEach((count, i) => {
        const x = chartStartX + barSpacing + i * (barWidth + barSpacing);
        const barHeight = Math.max((count / maxCount) * (chartHeight - 40), 5);
        const y = chartStartY + chartHeight - 25 - barHeight;

        // Draw bar with black color
        doc.rect(x, y, barWidth, barHeight).fill("#000000");

        // Draw count on top of bar if it's significant enough
        if (count > 0) {
          doc
            .fontSize(9)
            .fillColor("#000000")
            .font("Helvetica")
            .text(count.toString(), x, y - 15, {
              width: barWidth,
              align: "center",
            });
        }
      });
    }

    // Calculate plan distribution
    console.log("Calculating plan distribution...");
    const planDistribution = {};

    try {
      processedSubscriptions.forEach((sub) => {
        const planName = sub.planType || "Unknown";
        console.log(`Processing subscription with planType: ${planName}`);
        if (!planDistribution[planName]) {
          planDistribution[planName] = 1;
        } else {
          planDistribution[planName]++;
        }
      });
      console.log("Plan distribution calculated:", planDistribution);
    } catch (planDistError) {
      console.error("Error calculating plan distribution:", planDistError);
    }

    // Plan Distribution Section
    const distributionTop = chartStartY + chartHeight + 50;
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Plan Distribution", 50, distributionTop);

    // Draw distribution section with table-like format
    let distY = distributionTop + 30;

    // Draw distribution header
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("Plan Type", 70, distY)
      .text("Count", 300, distY)
      .text("Percentage", 400, distY);

    // Draw header underline
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, distY + 15)
      .lineTo(550, distY + 15)
      .stroke();

    // Draw plan distribution data
    distY += 25;

    const planEntries = Object.entries(planDistribution);

    if (planEntries.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#000000")
        .text("No plan distribution data available.", 50, distY);
    } else {
      planEntries.forEach(([planName, count], i) => {
        // Alternating row background for even rows
        if (i % 2 === 1) {
          doc
            .rect(50, distY - 5, 500, 20)
            .fillColor("#F0F0F0") // Light gray for alternating rows
            .fill();
        }

        const percentage =
          totalSubscriptions > 0
            ? ((count / totalSubscriptions) * 100).toFixed(1)
            : "0.0";

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#000000")
          .text(planName, 70, distY)
          .text(count.toString(), 300, distY)
          .text(`${percentage}%`, 400, distY);

        distY += 20;
      });
    }

    // Add subscription details on a new page
    doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#000000")
      .text("Subscription Details", 50, 50);

    // Prepare table header
    const tableTop = 80;

    // Table header
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("User", 50, tableTop)
      .text("Plan", 150, tableTop)
      .text("Price", 250, tableTop)
      .text("Status", 320, tableTop)
      .text("Start Date", 390, tableTop)
      .text("Expiry Date", 480, tableTop);

    // Horizontal line below header
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table rows with better vertical spacing - show 10 users max
    const subscriptionLimit = Math.min(processedSubscriptions.length, 10);
    let y = tableTop + 25;

    if (processedSubscriptions.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#000000")
        .text("No subscription data found for the selected period.", 50, y);
    } else {
      for (let i = 0; i < subscriptionLimit; i++) {
        const sub = processedSubscriptions[i];

        // Alternating row background
        if (i % 2 === 1) {
          doc
            .rect(50, y - 5, 500, 20)
            .fillColor("#F0F0F0") // Light gray for alternating rows
            .fill();
        }

        // Format the data
        const userName = sub.userId?.name || "Unknown User";
        const planName = sub.planType || "Unknown Plan";
        const price =
          typeof sub.amount === "number" && !isNaN(sub.amount)
            ? formatter.format(sub.amount)
            : "$0.00";
        const status = sub.isActive ? "Active" : "Expired";
        const startDate = sub.startDate
          ? new Date(sub.startDate).toLocaleDateString()
          : "N/A";
        const expiryDate = sub.expiryDate
          ? new Date(sub.expiryDate).toLocaleDateString()
          : "N/A";

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#000000")
          .text(userName, 50, y, { width: 90 })
          .text(planName, 150, y, { width: 90 })
          .text(price, 250, y, { width: 60 })
          .text(status, 320, y, { width: 60 })
          .text(startDate, 390, y, { width: 80 })
          .text(expiryDate, 480, y, { width: 85 });

        y += 20;
      }

      // Show count of total subscriptions if some are not displayed
      if (processedSubscriptions.length > subscriptionLimit) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#000000")
          .text(
            `... and ${
              processedSubscriptions.length - subscriptionLimit
            } more subscriptions`,
            50,
            y + 5
          );
      }
    }

    // Add page numbers if we have multiple pages
    const pageCount = doc.bufferedPageCount;
    if (pageCount > 1) {
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        // Add page number at the bottom
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#000000")
          .text(`Page ${i + 1} of ${pageCount}`, 500, doc.page.height - 20);
      }
    }

    // Finalize the PDF and end
    console.log("Finalizing report...");
    doc.end();
    docEnded = true;
    console.log("Subscription report generated successfully");
    return;

    // Define helper function to get monthly counts for trend chart
    function getMonthlyCounts(subscriptions) {
      try {
        // Group subscriptions by month
        const monthlyCounts = {};
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5); // Show 6 months including current

        // Initialize all months with zero counts (for last 6 months)
        for (let i = 0; i < 6; i++) {
          const monthDate = new Date(sixMonthsAgo);
          monthDate.setMonth(sixMonthsAgo.getMonth() + i);
          const monthLabel = monthDate.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          });
          monthlyCounts[monthLabel] = 0;
        }

        // Count subscriptions per month
        if (Array.isArray(subscriptions)) {
          subscriptions.forEach((sub) => {
            if (sub && sub.createdAt) {
              try {
                const subDate = new Date(sub.createdAt);
                if (subDate >= sixMonthsAgo) {
                  const monthLabel = subDate.toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  });
                  monthlyCounts[monthLabel] =
                    (monthlyCounts[monthLabel] || 0) + 1;
                }
              } catch (dateError) {
                console.error("Error processing date:", dateError);
              }
            }
          });
        }

        return monthlyCounts;
      } catch (error) {
        console.error("Error calculating monthly counts:", error);
        return {};
      }
    }
  } catch (error) {
    console.error("Error generating subscription report:", error);
    console.error("Error stack trace:", error.stack);

    // Ensure we clean up the document if there was an error
    if (doc && !docEnded) {
      try {
        console.log("Ending PDF document after error...");
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
        message: "Failed to generate subscription report",
        error: error.message,
      });
    }
  }
};

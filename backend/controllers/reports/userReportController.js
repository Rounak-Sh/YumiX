import { User } from "../../models/index.js";
import PDFDocument from "pdfkit";
import adminNotificationController from "../admin/notificationController.js";
import path from "path";
import fs from "fs";

/**
 * Generate a PDF report for users with optional filters
 */
export const generateUserReport = async (req, res) => {
  // Variable to store our document instance
  let doc = null;

  try {
    console.log("Starting user report generation...");
    // Extract query parameters
    const { startDate, endDate, status } = req.query;

    // Build the query based on filters
    let query = {};

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

    // Status filter (active/blocked)
    if (status && ["active", "blocked"].includes(status)) {
      query.status = status;
    }

    console.log(`User report query: ${JSON.stringify(query)}`);

    // Fetch users with filters
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    console.log(`Found ${users.length} users for the report`);

    // Get all users for trend analysis with the same filters but without status
    let trendQuery = {};
    if (query.createdAt) {
      trendQuery.createdAt = query.createdAt;
    } else {
      // If no date filter applied, default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      trendQuery.createdAt = { $gte: thirtyDaysAgo };
    }

    const trendUsers = await User.find(trendQuery)
      .select("createdAt")
      .sort({ createdAt: 1 });

    // Get range start and end dates for determining granularity
    let rangeStartDate =
      trendQuery.createdAt?.$gte ||
      new Date(new Date().setDate(new Date().getDate() - 30));
    let rangeEndDate = trendQuery.createdAt?.$lte || new Date();

    // Calculate the range in days
    const rangeDays = Math.ceil(
      (rangeEndDate - rangeStartDate) / (1000 * 60 * 60 * 24)
    );
    console.log(
      `Date range is ${rangeDays} days from ${rangeStartDate.toISOString()} to ${rangeEndDate.toISOString()}`
    );

    // Determine the date granularity based on the selected date range
    let dateGranularity;
    let trendTitle = "";

    if (rangeDays <= 31) {
      // For 1 month or less: show daily breakdown
      dateGranularity = "daily";
      trendTitle = "Daily User Registrations";
    } else if (rangeDays <= 90) {
      // For 3 months or less: show weekly breakdown
      dateGranularity = "weekly";
      trendTitle = "Weekly User Registrations";
    } else if (rangeDays <= 730) {
      // For 2 years or less: show monthly breakdown
      dateGranularity = "monthly";
      trendTitle = "Monthly User Registrations";
    } else {
      // For more than 2 years: show quarterly breakdown
      dateGranularity = "quarterly";
      trendTitle = "Quarterly User Registrations";
    }

    console.log(`Using ${dateGranularity} granularity for chart`);

    // Prepare data for chart with proper date formatting
    const trendData = {};

    // Group users by the appropriate time period
    trendUsers.forEach((user) => {
      const date = new Date(user.createdAt);
      let key;

      switch (dateGranularity) {
        case "daily":
          // Format: YYYY-MM-DD
          key = date.toISOString().substring(0, 10);
          break;
        case "weekly":
          // Get the Monday of the week
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
          const monday = new Date(date);
          monday.setDate(diff);
          key = monday.toISOString().substring(0, 10);
          break;
        case "monthly":
          // Format: YYYY-MM
          key = date.toISOString().substring(0, 7);
          break;
        case "quarterly":
          // Format: YYYY-QX (e.g., 2025-Q1)
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        default:
          key = date.toISOString().substring(0, 10);
      }

      trendData[key] = (trendData[key] || 0) + 1;
    });

    // Sort the keys chronologically
    let sortedKeys = Object.keys(trendData).sort();

    // Limit the number of data points to display (to avoid overcrowding)
    const maxDataPoints = 12;
    if (sortedKeys.length > maxDataPoints) {
      const step = Math.ceil(sortedKeys.length / maxDataPoints);
      const sampledKeys = [];
      for (let i = 0; i < sortedKeys.length; i += step) {
        sampledKeys.push(sortedKeys[i]);
      }
      // Always include the most recent data point
      if (!sampledKeys.includes(sortedKeys[sortedKeys.length - 1])) {
        sampledKeys.push(sortedKeys[sortedKeys.length - 1]);
      }
      sortedKeys = sampledKeys.sort();
    }

    // Format display labels for chart
    const formatDisplayLabel = (key) => {
      switch (dateGranularity) {
        case "daily":
          // Convert YYYY-MM-DD to more readable format (e.g., "Mar 24")
          const dateParts = key.split("-");
          const date = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
          );
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        case "weekly":
          // Show as "Week of Mar 24"
          const weekParts = key.split("-");
          const weekDate = new Date(
            parseInt(weekParts[0]),
            parseInt(weekParts[1]) - 1,
            parseInt(weekParts[2])
          );
          return `Week of ${weekDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`;
        case "monthly":
          // Show as "Mar 2025"
          const monthParts = key.split("-");
          const monthDate = new Date(
            parseInt(monthParts[0]),
            parseInt(monthParts[1]) - 1,
            1
          );
          return monthDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
        case "quarterly":
          // Show as "Q1 2025"
          const [year, quarter] = key.split("-");
          return `${quarter} ${year}`;
        default:
          return key;
      }
    };

    // Create the final trend data for chart with formatted labels
    const userRegistrationTrend = {};
    sortedKeys.forEach((key) => {
      const displayLabel = formatDisplayLabel(key);
      userRegistrationTrend[displayLabel] = trendData[key];
    });

    // Get additional metrics for the report
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "active").length;
    const blockedUsers = users.filter((u) => u.status === "blocked").length;
    const subscribedUsers = users.filter((u) => u.isSubscribed).length;
    const verifiedUsers = users.filter((u) => u.isVerified).length;
    const googleAuthUsers = users.filter((u) => u.googleId).length;

    // Calculate subscription rate
    const subscriptionRate =
      totalUsers > 0 ? ((subscribedUsers / totalUsers) * 100).toFixed(2) : 0;

    // Calculate verification rate
    const verificationRate =
      totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0;

    // Calculate Google auth usage
    const googleAuthRate =
      totalUsers > 0 ? ((googleAuthUsers / totalUsers) * 100).toFixed(2) : 0;

    // Create notification for report generation
    await adminNotificationController.createAdminNotification({
      adminId: req.admin._id,
      title: "Users Report Generated",
      message: "Users report has been generated",
      type: "report",
      reportType: "users",
      timestamp: new Date(),
    });

    // Get report filename with optional filters in name
    let filename = "users-report";
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
      bufferPages: true, // Allow us to control page count
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    doc.pipe(res);

    // Set background color to white instead of beige
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
      .fillColor("#000000") // Black text instead of grey
      .fontSize(20)
      .text("YuMix", 130, 40)
      .text("Users Report", 130, 60)
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, 200, 75, {
        align: "right",
      });

    // Add filter information if applied
    let filterText = "";
    if (status) {
      filterText += `Status: ${
        status.charAt(0).toUpperCase() + status.slice(1)
      }`;
    }

    // Create date range text separately to apply consistent styling
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

    // Add filter text without date information first
    if (filterText) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#000000") // Black text
        .text(`Filters Applied: ${filterText}`, 50, 90);
    }

    // Add date range with consistent styling (not bold)
    if (dateText) {
      // For better visibility, if we have both start and end dates, center the text
      if (startDate && endDate) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#000000") // Black text
          .text(`Filters Applied: ${dateText}`, 50, 90, {
            align: "center",
            width: 500,
          });
      } else {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#000000") // Black text
          .text(
            filterText ? dateText : `Filters Applied: ${dateText}`,
            filterText ? 185 : 50,
            90
          );
      }
    }

    // Horizontal line - change to black
    doc
      .strokeColor("#000000") // Black line
      .lineWidth(1)
      .moveTo(50, 110)
      .lineTo(550, 110)
      .stroke();

    // User Insights Title
    doc.fontSize(16).fillColor("#000000").text("User Insights", 50, 130); // Black text

    // Make boxes more consistent with black and white theme
    const boxWidth = 240;
    const boxHeight = 80;
    const boxSpacing = 20;
    const boxRadius = 10;

    // First row of boxes
    // Total Users Box
    doc
      .roundedRect(50, 155, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc.fillColor("#000000").fontSize(14).text("Total Users", 70, 170); // Black text
    doc.fontSize(24).text(totalUsers.toString(), 70, 195);

    // Active vs Blocked Box
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
      .fillColor("#000000") // Black text
      .fontSize(14)
      .text("Active / Blocked", 70 + boxWidth + boxSpacing, 170);
    doc
      .fontSize(24)
      .text(
        `${activeUsers} / ${blockedUsers}`,
        70 + boxWidth + boxSpacing,
        195
      );

    // Second row of boxes - positioned closer to first row
    // Subscription Rate Box
    doc
      .roundedRect(50, 155 + boxHeight + 20, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000") // Black text
      .fontSize(14)
      .text("Subscription Rate", 70, 170 + boxHeight + 20);
    doc.fontSize(24).text(`${subscriptionRate}%`, 70, 195 + boxHeight + 20);

    // Verification Rate Box
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
      .fillColor("#000000") // Black text
      .fontSize(14)
      .text(
        "Verification Rate",
        70 + boxWidth + boxSpacing,
        170 + boxHeight + 20
      );
    doc
      .fontSize(24)
      .text(
        `${verificationRate}%`,
        70 + boxWidth + boxSpacing,
        195 + boxHeight + 20
      );

    // Key User Metrics Section with better spacing
    doc.fontSize(16).fillColor("#000000").text("Key User Metrics", 50, 360); // Black text

    // More consistent bullet points with black text
    const bulletPoints = [
      `${subscribedUsers} users have active subscriptions (${subscriptionRate}%)`,
      `${verifiedUsers} users have verified their accounts (${verificationRate}%)`,
      `${googleAuthUsers} users use Google Authentication (${googleAuthRate}%)`,
      `${totalUsers - verifiedUsers} users have pending verification`,
    ];

    // Render bullet points with appropriate spacing
    let bulletY = 385;
    bulletPoints.forEach((point) => {
      doc
        .fontSize(10)
        .fillColor("#000000") // Black text
        .text("•", 50, bulletY)
        .text(point, 65, bulletY);
      bulletY += 20;
    });

    // User Growth Trend Section with better spacing
    doc
      .fontSize(16)
      .fillColor("#000000") // Black text
      .text(`User Growth Trends (${trendTitle})`, 50, 470);

    // Update the footer of the chart to provide context
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
      trendTimeframe = "Data shown for the last 30 days";
    }

    // Draw the chart
    const chartStartX = 65;
    const chartStartY = 500; // Move chart down a bit
    const chartWidth = 470;
    const chartHeight = 150;
    const days = Object.keys(userRegistrationTrend);
    const registrations = Object.values(userRegistrationTrend);
    const maxRegistrations = Math.max(...registrations, 1); // Ensure we don't divide by zero

    // Draw chart background - white fill with black border
    doc
      .roundedRect(chartStartX, chartStartY, chartWidth, chartHeight, 5)
      .fillAndStroke("#FFFFFF", "#000000");

    // Add the timeframe context below the chart
    doc
      .fontSize(8)
      .font("Helvetica") // Regular font
      .fillColor("#000000") // Black text
      .text(trendTimeframe, chartStartX, chartStartY + chartHeight + 5, {
        width: chartWidth,
        align: "center",
      });

    // Check if we have any data points to display
    if (days.length === 0) {
      // No data available
      doc
        .fontSize(12)
        .font("Helvetica") // Regular font
        .fillColor("#000000") // Black text
        .text(
          "No user registration data available for the selected period.",
          chartStartX + 50,
          chartStartY + 60,
          {
            width: chartWidth - 100,
            align: "center",
          }
        );
    } else {
      // Draw axis labels with better spacing
      const barWidth = Math.min(30, (chartWidth - 80) / days.length); // Narrower bars
      const barSpacing =
        (chartWidth - barWidth * days.length) / (days.length + 1);

      // Draw X-axis line - black
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(chartStartX, chartStartY + chartHeight - 25)
        .lineTo(chartStartX + chartWidth, chartStartY + chartHeight - 25)
        .stroke();

      // Draw X-axis labels (days)
      days.forEach((day, i) => {
        const x = chartStartX + barSpacing + i * (barWidth + barSpacing);
        doc
          .fontSize(8) // Smaller font for potentially longer labels
          .fillColor("#000000") // Black text
          .font("Helvetica") // Regular font
          .text(day, x, chartStartY + chartHeight - 20, {
            width: barWidth,
            align: "center",
          });
      });

      // Draw Y-axis (tick marks and values) - black
      const yAxisMax = Math.ceil(maxRegistrations * 1.1); // Add 10% padding
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
      registrations.forEach((count, i) => {
        const x = chartStartX + barSpacing + i * (barWidth + barSpacing);
        const barHeight = Math.max(
          (count / maxRegistrations) * (chartHeight - 40),
          5
        );
        const y = chartStartY + chartHeight - 25 - barHeight;

        // Draw bar with black color
        doc.rect(x, y, barWidth, barHeight).fill("#000000"); // Black bars

        // Draw count on top of bar if it's significant enough
        if (count > 0) {
          doc
            .fontSize(9)
            .fillColor("#000000") // Black text
            .font("Helvetica") // Regular font
            .text(count.toString(), x, y - 15, {
              width: barWidth,
              align: "center",
            });
        }
      });
    }

    // Add more spacing before the table
    const tableTop = chartStartY + chartHeight + 50;

    // Table header - black text
    doc
      .font("Helvetica") // Regular font
      .fontSize(10)
      .fillColor("#000000") // Black text
      .text("Name", 50, tableTop)
      .text("Email", 150, tableTop)
      .text("Status", 350, tableTop)
      .text("Subscribed", 430, tableTop)
      .text("Join Date", 500, tableTop);

    // Horizontal line below header - black
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table rows with better vertical spacing - increased from 5 to 10 users
    const userLimit = Math.min(users.length, 10);
    let y = tableTop + 25;

    for (let i = 0; i < userLimit; i++) {
      const user = users[i];

      // Row background for alternating rows - black and white theme
      if (i % 2 === 1) {
        doc
          .rect(50, y - 5, 500, 20)
          .fillColor("#F0F0F0") // Light gray for alternating rows
          .fill();
      }

      doc.font("Helvetica").fontSize(9).fillColor("#000000"); // Black text

      // Display subscription status with Yes/No
      const subscriptionStatus = user.isSubscribed ? "Yes" : "No";

      doc
        .text(user.name, 50, y, { width: 90 })
        .text(user.email, 150, y, { width: 165 })
        .text(user.status, 350, y, { width: 60 })
        .text(subscriptionStatus, 430, y, { width: 80 })
        .text(new Date(user.createdAt).toLocaleDateString(), 500, y, {
          width: 85,
        });

      y += 20; // Increased row height for better readability
    }

    // Show count of total users if some are not displayed
    if (users.length > userLimit) {
      doc
        .font("Helvetica") // Regular font
        .fontSize(9)
        .fillColor("#000000") // Black text
        .text(`... and ${users.length - userLimit} more users`, 50, y + 5);
    }

    // Ensure we only have necessary pages - don't add extra blank pages
    let pageCount = doc.bufferedPageCount;

    // Only add page numbers if we have multiple pages due to content
    if (pageCount > 1) {
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        // Add page number at the bottom
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#000000") // Black text
          .text(`Page ${i + 1} of ${pageCount}`, 500, doc.page.height - 20);
      }
    }

    // Finalize the PDF and end - ensure no extra pages
    doc.flushPages();
    doc.end();
    console.log("User report generation completed successfully");
  } catch (error) {
    console.error("Error generating user report:", error);
    // Try to close the document if it exists
    if (doc) {
      try {
        doc.end();
      } catch (endError) {
        console.error("Error ending document:", endError);
      }
    }

    // Only send an error response if we haven't already written to the response
    if (!res.writableEnded) {
      res.status(500).json({
        success: false,
        message: "Failed to generate user report",
        error: error.message,
      });
    }
  }
};

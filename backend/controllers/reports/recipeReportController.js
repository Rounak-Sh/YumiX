import { Recipe, AdminRecipe } from "../../models/index.js";
import PDFDocument from "pdfkit";
import adminNotificationController from "../admin/notificationController.js";
import path from "path";
import fs from "fs";

/**
 * Generate a PDF report for recipes with optional filters
 */
export const generateRecipeReport = async (req, res) => {
  // Variable to store our document instance
  let doc = null;
  let docEnded = false; // Track if the document has been ended

  try {
    console.log("Starting recipe report generation...");
    // Extract query parameters
    const { startDate, endDate, featured } = req.query;

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

    // Log request info
    console.log("Report request:", { startDate, endDate, featured });

    // First, get featured recipes from AdminRecipe collection
    let adminRecipes = [];
    let featuredSourceIds = [];
    let recipes = [];

    try {
      // Get all admin recipes to establish what's featured
      adminRecipes = await AdminRecipe.find({ isFeatured: true }).lean();
      console.log(
        `Found ${adminRecipes.length} featured admin recipes in AdminRecipe collection`
      );

      // Log sample
      if (adminRecipes.length > 0) {
        console.log(
          "Sample featured AdminRecipe:",
          JSON.stringify(adminRecipes[0], null, 2)
        );
      }

      // Extract sourceIds from admin recipes - these identify which recipes are featured
      featuredSourceIds = adminRecipes
        .map((recipe) => recipe.sourceId)
        .filter((id) => id != null);

      console.log(
        `Extracted ${
          featuredSourceIds.length
        } featured sourceIds: ${JSON.stringify(featuredSourceIds)}`
      );

      // Get names of featured recipes for alternative matching
      const featuredNames = adminRecipes
        .map((recipe) => recipe.name)
        .filter((name) => name != null);
      console.log(`Featured recipe names: ${JSON.stringify(featuredNames)}`);
    } catch (error) {
      console.error("Error retrieving admin recipes:", error);
    }

    // Get a sample recipe to understand data format
    try {
      const sampleRecipe = await Recipe.findOne().lean();
      if (sampleRecipe) {
        console.log("Sample Recipe format:", {
          id: sampleRecipe._id,
          sourceId: sampleRecipe.sourceId,
          sourceIdType: typeof sampleRecipe.sourceId,
          name: sampleRecipe.name,
        });
      }
    } catch (error) {
      console.error("Error getting sample recipe:", error);
    }

    // IMPROVED APPROACH: Get recipes that match either by sourceId OR by name with admin featured recipes
    try {
      // Start with base query - using date filters as before
      const baseQuery = { ...query };

      if (
        featured === "true" ||
        featured === "yes" ||
        featured === "featured"
      ) {
        // Create an query that will match recipes either by sourceId OR by name
        // We need to convert sourceIds to strings since they might be stored as strings in the Recipe collection
        const sourceIdStrings = featuredSourceIds.map((id) => String(id));

        // For exact name matching from our admin recipes
        const nameQuery = { name: { $in: featuredNames } };

        // For sourceId matching - using $in and allowing for string conversion
        const sourceIdQuery = {
          $or: [
            { sourceId: { $in: featuredSourceIds } }, // Match numeric sourceIds
            { sourceId: { $in: sourceIdStrings } }, // Match string sourceIds
          ],
        };

        // Combine with our date filters
        const combinedQuery = {
          ...baseQuery,
          $or: [nameQuery, sourceIdQuery],
        };

        console.log("Featured recipe query:", JSON.stringify(combinedQuery));
        recipes = await Recipe.find(combinedQuery).limit(100).lean();
        console.log(
          `Found ${recipes.length} featured recipes matching criteria`
        );
      } else if (
        featured === "false" ||
        featured === "no" ||
        featured === "non-featured"
      ) {
        // For non-featured, exclude recipes that match by name or sourceId
        const sourceIdStrings = featuredSourceIds.map((id) => String(id));

        // Create queries to exclude featured recipes
        const notNameQuery = { name: { $nin: featuredNames } };
        const notSourceIdQuery = {
          $and: [
            { sourceId: { $nin: featuredSourceIds } },
            { sourceId: { $nin: sourceIdStrings } },
          ],
        };

        const combinedQuery = {
          ...baseQuery,
          $or: [notNameQuery, notSourceIdQuery],
        };

        recipes = await Recipe.find(combinedQuery).limit(100).lean();
        console.log(
          `Found ${recipes.length} non-featured recipes matching criteria`
        );
      } else if (featured === "popular") {
        // Get popular recipes sorted by viewCount
        recipes = await Recipe.find(baseQuery)
          .sort({ viewCount: -1 })
          .limit(100)
          .lean();
        console.log(`Found ${recipes.length} recipes sorted by popularity`);
      } else if (featured === "new") {
        // Get newest recipes
        recipes = await Recipe.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
        console.log(`Found ${recipes.length} recipes sorted by creation date`);
      } else {
        // No featured filter, just use date filters
        recipes = await Recipe.find(baseQuery)
          .sort({ viewCount: -1 })
          .limit(100)
          .lean();
        console.log(`Found ${recipes.length} recipes with no featured filter`);
      }

      // Add isFeatured flag based on matching criteria
      recipes = recipes.map((recipe) => {
        // Check if this recipe matches a featured recipe by name or sourceId
        const matchesByName = featuredNames.includes(recipe.name);

        let matchesBySourceId = false;
        if (recipe.sourceId) {
          const recipeSourceIdStr = String(recipe.sourceId);
          matchesBySourceId = featuredSourceIds.some(
            (id) => String(id) === recipeSourceIdStr
          );
        }

        const isFeatured = matchesByName || matchesBySourceId;

        if (isFeatured) {
          console.log(
            `Recipe marked as featured: ${recipe.name} (${recipe._id})`
          );
          if (matchesByName) console.log(`- Matched by name`);
          if (matchesBySourceId)
            console.log(`- Matched by sourceId: ${recipe.sourceId}`);
        }

        return {
          ...recipe,
          isFeatured,
        };
      });

      // Log final recipe count
      const recipeFeaturedCount = recipes.filter((r) => r.isFeatured).length;
      console.log(
        `Final recipe count: ${recipes.length} total, ${recipeFeaturedCount} featured`
      );
    } catch (error) {
      console.error("Error filtering recipes:", error);
    }

    // Create notification for report generation
    if (req.admin && req.admin._id) {
      await adminNotificationController.createAdminNotification({
        adminId: req.admin._id,
        title: "Recipe Report Generated",
        message: "Recipe report has been generated",
        type: "report",
        reportType: "recipes",
        timestamp: new Date(),
      });
    } else {
      console.log("Admin ID not found in request, skipping notification");
    }

    // Get report filename with optional filters in name
    let filename = "recipe-report";
    if (featured) {
      filename += `-${featured}`;
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
      .text("Recipe Report", 130, 60)
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, 200, 75, {
        align: "right",
      });

    // Add filter information if applied
    let filterText = "";

    // Add featured filter text
    if (featured) {
      let statusLabel = "";
      if (
        featured === "true" ||
        featured === "yes" ||
        featured === "featured"
      ) {
        statusLabel = "Featured Recipes";
      } else if (
        featured === "false" ||
        featured === "no" ||
        featured === "non-featured"
      ) {
        statusLabel = "Non-Featured Recipes";
      } else if (featured === "popular") {
        statusLabel = "Popular";
      } else if (featured === "new") {
        statusLabel = "Recently Added";
      } else {
        statusLabel = featured.charAt(0).toUpperCase() + featured.slice(1);
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

    // Recipe Insights Title - adjusted to keep consistent spacing after the horizontal line
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Recipe Insights", 50, dateText ? 130 : 130);

    // Define box dimensions consistent with user report
    const boxWidth = 240;
    const boxHeight = 80;
    const boxSpacing = 20;
    const boxRadius = 10;

    // Calculate metrics
    const totalRecipes = recipes.length;
    const totalViews = recipes.reduce((sum, r) => sum + (r.viewCount || 0), 0);
    const avgViews =
      totalRecipes > 0 ? Math.round(totalViews / totalRecipes) : 0;

    // Calculate the count of featured recipes
    const recipeFeaturedCount = recipes.filter((r) => r.isFeatured).length;

    // Calculate favorites
    const totalFavorites = recipes.reduce((sum, r) => {
      const favoriteCount =
        r.favoriteCount ||
        r.favoritesCount ||
        (r.favorites ? r.favorites.length : 0) ||
        0;
      return sum + favoriteCount;
    }, 0);
    const avgFavorites = totalRecipes > 0 ? totalFavorites / totalRecipes : 0;

    // First row of boxes
    // Total Recipes Box
    doc
      .roundedRect(50, 155, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc.fillColor("#000000").fontSize(14).text("Total Recipes", 70, 170);
    doc.fontSize(24).text(totalRecipes.toString(), 70, 195);

    // Average Views Box
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
      .text("Average Views", 70 + boxWidth + boxSpacing, 170);
    doc.fontSize(24).text(avgViews.toString(), 70 + boxWidth + boxSpacing, 195);

    // Second row of boxes
    // Featured Recipes Box
    doc
      .roundedRect(50, 155 + boxHeight + 20, boxWidth, boxHeight, boxRadius)
      .fillAndStroke("#FFFFFF", "#000000"); // White fill, black border
    doc
      .fillColor("#000000")
      .fontSize(14)
      .text("Featured Recipes", 70, 170 + boxHeight + 20);
    doc
      .fontSize(24)
      .text(recipeFeaturedCount.toString(), 70, 195 + boxHeight + 20);

    // Average Favorites Box
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
        "Average Favorites",
        70 + boxWidth + boxSpacing,
        170 + boxHeight + 20
      );
    doc
      .fontSize(24)
      .text(
        avgFavorites.toFixed(1),
        70 + boxWidth + boxSpacing,
        195 + boxHeight + 20
      );

    // Recipe Trends Section - adjusted position
    doc
      .fontSize(16)
      .fillColor("#000000")
      .text("Recipe Popularity Trends", 50, 350);

    // Add bullet points for recipe metrics - create copy of array before sorting
    const topRecipeViews =
      recipes.length > 0
        ? Math.round(
            [...recipes].sort(
              (a, b) => (b.viewCount || 0) - (a.viewCount || 0)
            )[0]?.viewCount || 0
          )
        : 0;

    // For favorites, use Math.max instead of sorting
    const topRecipeFavorites =
      recipes.length > 0
        ? Math.max(
            ...recipes.map(
              (r) =>
                r.favoriteCount ||
                r.favoritesCount ||
                (r.favorites ? r.favorites.length : 0) ||
                0
            )
          )
        : 0;

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#000000")
      .text(
        `The most popular recipes receive ${
          topRecipeViews || Math.round(avgViews * 3)
        } views and ${
          topRecipeFavorites || (avgFavorites * 2.5).toFixed(1)
        } favorites on average.`,
        70,
        375
      );

    // Top trending recipes table - adjusted position
    const trendingTableY = 410;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#000000")
      .text("Recipe Name", 50, trendingTableY)
      .text("Views", 300, trendingTableY)
      .text("Favorites", 360, trendingTableY)
      .text("Featured", 420, trendingTableY)
      .text("Date Added", 480, trendingTableY);

    // Horizontal line below header - black
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, trendingTableY + 15)
      .lineTo(550, trendingTableY + 15)
      .stroke();

    // Table content for trending recipes - limit to top recipes
    let y = trendingTableY + 25;

    // If we have no recipes, show a message
    if (recipes.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#000000")
        .text("No recipes found matching the selected filters.", 50, y, {
          width: 500,
          align: "center",
        });
    } else {
      // Sort by viewCount and limit to top 10 to match the user report's number of visible entries
      const topRecipes = [...recipes]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 10);

      topRecipes.forEach((recipe, i) => {
        // Alternating row backgrounds
        if (i % 2 === 1) {
          doc
            .rect(50, y - 5, 500, 20)
            .fillColor("#F0F0F0") // Light gray for alternating rows - match user report
            .fill();
        }

        doc.font("Helvetica").fontSize(9).fillColor("#000000");

        // Get favorite count with fallbacks
        const favoriteCount =
          recipe.favoriteCount ||
          recipe.favoritesCount ||
          (recipe.favorites ? recipe.favorites.length : 0) ||
          0;

        // Format date
        const dateAdded = recipe.createdAt
          ? new Date(recipe.createdAt).toLocaleDateString()
          : "N/A";

        // Get featured status based on recipe.isFeatured flag we added earlier
        const featuredStatus = recipe.isFeatured ? "Yes" : "No";

        doc
          .text(recipe.name || "Untitled Recipe", 50, y, {
            width: 240,
            ellipsis: true,
          })
          .text((recipe.viewCount || 0).toString(), 300, y)
          .text(favoriteCount.toString(), 360, y)
          .text(featuredStatus, 420, y)
          .text(dateAdded, 480, y);

        y += 20; // Match user report row height
      });

      // Show count of total recipes if some are not displayed
      if (recipes.length > 10) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#000000")
          .text(`... and ${recipes.length - 10} more recipes`, 50, y + 5);
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

    // Finalize and send PDF
    doc.end();
    docEnded = true; // Mark document as ended
    console.log("Recipe report generated successfully");
    return;
  } catch (error) {
    console.error("Error generating recipe report:", error);

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
        message: "Failed to generate recipe report",
        error: error.message,
      });
    }
  }
};

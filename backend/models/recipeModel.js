import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema(
  {
    sourceId: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    ingredients: [
      {
        type: String,
        required: true,
      },
    ],
    instructions: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    prepTime: {
      type: Number,
      required: true,
    },
    servings: {
      type: Number,
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
      default: null,
    },
    nutritionFacts: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      fiber: Number,
    },
    // Add trending tracking metrics
    viewCount: {
      type: Number,
      default: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
    },
    searchCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        lastViewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add a virtual for the id field to ensure consistent ID format
recipeSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Add a method to clean up old history entries (older than 2 days)
recipeSchema.methods.cleanupHistory = async function () {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  this.viewedBy = this.viewedBy.filter(
    (view) => view.lastViewedAt > twoDaysAgo
  );
  return this.save();
};

// Add indexes for trending calculations
recipeSchema.index({ viewCount: -1 });
recipeSchema.index({ favoriteCount: -1 });
recipeSchema.index({ searchCount: -1 });
recipeSchema.index({
  viewCount: -1,
  favoriteCount: -1,
  searchCount: -1,
});

const Recipe = mongoose.model("Recipe", recipeSchema);

export default Recipe;

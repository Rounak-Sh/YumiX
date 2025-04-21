import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipeData: {
      sourceId: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      image: String,
      ingredients: [String],
      instructions: String,
      prepTime: Number,
      servings: Number,
      source: {
        type: String,
        enum: ["spoonacular", "ai"],
        default: "spoonacular",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Drop existing indexes before creating new ones
favoriteSchema.pre("save", async function () {
  try {
    await mongoose.connection.collection("favorites").dropIndexes();
  } catch (error) {
    // Ignore error if no indexes exist
  }
});

// Add compound index on userId and sourceId to prevent duplicate favorites
favoriteSchema.index(
  { userId: 1, "recipeData.sourceId": 1 },
  {
    unique: true,
    background: true,
    name: "unique_user_recipe",
  }
);

const Favorite = mongoose.model("Favorite", favoriteSchema);

export default Favorite;

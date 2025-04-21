import mongoose from "mongoose";

const adminRecipeSchema = mongoose.Schema({
  sourceId: { type: Number, required: true },
  name: { type: String, required: true },
  ingredients: [String],
  instructions: String,
  image: String,
  prepTime: Number,
  servings: Number,
  isFeatured: { type: Boolean, default: false },
  videoId: String,
  createdAt: { type: Date, default: Date.now },
});

const AdminRecipe = mongoose.model("AdminRecipe", adminRecipeSchema);

export default AdminRecipe;

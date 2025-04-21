import express from "express"
import { generateRecipe, saveGeneratedRecipe } from "../controllers/aiRecipeController.js"
import { protect } from "../middleware/authMiddleware.js"
import { searchLimitMiddleware } from "../middleware/rateLimitMiddleware.js"

const router = express.Router()

// Route for generating recipes with AI
router.post("/generate", protect, searchLimitMiddleware, generateRecipe)

// Route for saving generated recipes
router.post("/save", protect, saveGeneratedRecipe)

export default router


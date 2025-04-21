import axios from "axios";

// API Key from environment variables only
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Base URL
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

/**
 * Generate content using Google Gemini AI
 * @param {string} prompt - The prompt to send to Gemini
 * @param {Object} options - Additional options for the request
 * @returns {Promise<Object>} The generated content
 */
export const generateWithGemini = async (prompt, options = {}) => {
  try {
    if (!GEMINI_API_KEY) {
      return {
        success: false,
        error:
          "Gemini API key is missing. Please set the GEMINI_API_KEY environment variable.",
        isAuthError: true,
      };
    }

    const response = await axios.post(
      `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1024,
          topP: options.topP || 0.95,
          topK: options.topK || 40,
        },
      }
    );

    // Extract the generated text
    const generatedText = response.data.candidates[0].content.parts[0].text;

    return {
      success: true,
      text: generatedText,
      usage: {
        promptTokens: response.data.promptFeedback?.tokenCount || 0,
        completionTokens: 0, // Gemini doesn't provide this directly
        totalTokens: response.data.promptFeedback?.tokenCount || 0,
      },
    };
  } catch (error) {
    console.error("Gemini API error:", error);

    // Check for rate limiting or quota errors
    if (error.response?.status === 429) {
      return {
        success: false,
        error: "Rate limit exceeded for Gemini API",
        isRateLimitError: true,
      };
    }

    // Check for invalid API key
    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        success: false,
        error: "Invalid or unauthorized Gemini API key",
        isAuthError: true,
      };
    }

    return {
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "Unknown error with Gemini API",
    };
  }
};

/**
 * Extract structured data from Gemini response
 * @param {string} text - The text response from Gemini
 * @returns {Object|null} Parsed JSON object or null if parsing fails
 */
export const extractStructuredData = (text) => {
  try {
    // Try to extract JSON from the response (handling potential markdown code blocks)
    const jsonMatch =
      text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```\n([\s\S]*?)\n```/) ||
      text.match(/{[\s\S]*?}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }

    // If no JSON found, try to extract it more aggressively
    const potentialJson = text.substring(
      text.indexOf("{"),
      text.lastIndexOf("}") + 1
    );

    return JSON.parse(potentialJson);
  } catch (error) {
    console.error(
      "Failed to extract structured data from Gemini response:",
      error
    );
    return null;
  }
};

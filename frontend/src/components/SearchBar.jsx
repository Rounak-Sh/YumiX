import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../context/ThemeContext";
import axiosInstance from "../config/axios";
import { searchFeaturedRecipes } from "../services/recipeService";

const SearchBar = ({ onRecipeClick }) => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounce search to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async () => {
    if (!query || query.trim() === "") return;

    try {
      setIsSearching(true);
      const searchResult = await searchFeaturedRecipes(query);
      console.log("Search result:", searchResult);

      if (
        searchResult.success &&
        ((searchResult.recipes && searchResult.recipes.length > 0) ||
          (searchResult.data && searchResult.data.length > 0))
      ) {
        // Use recipes array if available, otherwise use data array
        setSearchResults(searchResult.recipes || searchResult.data || []);
        setShowDropdown(true);
      } else if (query.toLowerCase().includes("featured")) {
        // Redirect to featured recipes page
        navigate("/featured-recipes");
        setShowDropdown(false);
      } else {
        // No results, redirect to search page
        console.log("No results, will redirect to search page on submit");
        setSearchResults([]);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowDropdown(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    // Navigate to search results on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    setShowDropdown(false);

    // Exact match for "featured" - redirect to featured recipes
    if (query.trim().toLowerCase() === "featured") {
      navigate("/featured-recipes");
      return;
    }

    // Check if query looks like ingredients (comma-separated items)
    if (query.includes(",") || query.split(" ").length > 3) {
      // This looks like ingredients list
      navigate(`/search-recipe?ingredients=${encodeURIComponent(query)}`);
    } else {
      // This looks like a recipe name
      navigate(`/search-recipe?query=${encodeURIComponent(query)}`);
    }

    setQuery("");
  };

  const handleResultClick = (recipe) => {
    setShowDropdown(false);
    setQuery("");

    // If onRecipeClick prop exists, call it with the recipe
    if (onRecipeClick && typeof onRecipeClick === "function") {
      onRecipeClick(recipe);
    } else {
      // Fallback to navigating to featured-recipes
      navigate(`/featured-recipes`);
    }
  };

  const redirectToSearch = () => {
    // Implement the logic to redirect to search page
    console.log("Redirecting to search page");
    navigate("/search-recipe");
    setShowDropdown(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-[320px] mx-auto">
      <div
        className={`flex items-center px-3 py-2 rounded-full ${
          isDarkMode
            ? "bg-[#1A3A5F] border border-[#FFCF50]/30"
            : "bg-[#F8F0E3] border-2 border-[#23486A]/60"
        }`}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes..."
          className={`w-full outline-none text-xs ${
            isDarkMode
              ? "bg-[#1A3A5F]/75 text-white"
              : "bg-[#F8F0E3] text-[#23486A]"
          }`}
        />
        <button
          onClick={handleSubmit}
          className={`ml-1 p-1 rounded-full ${
            isDarkMode
              ? "hover:bg-[#23486A] text-[#FFCF50]"
              : "hover:bg-[#23486A]/10 text-[#23486A]"
          }`}
          aria-label="Search">
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search results dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute z-40 w-full mt-1 rounded-md shadow-lg py-1 ${
            isDarkMode
              ? "bg-[#1A3A5F]/75 border border-[#FFCF50]/30"
              : "bg-white border-2 border-[#23486A]/30"
          }`}>
          <div
            className={`px-4 py-2 text-sm font-medium ${
              isDarkMode ? "text-[#FFCF50]/80" : "text-[#23486A]"
            }`}>
            {isSearching ? "Searching..." : "Results"}
          </div>

          {isSearching ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#FFCF50]"></div>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((recipe) => (
              <div
                key={recipe._id || recipe.id}
                onClick={() => handleResultClick(recipe)}
                className={`px-4 py-2 cursor-pointer ${
                  isDarkMode
                    ? "hover:bg-[#23486A] text-white"
                    : "hover:bg-[#F8F0E3] text-[#23486A]"
                }`}>
                <div className="flex items-center">
                  {recipe.image && (
                    <img
                      src={recipe.image}
                      alt={recipe.name}
                      className="w-10 h-10 object-cover rounded-md mr-3"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop";
                      }}
                    />
                  )}
                  <div>
                    <div className="font-medium">{recipe.name}</div>
                    <div
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}>
                      {recipe.prepTime || "30 min"} | {recipe.servings || "4"}{" "}
                      servings
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              className={`px-4 py-2 text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}>
              No recipes found matching "{query}"
            </div>
          )}

          <div
            onClick={handleSubmit}
            className={`px-4 py-2 text-sm cursor-pointer flex items-center ${
              isDarkMode
                ? "text-[#FFCF50] hover:bg-[#23486A]"
                : "text-[#23486A] hover:bg-[#F8F0E3]"
            }`}>
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            See all results for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;

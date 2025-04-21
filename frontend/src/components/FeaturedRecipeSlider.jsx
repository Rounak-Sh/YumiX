import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import { ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

// Add a small CSS block for the custom perspective property
const carouselStyles = {
  perspective: "1500px",
};

const FeaturedRecipeSlider = ({
  recipes = [],
  loading = false,
  onViewRecipe,
  onToggleFavorite,
  isFavorite,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slidePosition, setSlidePosition] = useState(0);
  const sliderRef = useRef(null);
  const trackRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimestampRef = useRef(0);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Prepare recipes array to display (no limit)
  const limitedRecipes = recipes;

  // For continuous infinite scrolling, duplicate the recipes
  const extendedRecipes = [
    ...limitedRecipes,
    ...limitedRecipes,
    ...limitedRecipes,
  ];

  // Calculate values for the track animation
  const cardWidth = 340; // Increased size from 300
  const cardGap = 20; // Gap between cards
  const cardUnit = cardWidth + cardGap; // Total width of one card including gap
  const totalWidth = extendedRecipes.length * cardUnit;

  // Base speed for animation (pixels per second)
  const baseSpeed = 35;

  // Continuous animation with requestAnimationFrame
  const animateSlider = (timestamp) => {
    if (!trackRef.current || isHovering) return;

    if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
    const elapsed = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    // Calculate movement based on elapsed time and speed (only move if not hovering)
    const pixelsToMove = (baseSpeed * elapsed) / 1000;

    // Update slide position
    const newPosition = slidePosition - pixelsToMove;
    setSlidePosition(newPosition);

    // Apply the transform directly without any extra positioning
    trackRef.current.style.transform = `translateX(${newPosition}px)`;

    // Handle infinite scrolling - reset position when we've gone through first set
    if (newPosition <= -limitedRecipes.length * cardUnit) {
      // Reset to start of second set (seamless)
      const resetPosition = newPosition + limitedRecipes.length * cardUnit;
      setSlidePosition(resetPosition);
      trackRef.current.style.transform = `translateX(${resetPosition}px)`;
    }

    // Update active index based on position
    const activeIdx =
      Math.floor(Math.abs(newPosition) / cardUnit) % limitedRecipes.length;
    if (activeIdx !== activeIndex) {
      setActiveIndex(activeIdx);
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(animateSlider);
  };

  // Start/stop animation based on component lifecycle and hover state
  useEffect(() => {
    if (limitedRecipes.length <= 1 || isDragging) return;

    // Only animate if not hovering
    if (!isHovering) {
      animationRef.current = requestAnimationFrame(animateSlider);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [limitedRecipes.length, isDragging, isHovering, slidePosition]);

  // Instead of handling hover on the entire slider, we'll handle it per card
  const handleCardHover = (hovering) => {
    setIsHovering(hovering);

    // When leaving hover state, restart the animation
    if (!hovering && !animationRef.current) {
      lastTimestampRef.current = 0;
      animationRef.current = requestAnimationFrame(animateSlider);
    }
  };

  const handleManualSlide = (direction) => {
    if (trackRef.current && !isDragging) {
      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Jump by one card in the specified direction
      const newPosition = slidePosition + cardUnit * direction;
      setSlidePosition(newPosition);
      trackRef.current.style.transform = `translateX(${newPosition}px)`;

      // Update active index based on new position
      const activeIdx =
        Math.floor(Math.abs(newPosition) / cardUnit) % limitedRecipes.length;
      setActiveIndex(activeIdx);

      // Only restart animation if not hovering
      if (!isHovering) {
        lastTimestampRef.current = 0;
        animationRef.current = requestAnimationFrame(animateSlider);
      }
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleDrag = (e, info) => {
    if (trackRef.current && isDragging) {
      // Calculate new position based on drag
      const newPosition = slidePosition + info.delta.x;
      setSlidePosition(newPosition);
      trackRef.current.style.transform = `translateX(${newPosition}px)`;
    }
  };

  const handleDragEnd = (e, info) => {
    setIsDragging(false);

    // Determine if we should snap to the next/prev card
    const remainder = slidePosition % cardUnit;
    let newPosition = slidePosition;

    if (Math.abs(remainder) > cardUnit / 2) {
      // Snap to next card
      newPosition =
        slidePosition - (cardUnit - Math.abs(remainder)) * Math.sign(remainder);
    } else {
      // Snap to current card
      newPosition = slidePosition - remainder;
    }

    setSlidePosition(newPosition);
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${newPosition}px)`;
    }

    // Only restart animation if not hovering
    if (!isHovering) {
      lastTimestampRef.current = 0;
      animationRef.current = requestAnimationFrame(animateSlider);
    }
  };

  const viewAllFeaturedRecipes = () => {
    navigate("/featured-recipes");
  };

  // Framer Motion variants
  const buttonVariants = {
    initial: {
      opacity: 0.8,
      scale: 0.95,
    },
    hover: {
      opacity: 1,
      scale: 1.05,
      boxShadow: "0px 8px 20px rgba(0,0,0,0.2)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
    tap: {
      scale: 0.92,
    },
  };

  // Image hover animation
  const imageVariants = {
    hover: {
      scale: 1.08,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-10">
        <motion.div
          className="rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"
          animate={{
            rotate: 360,
            boxShadow: [
              "0px 0px 0px rgba(255,207,80,0.0)",
              "0px 0px 8px rgba(255,207,80,0.5)",
              "0px 0px 0px rgba(255,207,80,0.0)",
            ],
          }}
          transition={{
            rotate: {
              repeat: Infinity,
              duration: 0.5,
              ease: "linear",
            },
            boxShadow: {
              repeat: Infinity,
              duration: 1,
              ease: "easeInOut",
            },
          }}
        />
      </div>
    );
  }

  if (limitedRecipes.length === 0) {
    return (
      <motion.div
        className="bg-white/10 backdrop-blur-sm rounded-xl p-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}>
        <p
          className={`text-lg ${isDarkMode ? "text-white" : "text-[#23486A]"}`}>
          No featured recipes available at the moment.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative overflow-hidden py-2 px-0">
      {/* Container box with border and background for the slider */}
      <div
        className={`${
          isDarkMode ? "bg-[#C48229]/30" : "bg-[#F8F0E3]/75"
        } rounded-xl border ${
          isDarkMode ? "border-[#FFCF50]/30" : "border-[#C87B30]/30"
        } shadow-inner overflow-hidden mx-0`}>
        {/* Section title - adjusted padding to match content area */}
        <div className="flex justify-between items-center p-3">
          <h2
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white drop-shadow-sm" : "text-[#C87B30]"
            }`}>
            Featured Recipes
          </h2>
          <button
            onClick={viewAllFeaturedRecipes}
            className={`${
              isDarkMode
                ? "text-white hover:text-[#FFCF50]"
                : "text-[#C87B30] hover:text-[#a15a1c]"
            } transition-colors flex items-center text-sm`}>
            View All
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>

        <div
          ref={sliderRef}
          className="relative w-full mx-auto overflow-hidden"
          onMouseEnter={() => {
            // Just stop the animation exactly where it is with no repositioning
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = null;
            }
            // Freeze the slider at exactly the current position
            setIsHovering(true);

            // Calculate the active index based on current position
            if (trackRef.current) {
              const activeIdx =
                Math.floor(Math.abs(slidePosition) / cardUnit) %
                limitedRecipes.length;
              setActiveIndex(activeIdx);
            }
          }}
          onMouseLeave={() => {
            // Resume animation from the current position - no repositioning
            setIsHovering(false);
            if (!animationRef.current) {
              lastTimestampRef.current = 0;
              animationRef.current = requestAnimationFrame(animateSlider);
            }
          }}
          style={{ padding: "15px 3px" }}>
          {/* Track (the sliding container) */}
          <motion.div
            ref={trackRef}
            className="flex gap-5 pointer-events-none" // Prevent gaps from capturing mouse events
            style={{
              transform: "translateX(0px)",
              width: `${totalWidth}px`,
            }}
            drag="x"
            dragConstraints={sliderRef}
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}>
            {/* Cards */}
            {extendedRecipes.map((recipe, index) => {
              // Calculate card states for visual effects
              const recipeIndex = index % limitedRecipes.length;
              const isActive = activeIndex === recipeIndex;

              return (
                <motion.div
                  key={`${recipe._id || index}-${index}`}
                  className="recipe-card flex-shrink-0"
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardWidth}px`, // Square shape - same as width
                    transformOrigin: "center center",
                    willChange: "transform",
                    filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.1))",
                    opacity: 1, // No fading, all cards fully visible
                    zIndex: isActive ? 30 : 10,
                    pointerEvents: "auto", // Ensure hover works properly
                  }}
                  onMouseEnter={() => {
                    // Simply freeze in place - no repositioning
                    if (animationRef.current) {
                      cancelAnimationFrame(animationRef.current);
                      animationRef.current = null;
                    }

                    setIsHovering(true);

                    // Update the active index to this card
                    const cardIndex = recipeIndex;
                    setActiveIndex(cardIndex);
                  }}
                  whileHover={{
                    filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.18))",
                    transition: { type: "spring", stiffness: 300 },
                    scale: 1.02, // Subtle scale effect on hover
                  }}>
                  <div
                    className={`bg-white rounded-2xl overflow-hidden h-full transition-all duration-300 border ${
                      isDarkMode ? "border-gray-200" : "border-amber-200"
                    } ${
                      isActive
                        ? `ring-2 ${
                            isDarkMode
                              ? "ring-[#FFCF50]/50"
                              : "ring-[#C87B30]/50"
                          }`
                        : ""
                    }`}>
                    <div className="h-[50%] overflow-hidden relative">
                      <motion.img
                        src={
                          recipe.image ||
                          "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop"
                        }
                        alt={recipe.name}
                        className="w-full h-full object-cover object-center"
                        variants={imageVariants}
                        whileHover="hover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=1776&auto=format&fit=crop";
                        }}
                      />
                      <motion.button
                        onClick={(e) => onToggleFavorite(e, recipe)}
                        className="absolute top-3 right-3 p-2 bg-white/95 rounded-full shadow-md z-10 border border-gray-100"
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap">
                        {isFavorite(recipe._id) ? (
                          <HeartSolid className="w-5 h-5 text-red-500" />
                        ) : (
                          <HeartOutline className="w-5 h-5 text-gray-600 hover:text-red-500" />
                        )}
                      </motion.button>
                    </div>
                    <div className="p-4 flex flex-col h-[50%]">
                      <h3
                        className={`font-semibold text-lg mb-1 ${
                          isDarkMode ? "text-[#23486A]" : "text-[#C87B30]"
                        }`}>
                        {recipe.name || "Delicious Recipe"}
                      </h3>
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1 inline-block" />
                          {recipe.prepTime
                            ? typeof recipe.prepTime === "string" &&
                              recipe.prepTime.includes("min")
                              ? recipe.prepTime
                              : `${recipe.prepTime} min`
                            : "30 min"}
                        </span>
                        <span className="flex items-center">
                          <UserGroupIcon className="w-4 h-4 mr-1 inline-block" />
                          {recipe.servings || "4"} servings
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2 line-clamp-2 flex-grow">
                        {recipe.description
                          ? recipe.description
                          : recipe.summary ||
                            "A delicious recipe for your enjoyment."}
                      </div>
                      <button
                        onClick={() => onViewRecipe(recipe)}
                        className={`mt-auto w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center ${
                          isDarkMode
                            ? "bg-[#1A3A5F] text-white hover:bg-[#0d2b4a]"
                            : "bg-[#C87B30] text-white hover:bg-[#a15a1c]"
                        } transition-all duration-200`}>
                        View Recipe
                        <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedRecipeSlider;

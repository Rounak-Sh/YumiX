/**
 * Component Exports
 *
 * This file provides a central export point for commonly used components,
 * enabling cleaner imports throughout the application.
 */

// Auth components
export { default as AuthCheck } from "./AuthCheck";
export { default as AuthModal } from "./AuthModal";
export { default as GoogleCallback } from "./GoogleCallback";

// Recipe components
export { default as UnifiedRecipeModal } from "./UnifiedRecipeModal";
export { default as FavoritesLimitAlert } from "./FavoritesLimitAlert";
export { default as RecipeCard } from "./RecipeCard";
export { default as FeaturedRecipeSlider } from "./FeaturedRecipeSlider";
// Note: FeaturedRecipes has been moved to pages directory as FeaturedRecipesPage

// Common UI components
export { default as LoadingSpinner } from "./LoadingSpinner";
export { default as Navbar } from "./Navbar";
export { default as Sidebar } from "./Sidebar";
export { default as Footer } from "./Footer";
export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as InactivityWarning } from "./InactivityWarning";
export { default as NetworkStatus } from "./NetworkStatus";
export { default as ScrollToTop } from "./ScrollToTop";
export { default as EmptyState } from "./EmptyState";
export { default as ErrorState } from "./ErrorState";

// System components
export { default as SubscriptionSynchronizerFix } from "./SubscriptionSynchronizerFix";
export { default as PaymentStatusRedirect } from "./PaymentStatusRedirect";

// Add this to the exports in the components index file:
export { default as FavoritesDebugger } from "./FavoritesDebugger";
export { default as ProfileOtpVerification } from "./ProfileOtpVerification";

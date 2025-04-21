import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function Subscriptions() {
  const { theme } = useOutletContext();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "30",
    features: [""],
    maxSearchesPerDay: "10",
  });

  useEffect(() => {
    loadSubscriptionPlans();
  }, []);

  const loadSubscriptionPlans = async () => {
    try {
      const response = await adminApi.getAllPlans();
      const plans = response.data.data;

      // If no plans exist, initialize default plans
      if (plans.length === 0) {
        await adminApi.initializeDefaultPlans();
        const newResponse = await adminApi.getAllPlans();
        setPlans(newResponse.data.data);
      } else {
        setPlans(plans);
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error);
      showToast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.name || !formData.price || !formData.duration) {
        showToast.error("Please fill in all required fields");
        return;
      }

      // Validate features
      if (!formData.features || formData.features.length === 0) {
        showToast.error("At least one feature is required");
        return;
      }

      const data = {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        features: formData.features.filter((f) => f.trim()),
        maxSearchesPerDay: getMaxSearches(formData.features),
        isActive: true,
      };

      if (editingPlan) {
        // For editing, keep the existing order
        data.order = editingPlan.order;
      } else {
        // For new plans, find the next available order number
        const existingOrders = plans
          .map((plan) => plan.order)
          .sort((a, b) => a - b);
        let nextOrder = 1;
        while (existingOrders.includes(nextOrder)) {
          nextOrder++;
        }
        data.order = nextOrder;
      }

      // Log the data being sent
      console.log("Sending plan data:", data);

      if (editingPlan) {
        await adminApi.updatePlan(editingPlan._id, data);
        showToast.success("Plan updated successfully");
      } else if (plans.length < 3) {
        const response = await adminApi.createPlan(data);
        console.log("Server response:", response);
        showToast.success("Plan created successfully");
      } else {
        showToast.error("Maximum 3 plans allowed");
        return;
      }

      setShowModal(false);
      setEditingPlan(null);
      resetForm();
      loadSubscriptionPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      console.error("Error response:", error.response?.data);
      showToast.error(
        error.response?.data?.message || "Failed to save subscription plan"
      );
    }
  };

  // Helper function to extract max searches from features
  const getMaxSearches = (features) => {
    const searchFeature = features.find((f) =>
      f.toLowerCase().includes("recipe searches")
    );
    if (!searchFeature) return 10; // default value
    if (searchFeature.toLowerCase().includes("unlimited")) return 999999; // use a large number for unlimited
    const matches = searchFeature.match(/\d+/);
    return matches ? parseInt(matches[0]) : 10;
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      duration: plan.duration.toString(),
      features: [...plan.features],
    });
    setShowModal(true);
  };

  const handleDelete = async (planId) => {
    setPlanToDelete(planId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminApi.deletePlan(planToDelete);
      showToast.success("Plan deleted successfully");
      loadSubscriptionPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      showToast.error(error.response?.data?.message || "Failed to delete plan");
    } finally {
      setShowDeleteModal(false);
      setPlanToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      duration: "30",
      features: [""],
      maxSearchesPerDay: "10",
    });
  };

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }));
  };

  const removeFeature = (index) => {
    if (formData.features.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const updateFeature = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  if (loading) {
    return <Loader type="grid" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>
            Subscription Plans
          </h1>
          <p className={`mt-1 ${theme.textSecondary}`}>
            Manage your subscription plans
          </p>
        </div>
        {plans.length < 3 && (
          <button
            onClick={() => {
              setEditingPlan(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90">
            <PlusIcon className="h-5 w-5" />
            <span>Add Plan</span>
          </button>
        )}
      </div>

      {/* Plans Grid - Vertical Layout */}
      <div className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`relative h-full rounded-2xl ${
                plan.name === "Premium Plan"
                  ? "bg-black text-white border-2 border-white"
                  : "bg-white text-black border border-gray-200"
              } p-8 transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
              <div className="flex flex-col h-full">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">₹{plan.price}</span>
                    <span className="text-sm opacity-75 ml-2">
                      /{plan.duration} days
                    </span>
                  </div>
                </div>

                <div className="flex-grow">
                  <div className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div
                          className={`rounded-full ${
                            plan.name === "Premium Plan"
                              ? "bg-white/20"
                              : "bg-black/5"
                          } p-1.5 mt-0.5`}>
                          <CheckIcon
                            className={`h-4 w-4 ${
                              plan.name === "Premium Plan"
                                ? "text-white"
                                : "text-black"
                            }`}
                          />
                        </div>
                        <span className="text-sm leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className={`flex-1 rounded-lg py-3 ${
                      plan.name === "Premium Plan"
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-black text-white hover:bg-black/90"
                    } transition-colors`}>
                    Edit Plan
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id)}
                    className={`rounded-lg p-3 ${
                      plan.name === "Premium Plan"
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-black/5 hover:bg-black/10"
                    }`}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-md rounded-xl ${theme.card} p-6`}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${theme.text}`}>
                Confirm Deletion
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPlanToDelete(null);
                }}
                className="rounded-lg p-2 hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className={`mb-6 ${theme.textSecondary}`}>
              Are you sure you want to delete this subscription plan? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPlanToDelete(null);
                }}
                className={`rounded-lg px-4 py-2 ${theme.hover} ${theme.text}`}>
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600">
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {editingPlan ? "Edit Plan" : "Add New Plan"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-gray-600 dark:text-gray-400">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent p-2 text-black dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-600 dark:text-gray-400">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent p-2 text-black dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-600 dark:text-gray-400">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent p-2 text-black dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-600 dark:text-gray-400">
                  Features
                </label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent p-2 text-black dark:text-white"
                        placeholder="Enter feature"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900">
                        <TrashIcon className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    className="flex items-center gap-2 text-sm text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400">
                    <PlusIcon className="h-4 w-4" />
                    Add Feature
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 transition-colors">
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

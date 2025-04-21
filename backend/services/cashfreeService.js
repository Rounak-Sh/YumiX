import axios from "axios";
import crypto from "crypto";

/**
 * CashfreeService - Handles integration with Cashfree payment gateway
 */
class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    this.apiUrl =
      process.env.CASHFREE_API_URL || "https://sandbox.cashfree.com/pg/orders";
    this.isProduction = process.env.NODE_ENV === "production";
    this.apiVersion = "2022-09-01";

    // Log initialization and environment variables
    console.log("CashfreeService initialized with:");
    console.log("- APP ID:", this.appId ? "Set" : "NOT SET");
    console.log("- SECRET KEY:", this.secretKey ? "Set" : "NOT SET");
    console.log("- FRONTEND_URL:", process.env.FRONTEND_URL || "NOT SET");
    console.log("- BACKEND_URL:", process.env.BACKEND_URL || "NOT SET");
    console.log("- API URL:", this.apiUrl);
    console.log(
      "- Environment:",
      this.isProduction ? "production" : "development"
    );

    // Add validation checks
    if (!this.appId || !this.secretKey) {
      console.error(
        "CRITICAL ERROR: Cashfree credentials are not properly configured!"
      );
      console.error(
        "Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in your .env file"
      );
    }
  }

  /**
   * Creates a new payment order
   * @param {Object} orderDetails - Details of the order
   * @returns {Promise<Object>} Order creation result
   */
  async createOrder(orderDetails) {
    try {
      // Validate required credentials first
      if (!this.appId || !this.secretKey) {
        return {
          success: false,
          error: "Payment gateway credentials are not configured correctly.",
        };
      }

      // Generate a unique order ID
      const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Ensure we have a valid phone number (Cashfree requires it)
      const customerPhone =
        orderDetails.customerPhone && orderDetails.customerPhone.trim()
          ? orderDetails.customerPhone.trim()
          : "9999999999"; // Default fallback phone number

      // Get frontend and backend URLs with appropriate fallbacks
      const frontendUrl = "https://yumix-users.vercel.app"; // Always use the deployed URL
      const backendUrl =
        process.env.BACKEND_URL || "https://yumix-backend.onrender.com";

      // Create order payload with all required fields
      const orderData = {
        order_id: orderId,
        order_amount: orderDetails.amount,
        order_currency: orderDetails.currency || "INR",
        order_note: orderDetails.note || "Payment for YuMix subscription",
        customer_details: {
          customer_id: orderDetails.userId,
          customer_name: orderDetails.customerName || "YuMix User",
          customer_email: orderDetails.customerEmail || "user@example.com",
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: `${frontendUrl}/payment-status?order_id={order_id}`,
          notify_url: `${backendUrl}/api/subscriptions/webhook`,
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      };

      console.log("Return URL for order:", orderData.order_meta.return_url);
      console.log("Notify URL for order:", orderData.order_meta.notify_url);

      console.log(
        "Creating Cashfree order:",
        JSON.stringify(orderData, null, 2)
      );

      // Make API call to Cashfree to create order
      const response = await axios({
        method: "post",
        url: this.apiUrl,
        headers: {
          "Content-Type": "application/json",
          "x-api-version": this.apiVersion,
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
        data: orderData,
      });

      console.log("Cashfree order created successfully:", response.data);

      // Build the payment URL using the session ID from the response
      const paymentUrl = response.data.payment_session_id
        ? `https://sandbox.cashfree.com/pg/view/order/${response.data.order_id}?payment_session_id=${response.data.payment_session_id}`
        : null;

      return {
        success: true,
        orderId: response.data.order_id,
        orderToken: response.data.order_token,
        orderStatus: response.data.order_status,
        paymentLink: paymentUrl,
        paymentSessionId: response.data.payment_session_id,
      };
    } catch (error) {
      console.error("Error creating Cashfree order:", error);
      console.error(
        "Error details:",
        JSON.stringify(
          {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers
                ? {
                    "Content-Type": error.config.headers["Content-Type"],
                    "x-api-version": error.config.headers["x-api-version"],
                  }
                : "No headers",
            },
          },
          null,
          2
        )
      );

      // Parse and return structured error information
      let errorResponse = {
        success: false,
        error: error.message,
      };

      // If we have response data from Cashfree with error details, include it
      if (error.response && error.response.data) {
        errorResponse.errorDetails = error.response.data;

        // For frontend-friendly error message
        if (error.response.data.message) {
          errorResponse.error = error.response.data.message;
        }
      }

      return errorResponse;
    }
  }

  /**
   * Creates a payment link (alternative to direct order creation)
   * @param {Object} linkDetails - Details for the payment link
   * @returns {Promise<Object>} Payment link creation result
   */
  async createPaymentLink(linkDetails) {
    try {
      // Validate required credentials first
      if (!this.appId || !this.secretKey) {
        return {
          success: false,
          error: "Payment gateway credentials are not configured correctly.",
        };
      }

      const linkId = `link_${Date.now()}`;

      // Handle missing customer details with fallbacks
      const customerName = linkDetails.customerName || "YuMix User";
      const customerEmail = linkDetails.customerEmail || "user@example.com";
      // Cashfree requires a phone number - provide a fallback if missing
      const customerPhone = linkDetails.customerPhone || "9999999999";

      // Get frontend and backend URLs with appropriate fallbacks
      const frontendUrl = "https://yumix-users.vercel.app"; // Always use the deployed URL
      const backendUrl =
        process.env.BACKEND_URL || "https://yumix-backend.onrender.com";

      const linkData = {
        link_id: linkId,
        link_amount: linkDetails.amount,
        link_currency: linkDetails.currency || "INR",
        link_purpose: linkDetails.note || "Payment for YuMix subscription",
        customer_details: {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        link_notify: {
          send_sms: false,
          send_email: false,
        },
        link_meta: {
          return_url: `${frontendUrl}/payment-status?link_id={link_id}`,
          notify_url: `${backendUrl}/api/subscriptions/webhook`,
        },
        link_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      console.log(
        "Return URL for payment link:",
        linkData.link_meta.return_url
      );
      console.log(
        "Notify URL for payment link:",
        linkData.link_meta.notify_url
      );

      console.log(
        "Creating Cashfree payment link:",
        JSON.stringify(linkData, null, 2)
      );

      const response = await axios({
        method: "post",
        url: "https://sandbox.cashfree.com/pg/links",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": this.apiVersion,
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
        data: linkData,
      });

      console.log("Cashfree payment link created successfully:", response.data);

      return {
        success: true,
        paymentLink: response.data.link_url,
        linkId: response.data.link_id,
        status: response.data.link_status,
      };
    } catch (error) {
      console.error("Error creating Cashfree payment link:", error);
      console.error(
        "Payment link error details:",
        JSON.stringify(
          {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              headers: error.config?.headers
                ? {
                    "Content-Type": error.config.headers["Content-Type"],
                    "x-api-version": error.config.headers["x-api-version"],
                  }
                : "No headers",
            },
          },
          null,
          2
        )
      );

      // Format error message for better debugging
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || error.message;
        console.error("Cashfree API error details:", error.response.data);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verifies the webhook signature from Cashfree
   * @param {string} postData - JSON string of the webhook payload
   * @param {string} signatureHeader - x-webhook-signature header value
   * @returns {boolean} Whether the signature is valid
   */
  verifyWebhookSignature(postData, signatureHeader) {
    try {
      // Compute HMAC with SHA256
      const computedSignature = crypto
        .createHmac("sha256", this.secretKey)
        .update(postData)
        .digest("base64");

      return signatureHeader === computedSignature;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false;
    }
  }

  /**
   * Gets the payment status from Cashfree
   * @param {string} orderId - The order ID to check
   * @returns {Promise<Object>} Payment status result
   */
  async getPaymentStatus(orderId) {
    try {
      const response = await axios({
        method: "get",
        url: `${this.apiUrl}/${orderId}`,
        headers: {
          "Content-Type": "application/json",
          "x-api-version": this.apiVersion,
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
      });

      // Extract payment status
      const order = response.data;
      const status = order.order_status;

      return {
        success: true,
        status: status === "PAID" ? "PAID" : status,
        data: order,
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Retrieves the status of a payment link
   * @param {string} linkId - The payment link ID
   * @returns {Promise<Object>} Payment link status result
   */
  async getPaymentLinkStatus(linkId) {
    try {
      const response = await axios({
        method: "get",
        url: `https://sandbox.cashfree.com/pg/links/${linkId}`,
        headers: {
          "Content-Type": "application/json",
          "x-api-version": this.apiVersion,
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
        },
      });

      // Extract payment status
      const linkData = response.data;
      const status = linkData.link_status;

      // Map Cashfree status to our status format
      // ACTIVE = not paid yet, PAID = successful payment
      const mappedStatus =
        status === "PAID" ? "PAID" : status === "ACTIVE" ? "PENDING" : status;

      return {
        success: true,
        status: mappedStatus,
        data: linkData,
      };
    } catch (error) {
      console.error("Error getting payment link status:", error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}

export default CashfreeService;

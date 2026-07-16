const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:7700";

/**
 * Common fetch utility helper
 */
async function apiRequest(
  endpoint,
  method = "GET",
  body = null,
  token = null
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   AUTHENTICATION REQUESTS
========================================================= */

export const loginTeam = (teamName) =>
  apiRequest("/api/auth/login", "POST", { teamName });

export const logoutTeam = (token) =>
  apiRequest("/api/auth/logout", "POST", null, token);

export const getMySession = (token) =>
  apiRequest("/api/auth/me", "GET", null, token);


/* =========================================================
   ADMIN REQUESTS
========================================================= */

export const loginAdmin = (adminKey) =>
  apiRequest("/api/admin/login", "POST", { adminKey });

export const verifyAdmin = (token) =>
  apiRequest("/api/admin/verify", "GET", null, token);

export const fetchFoodItems = () =>
  apiRequest("/api/admin/food", "GET");

export const deleteFoodItem = (id, token) =>
  apiRequest(`/api/admin/food/${id}`, "DELETE", null, token);


/* =========================================================
   ADMIN FOOD ITEM UPLOAD
========================================================= */

export async function uploadFoodItem(formData, token) {
  const response = await fetch(`${API_BASE_URL}/api/admin/food`, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
    },

    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Food item upload failed with status ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   ORDER REQUESTS
========================================================= */

export const placeOrder = (
  items,
  token,
  transactionId = null,
  paymentScreenshot = null
) => {
  const body = {
    items,
  };

  if (transactionId) {
    body.transactionId = transactionId;
  }

  if (paymentScreenshot) {
    body.paymentScreenshot = paymentScreenshot;
  }

  return apiRequest("/api/orders", "POST", body, token);
};


export const fetchOrders = (token) =>
  apiRequest("/api/orders", "GET", null, token);


/* =========================================================
   ADMIN ORDER MANAGEMENT
========================================================= */

export const adminFetchOrders = (token) =>
  apiRequest("/api/admin/orders", "GET", null, token);


export const adminUpdateOrderStatus = (
  id,
  status,
  token
) =>
  apiRequest(
    `/api/admin/orders/${id}`,
    "PUT",
    { status },
    token
  );


/* =========================================================
   PAYMENT CONFIGURATION
========================================================= */

export const fetchPaymentConfig = () =>
  apiRequest("/api/payment/config", "GET");


export async function updatePaymentConfig(formData, token) {
  const response = await fetch(
    `${API_BASE_URL}/api/payment/config`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Payment setting update failed: ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   PAYMENT SCREENSHOT UPLOAD
========================================================= */

export async function uploadPaymentScreenshot(file, token) {
  const formData = new FormData();

  formData.append("screenshot", file);

  const response = await fetch(
    `${API_BASE_URL}/api/payment/upload-screenshot`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Screenshot upload failed: ${response.status}`
    );
  }

  return data;
}
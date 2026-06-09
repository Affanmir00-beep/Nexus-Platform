# Nexus Platform – Deployment Guide

This guide provides step-by-step instructions on deploying the Nexus full-stack application.

---

## 🖥️ Backend Deployment (Vercel Serverless)

The backend Express app is now configured and deployed on Vercel as a Serverless function.

### 1. Setup Configuration
A [vercel.json](file:///c:/Users/AFFAN/Desktop/NEXUS/backend/vercel.json) was added to the `backend/` directory to handle incoming requests and route them to `server.js` using `@vercel/node`.
The `server.js` file now exports the HTTP listener:
```javascript
module.exports = server;
```

### 2. Live Backend URL
- **Production URL**: `https://backend-pi-one-71.vercel.app`
- **Health Check Endpoint**: `https://backend-pi-one-71.vercel.app/api/health`

### 3. Add Environment Variables on Vercel Dashboard
Ensure the following variables are configured under your Vercel Project settings for the backend:
- `MONGO_URI`: Your MongoDB Connection String.
- `JWT_SECRET`: A secure random secret key string.
- `STRIPE_SECRET_KEY`: Your real Stripe secret key (e.g., `sk_test_...`) or `sk_test_mock_key_for_now` for sandbox.
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (e.g., `pk_test_...`).
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name.
- `CLOUDINARY_API_KEY`: Your Cloudinary API Key.
- `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret.

---

## 🎨 Frontend Deployment (Vercel)

The frontend is deployed on Vercel.

### 1. Live Frontend URL
- **Production URL**: `https://frontend-sigma-ten-33.vercel.app`

### 2. Configure API Base URL
In the frontend Vercel Project settings, ensure the following Environment Variable is added:
- `VITE_API_URL`: `https://backend-pi-one-71.vercel.app/api`

Then redeploy the frontend to apply the variable.

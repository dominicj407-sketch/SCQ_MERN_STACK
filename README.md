# FST-Project
Developing a Project for Queue Management in Hospitals

## Free full-stack deployment

This repo is configured to deploy as one Render free web service. The Express backend serves the built Vite React frontend in production, so the browser calls the API on the same origin.

### Required production environment variables

- `MONGO_URI`: MongoDB Atlas connection string.
- `JWT_ACCESS_SECRET`: long random secret. Render can generate this from `render.yaml`.
- `JWT_REFRESH_SECRET`: long random secret. Render can generate this from `render.yaml`.

### Optional environment variables

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: required only for Google sign-in.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`: required only for live Razorpay order creation.
- `EMAIL_USER`, `EMAIL_PASS`: required only for Gmail email sending.

For Google sign-in, add this Authorized redirect URI in the Google Cloud OAuth client:

`https://your-render-service.onrender.com/auth/google/callback`

### Render deployment

1. Create a free MongoDB Atlas cluster and copy its connection string.
2. Push this repo to GitHub.
3. In Render, create a new Blueprint from the repo. Render will read `render.yaml`.
4. Set `MONGO_URI` when Render asks for synced environment variables.
5. Deploy. The app will build with `npm run render-build` and start with `npm start`.

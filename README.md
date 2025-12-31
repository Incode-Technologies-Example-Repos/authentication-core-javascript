# Face Authentication Validation Example
This project demonstrates a secure face authentication flow using Incode's WebSDK with proper validation and session management. The application implements:

- **User hint input** for authentication (customer ID, email, or phone)
- **Face authentication** using Incode's renderAuthFace SDK
- **Session management** with IndexedDB to prevent reuse
- **Backend validation** to verify authentication integrity by:
  - Matching candidate ID from the SDK with identity ID from the score API
  - Validating overall authentication status
  - Preventing token tampering and session replay attacks
  - Marking sessions as used to prevent reuse

This example showcases best practices for implementing face authentication in a web application with proper security measures.

# Requirements
Vite requires Node.js version 14.18+, 16+. some templates require a higher Node.js version to work, please upgrade if your package manager warns about it.

# Install
Run `npm install`
# Config
Copy `.env.example` to `.env.local` and add your local values
```
VITE_API_URL=https://demo-api.incodesmile.com/0
VITE_SDK_URL=https://sdk.incode.com/sdk/onBoarding-1.80.1.js

# HERE ONLY FOR DEMO PURPOSES, THE APIKEY AND THE FLOW_ID SHOULD NEVER BE IN THE FRONTEND.
VITE_FAKE_BACKEND_APIURL=https://demo-api.incodesmile.com
VITE_FAKE_BACKEND_APIKEY=
VITE_FAKE_BACKEND_FLOW_ID=
```
Remember the Flow holds the backend counter part of the process, some configurations there might affect the behavior of the WebSDK here.

# Fake Backend Server
Starting and finishing the session must be done in the backend. To simplify development, this
sample includes a `fake_backend.js` file that handles backend operations in the frontend. 

**Important:** Replace this with a proper backend for production. The API key should NEVER be exposed in the frontend.

## Key Backend Functions

- `fakeBackendStart()` - Creates a new session and stores it in IndexedDB with `used: false`
- `fakeBackendFinish()` - Retrieves the finish status from the API
- `fakeBackendGetScore()` - Gets the authentication score from the API
- `fakeBackendValidateAuthentication()` - Validates the authentication by:
  - Checking if the session exists and hasn't been used
  - Verifying the token matches the stored token
  - Comparing candidate ID with identity ID from the score
  - Ensuring overall status is "OK"
  - Marking the session as used to prevent reuse

# Run
Vite is configured to serve the project using https and and expose him self, so you can easily test with your mobile phone on the local network.

run `npm run dev`

A new server will be exposed, the data will be in the terminal

# Build
run `npm run build`

A new build will be created in `/dist` you can serve that build everywhere just remember to serve with https.

# Testing especific versions of the webSDK locally
You can save the specific version needed under `/public` and change the `VITE_SDK_URL` variable on `.env.local` to something like:

```
VITE_SDK_URL=/name-of-the-js-file.js
```


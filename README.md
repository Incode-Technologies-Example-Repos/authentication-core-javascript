# Face Authentication Validation Example
This project demonstrates a secure face authentication flow using Incode's WebSDK with proper validation and session management. The application implements:

- **User hint input** for authentication (customerId, email, or phone)
- **Face authentication** using Incode's renderAuthFace SDK
- **Session management** with IndexedDB to prevent reuse
- **Backend validation** to verify authentication integrity by:
  - Matching candidate from the SDK with identityId from the score API
  - Validating overall authentication status
  - Preventing token tampering and session replay attacks
  - Marking sessions as used to prevent reuse

This example showcases best practices for implementing face authentication in a web application with proper security measures.

## Authentication Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant IncodeAPI
    participant IndexedDB

    Note over Frontend: Enter hint:<br> identityId
    Note over Frontend: WebSDK: create()
    Frontend->>Backend: Start Session in Backend<br>{identityId}
    Backend->>IncodeAPI: Create new session<br>{configurationId, apikey}
    Note over IncodeAPI: /omni/start
    IncodeAPI-->>Backend: Returns Session<br>{token, interviewId}
    Backend->>IndexedDB: Store session<br>{key: interviewId, backToken: token, status: pending, identityId)
    Backend-->>Frontend: Return Session<br>{token, interviewId}
    
    Note over Frontend: WebSDK: renderAuthFace(token, hint)
    Note over Frontend: User completes face authentication
    Note over Frontend:Returns:<br>{candidate}
     
    Frontend->>Backend: Validate Authentication<br>{interviewId, token, candidate}
    Backend->>IndexedDB: Get Session Info:<br>{key:interviewId}
    IndexedDB-->>Backend:  {backToken, used}
    Note over Backend: Validate interviewId exists in DB
    Note over Backend: Validate Session isn't already verified<br>status = pending 
    Note over Backend: Validate<br>candidate = session.identityId
    Note over Backend: Validate tokens match<br>token = backToken

   Note over Backend,IndexedDB: Under any error or failed validation
   Backend->>IndexedDB: Mark session as Rejected<br>{interviewId, status:rejected}

    Backend->>IncodeAPI: Mark session as completed
    Note over IncodeAPI: /0/omni/finish-status 
    IncodeAPI-->>Backend: Return:<br>{redirectionUrl, action}//Unused

    Backend->>IncodeAPI: Get Authentication Score<br>{token:backToken}
    Note over IncodeAPI: /0/omni/get/score
    IncodeAPI-->>Backend: {status, identityId}
    Note over Backend: Validate candidate matches identityId<br> candidate = identityId
    Note over Backend: Validate Score is OK:<br>score.status = "OK"
    Backend->>IndexedDB: Mark session as used<br>{interviewId, status:approved}
    Backend-->>Frontend: Return validation result<br>{message, valid, identityId}
    Note over Frontend: Show validation results
```

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
  - Comparing candidate with identityId from the score
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


const apiurl = import.meta.env.VITE_FAKE_BACKEND_APIURL;
const flowid = import.meta.env.VITE_FAKE_BACKEND_FLOWID;
const apikey = import.meta.env.VITE_FAKE_BACKEND_APIKEY;

const defaultHeader = {
  "Content-Type": "application/json",
  "x-api-key": apikey,
  "api-version": "1.0",
};

// Public: Call Incode's `omni/start` API to create an Incode session which will include a
// token in the response.
const start = async function (identityId) {
  const url = `${apiurl}/omni/start`;
  const params = {
    configurationId: flowid,
    // language: "en-US",
    // redirectionUrl: "https://example.com?custom_parameter=some+value",
    // externalCustomerId: "the id of the customer in your system",
  };

  let response;
  try {
    response = await fetch(url, { method: "POST", body: JSON.stringify(params), headers: defaultHeader });
    if (!response.ok) {
      throw new Error("Request failed with code " + response.status);
    }
  } catch (e) {
    throw new Error("HTTP Post Error: " + e.message);
  }

  // The session response has many values, but you should only pass the token to the frontend.
  const responseData = await response.json();
  const { token, interviewId } = responseData;

  // Store session in local DB, session will be created as used: false.
  await addSession(interviewId, token, identityId);

  return { token, interviewId };
};

// Public: Verify the authentication by checking the score and session data
const verifyAuthentication = async function (interviewId, token, candidate) {
  const session = await getSession(interviewId);

  // Prevents usage of session that doesn't exist.
  if (!session) {
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "No session found for interviewId " + interviewId,
      valid: false,
    };
  }
  
  // Prevents reuse of the same session.
  if (session.status !== "pending") {
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Session already used for interviewId " + interviewId,
      valid: false,
    };
  }

  // Prevents usage of token from another interviewId.
  if (session.token !== token) {
    // Mark the session as rejected.
    await updateSession(interviewId, "rejected");
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Token mismatch for interviewId " + interviewId,
      valid: false,
    };
  }

  // Prevents usage of candidate that doesn't match the identityId stored in session.
  if (session.identityId !== candidate) {
    // Mark the session as rejected.
    await updateSession(interviewId, "rejected");
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "identityId and candidate mismatch for interviewId " + interviewId,
      valid: false,
    };
  }

  // Finishing the session stop it from being changed further and triggers score calculation and business rules.
  await finish(token); // Mark session as finished in Incode backend
  
  let identityId, scoreStatus;
  try {
    // At this point we already verified that the token matches, but
    // to be clear about our intentions, we use the token stored in the
    // database to get the identityId and compare it with the candidate.
    const scoreResponse = await getScore(session.token);
    identityId = scoreResponse.authentication.identityId;
    scoreStatus = scoreResponse.overall.status;
  } catch (e) {
    // Mark the session as rejected.
    await updateSession(interviewId, "rejected");
    // If there is an error communicating with API, we consider validation failed.
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Error validating authentication for interviewId " + interviewId + ": " + e.message,
      valid: false,
    };
  }

  // renderFaceAuth returns candidate, which should match identityId from score,
  // this prevents tampering of the identityId in the frontend.
  if (identityId !== candidate) {
    // Mark the session as rejected.
    await updateSession(interviewId, "rejected");
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Session data doesn't match for interviewId " + interviewId,
      valid: false,
    };
  }

  // If backend score overall status is not OK, validation fails.
  if (scoreStatus !== "OK") {
    // Mark the session as rejected.
    await updateSession(interviewId, "rejected");
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Face Validation failed for interviewId " + interviewId,
      valid: false,
    };
  }

  // Mark the session as approved since all checks passed.
  await updateSession(interviewId, "approved");

  // Only valid if all checks passed, we return the identityId that was validated.
  return {
    // Detailed debug message, in production you might want to avoid exposing internal details.
    message: "Face Validation succeeded for interviewId " + interviewId,
    valid: true,
    identityId: identityId,
  };
};

// Private: Calls Incode's `omni/finish-status` API mark the session as finished
const finish = async function (token) {
  const url = `${apiurl}/omni/finish-status`;

  let sessionHeaders = { ...defaultHeader };
  sessionHeaders["X-Incode-Hardware-Id"] = token;

  let response;
  try {
    response = await fetch(url, { method: "GET", headers: sessionHeaders });
    if (!response.ok) {
      throw new Error("Request failed with code " + response.status);
    }
  } catch (e) {
    throw new Error("HTTP Post Error: " + e.message);
  }
  const { redirectionUrl, action } = await response.json();
  return { redirectionUrl, action };
};

// Private: Call Incode's `omni/get/score` API to retrieve the score for the session
const getScore = async function (token) {
  const url = `${apiurl}/omni/get/score`;

  let sessionHeaders = { ...defaultHeader };
  sessionHeaders["X-Incode-Hardware-Id"] = token;

  let response;
  try {
    response = await fetch(url, { method: "GET", headers: sessionHeaders });
    if (!response.ok) {
      throw new Error("Request failed with code " + response.status);
    }
  } catch (e) {
    throw new Error("HTTP Post Error: " + e.message);
  }
  const score = await response.json();
  /* Example score
    {
      "authentication": {
          "overall": {
              "value": "89.2",
              "status": "OK"
          },
          "identityId": "68c851bedd5176f7d8bf4758"
      },
      "liveness": {
          "physicalAttack": {
              "value": "100.0",
              "status": "OK"
          },
          "spoofDetectionMethod": "SF",
          "overall": {
              "value": "100.0",
              "status": "OK"
          },
          "livenessScore": {
              "value": "100.0",
              "status": "OK"
          }
      },
      "deviceRisk": {
          "overall": {
              "status": "UNKNOWN"
          }
      },
      "behavioralRisk": {
          "overall": {
              "status": "UNKNOWN"
          }
      },
      "retryInfo": {},
      "documentOnEdgeInfo": {},
      "sessionRecording": {
          "mergedRecordingQualityChecks": {}
      },
      "reasonMsg": "This session passed because it passed all of Incode's tests: Liveness Detection",
      "overall": {
          "value": "94.6",
          "status": "OK"
      }
    }
   */
  return score;
};

/** Helper functions for sessions saving and retrieval from IndexedDB,
 * in production this should be handled with your backend or secure storage */

// Local database helper functions using IndexedDB
const DB_NAME = "AuthenticationDB";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "interviewId" });
        objectStore.createIndex("interviewId", "interviewId", { unique: true });
      }
    };
  });
}

// Read a specific session from IndexedDB by interviewId
async function getSession(interviewId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(interviewId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Add a new session to the database
async function addSession(interviewId, token, identityId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const session = {
      interviewId,
      token,
      identityId,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    const request = objectStore.add(session);

    request.onsuccess = () => resolve(session);
    request.onerror = () => reject(request.error);
  });
}

// Update validation status for a session
async function updateSession(interviewId, status) {
  
  if (status !== "rejected" && status !== "approved") {
    throw new Error("Invalid status. Must be 'rejected' or 'approved'.");
  }
  
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const getRequest = objectStore.get(interviewId);

    getRequest.onsuccess = () => {
      const session = getRequest.result;
      if (session) {
        session.status = status;
        const updateRequest = objectStore.put(session);
        updateRequest.onsuccess = () => resolve(session);
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve(null);
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

const exampleBackend = { start, verifyAuthentication }
export default exampleBackend;

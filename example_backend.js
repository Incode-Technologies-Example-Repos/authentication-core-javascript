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
  const { token } = responseData;

  return { token };
};

// Public: Verify the authentication by checking the score and idenitityId returned by the backend, and comparing it with the candidate returned by renderFaceAuth.
const getResults = async function (token, candidate) {

  // Finishing the session triggers score calculation and business rules.
  await finishStatus(token); // Mark session as finished in Incode backend
  
  // Closing the session stops it from being changed, all /add/ endpoints will be rejected after this, and the score will be frozen.
  await setStatusClosed(token); // Mark session as closed in Incode backend
  
  let identityId, scoreStatus;
  try {
    const scoreResponse = await getScore(token);
    identityId = scoreResponse.authentication.identityId;
    scoreStatus = scoreResponse.overall.status;
  } catch (e) {
    // If there is an error communicating with API, we consider validation failed.
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Error validating authentication: " + e.message,
      isValid: false,
    };
  }

  // renderFaceAuth returns candidate, which should match identityId from score,
  // this prevents tampering of the identityId in the frontend.
  if (identityId !== candidate) {
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "candidate " + candidate + " does not match identityId " + identityId + " from score",
      isValid: false,
    };
  }

  // If backend score overall status is not OK, validation fails.
  if (scoreStatus !== "OK") {
    return {
      // Detailed debug message, in production you might want to avoid exposing internal details.
      message: "Face Validation failed for candidate " + candidate,
      isValid: false,
    };
  }

  // Only valid if all checks passed, we return the identityId that was validated.
  return {
    // Detailed debug message, in production you might want to avoid exposing internal details.
    message: "Face Validation succeeded for candidate " + candidate,
    isValid: true,
    identityId: identityId,
  };
};

// Private: Calls Incode's `/0/omni/finish-status` API to mark the session as finished
const finishStatus = async function (token) {
  const url = `${apiurl}/0/omni/finish-status`;

  let sessionHeaders = { ...defaultHeader };
  sessionHeaders["X-Incode-Hardware-Id"] = token;

  let response;
  try {
    response = await fetch(url, { method: "POST", body: JSON.stringify({}), headers: sessionHeaders });
    if (!response.ok) {
      throw new Error("Request failed with code " + response.status);
    }
  } catch (e) {
    throw new Error("HTTP Post Error: " + e.message);
  }
  const { redirectionUrl, action } = await response.json();
  return { redirectionUrl, action };
};

// Private: Calls Incode's `omni/session/status/set?action=Closed` API to close the session
const setStatusClosed = async function (token) {
  const url = `${apiurl}/omni/session/status/set?action=Closed`;

  let sessionHeaders = { ...defaultHeader };
  sessionHeaders["X-Incode-Hardware-Id"] = token;

  let response;
  try {
    response = await fetch(url, { method: "POST", body: JSON.stringify({}), headers: sessionHeaders });
    if (!response.ok) {
      throw new Error("Request failed with code " + response.status);
    }
  } catch (e) {
    throw new Error("HTTP Post Error: " + e.message);
  }
  const {sessionStatus} = await response.json();
  /* Example response
    {
      "_id": "69c5c01ac40764536244ac3b",
      "_createdAt": 1774567450715,
      "_updatedAt": 1774567469629,
      "closedAt": 1774567469629,
      "sessionStatus": "Closed"
    }
  */
  return {sessionStatus};
};

// Private: Call Incode's `omni/get/score` API to retrieve the score for the session
const getScore = async function (token) {
  const url = `${apiurl}/0/omni/get/score`;

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



const exampleBackend = { start, getResults }
export default exampleBackend;

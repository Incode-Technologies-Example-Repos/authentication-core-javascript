import { fakeBackendStart, fakeBackendFinish, fakeBackendValidateAuthentication } from "./fake_backend";

let incodeSDKInstance;
let incodeSession;
let candidateId;

const cameraContainer = document.getElementById("camera-container");

function showError(e = null) {
  const finishContainer = document.getElementById("finish-container");
  if (e?.message) {
    finishContainer.innerHTML = `<h1>Error: ${e.message}</h1>`;
  } else {
    finishContainer.innerHTML = "<h1>There was an error</h1>";
    console.log(e);
  }
}

// 1.- Start the authentication process
async function authenticate() {
  const hintInput = document.getElementById("user-hint-input");
  const userHintDiv = document.getElementById("user-hint-container");
  userHintDiv.style.display = "none";

  incodeSession = await fakeBackendStart();
  renderAuthentication(hintInput.value);
}

// 2.- Render the face authentication
function renderAuthentication(hint = null) {
  incodeSDKInstance.renderAuthFace(cameraContainer, {
    session: incodeSession,
    authHint: hint,
    onSuccess: finishAuthentication, // Called after the SDK completes a successful face recognition.
    onError: showError, // Called after the user runs out of capture attempts.
  });
}

// 3.- Finish the onboarding
function finishAuthentication(response) {
  console.log("Authentication successful:", response);

  /** Example response
    {
      "overallStatus": "PASS",
      "candidate": "68c851bedd5176f7d8bf4758",
      "imageBase64": "/9j/4AAQSkZ...9843n4=",
      "selfieEncryptedBase64": "/9j/4AAQSkZJ...RgAEj/9k=",
      "metadata": "eyJjYXB0dXJ...NzF9f82f"
    }
   */

  candidateId = response.candidate; // Store candidate globally

  fakeBackendFinish(incodeSession.token)
    .then((backendResponse) => {
      console.log(backendResponse);
      const container = document.getElementById("finish-container");
      container.innerHTML = `
        <h1>Authentication Finished</h1>
        <p><strong>Overall Status:</strong> ${response.overallStatus}</p>
        <p><strong>Candidate:</strong> ${response.candidate}</p>
        <button id="verify-authentication-btn">Verify Authentication</button>
      `;
      document.getElementById("verify-authentication-btn").addEventListener("click", verifyAuthentication);
    })
    .catch((e) => {
      showError(e);
    });
}

// 4.- Verify the authentication against the score
async function verifyAuthentication() {
  console.log("Verifying authentication for candidateId:", candidateId);
  try {
    const validationResult = await fakeBackendValidateAuthentication(incodeSession.interviewId, incodeSession.token, candidateId);
    console.log("Validation result:", validationResult);

    const container = document.getElementById("finish-container");
    container.innerHTML += `
      <hr>
      <h2>Authentication Verification</h2>
      <p><strong>Interview ID:</strong> ${incodeSession.interviewId}</p>
      <p><strong>Candidate ID:</strong> ${candidateId}</p>
      <p><strong>Identity ID:</strong> ${validationResult.identityId || 'N/A'}</p>
      <p><strong>Message:</strong> ${validationResult.message}</p>
      <p><strong>Authentication Valid:</strong> <span style="color: ${validationResult.valid ? "green" : "red"}; font-weight: bold;">${
      validationResult.valid ? "✓ VALID" : "✗ INVALID"
    }</span></p>
    `;
    document.getElementById("verify-authentication-btn").addEventListener("click", verifyAuthentication);
  } catch (e) {
    showError(e);
  }
}

async function app() {
  try {
    // Translations if needed
    // https://developer.incodeSDKInstance.com/docs/localization-and-strings#example-translations-files
    // const en = {
    //   common: {
    //     continue: "Continue",
    //     error: "Error",
    //     loading: "Loading...",
    //     pleaseWait: "Please wait...",
    //     processing: "Processing...",
    //     // ...
    //   },
    // };

    const apiURL = import.meta.env.VITE_API_URL;
    incodeSDKInstance = window.OnBoarding.create({
      apiURL: apiURL,
      //translations: en
    });

    await incodeSDKInstance.initialize();

    // Create the single session
    cameraContainer.innerHTML = "<h1>Creating session...</h1>";

    // Empty the container and start the flow
    cameraContainer.innerHTML = "";
  } catch (e) {
    showError(e);
  }
}

document.addEventListener("DOMContentLoaded", app);

// Bind the continue button to getHint function
document.getElementById("continue-btn").addEventListener("click", authenticate);

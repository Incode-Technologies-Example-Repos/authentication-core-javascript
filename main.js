/* main.js */

/** Example Backend, this functions should be replaced with your actual backend implementation **/
import exampleBackend from "./example_backend";

let incodeSDKInstance;
let incodeSession;
let candidate;

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
  
  const identityId = hintInput.value;
  incodeSession = await exampleBackend.start(identityId);
  renderAuthentication(identityId);
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

  candidate = response.candidate; // Store candidate globally

  const container = document.getElementById("finish-container");
  container.innerHTML = `
        <h1>Authentication Process Finished</h1>
        <p><strong>Candidate:</strong> ${candidate}</p>
        <button id="get-results-btn">Get Results</button>
      `;
  document.getElementById("get-results-btn").addEventListener("click", getResults);
}

// 4.- Verify the authentication against the score
async function getResults() {
  console.log("Getting results of the authentication");
  try {
    const results = await exampleBackend.getResults(
      incodeSession.token,
      candidate
    );
    console.log("Result:", results);

    const container = document.getElementById("finish-container");
    container.innerHTML += `
      <hr>
      <h2>Authentication Verification</h2>
      <p><strong>Candidate:</strong> ${candidate}</p>
      <p><strong>Identity ID:</strong> ${results.identityId || "N/A"}</p>
      <p><strong>Message:</strong> ${results.message}</p>
      <p><strong>Authentication Valid:</strong> <span style="color: ${results.isValid ? "green" : "red"}; font-weight: bold;">${
        results.isValid ? "✓ VALID" : "✗ INVALID"
      }</span></p>
    `;
    document.getElementById("get-results-btn").addEventListener("click", getResults);
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

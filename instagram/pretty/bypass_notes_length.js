/**
 * Instagram Direct Message Sender
 * -----------------------------
 * A script to send custom messages via Instagram Direct.
 *
 * Features:
 * - Sends messages to Instagram Direct using GraphQL.
 * - Dynamically fetches required security tokens (CSRF token, LSD, user ID).
 * - Handles sending messages in a loop with a user prompt for the message text.
 * - Includes error handling and detailed logging.
 *
 * Usage:
 * 1.  Open Instagram in your browser (e.g., on the direct inbox page).
 * 2.  Open the browser's developer console (usually by pressing F12).
 * 3.  Paste this code into the console and press Enter.
 * 4.  Follow the prompts in the console to enter your message.
 *
 * Important Notes:
 * -   This script interacts with Instagram's private API.  Use it responsibly.
 * -   Instagram may change its API, which could break this script.
 * -   This script is provided as-is, without warranty.
 */

/**
 * Sends an Instagram Direct message using the GraphQL API.
 *
 * @param {string} customText - The text of the message to send. Defaults to "Hello People".
 * @returns {Promise<void>} - A Promise that resolves when the message is sent (or an error occurs).
 */
async function sendInstagramRequest(customText = "Hello People") {
  const url = "https://www.instagram.com/graphql/query";
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-FB-Friendly-Name": "usePolarisCreateInboxTrayItemSubmitMutation",
    "X-BLOKS-VERSION-ID": "0d99de0d13662a50e0958bcb112dd651f70dea02e1859073ab25f8f2a477de96",
    "X-CSRFToken": await getCookie("csrftoken"), // Dynamically get CSRF token
    "X-IG-App-ID": "936619743392459",
    "X-Root-Field-Name": "xdt_create_inbox_tray_item",
    "X-FB-LSD": await getInputValueByName("lsd"), // Dynamically get LSD value
    "X-ASBD-ID": "359341",
    "Alt-Used": "www.instagram.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Priority": "u=0",
  };
  const referrer = "https://www.instagram.com/direct/inbox/";

  const variables = {
    input: {
      client_mutation_id: "1",
      actor_id: await getCookie("ds_user_id"), // Dynamically get user ID
      additional_params: {
        note_create_params: {
          note_style: 0,
          text: customText,
        },
      },
      audience: 0,
      inbox_tray_item_type: "note",
    },
  };
  const variablesJson = JSON.stringify(variables);

  // Construct the body of the POST request.
  const body = `av=17841462902847215&__d=www&__user=0&__a=1&__req=1k&__hs=20186.HYP%3Ainstagram_web_pkg.2.1...1&dpr=1&__ccg=GOOD&__rev=1021670656&__s=cnlv50%3Ao95nal%3A8sqau1&__hsi=7490933369849171773&__dyn=7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8aUco2qwJyEiw9-0DwUx60p-0LVE4W0qa321Rw8G11wBz81s8hwGxu786a3a1YwBgao6C0Mo2iyo7u3ifK0zEkxe2GewGw9a3614xm0zK5o4q3y261kx-0ma2-azqwt8d-2u2J08O321LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwIDyXxui2qiUqwm8jxK2K0P8K9x6&__csr=${await getCookie(
    "csrftoken"
  )}&__comet_req=7&fb_dtsg=${await getInputValueByName(
    "fb_dtsg"
  )}&jazoest=26194&lsd=${await getInputValueByName(
    "lsd"
  )}&__spin_r=1021670656&__spin_b=trunk&__spin_t=1744118838&__crn=comet.igweb.PolarisDirectInboxRoute&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=usePolarisCreateInboxTrayItemSubmitMutation&variables=${encodeURIComponent(
    variablesJson
  )}&server_timestamps=true&doc_id=9986151014729199`;

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: headers,
      referrer: referrer,
      body: body,
      method: "POST",
      mode: "cors",
    });

    if (response.ok) {
      console.log("Request successful!");
      console.log("Status Code:", response.status);
      const data = await response.json();
      console.log("Response:", data);
    } else {
      console.error("Request failed!");
      console.error("Status Code:", response.status);
      const text = await response.text(); // Get the response text
      console.error("Response:", text);    // Log the response text
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

/**
 * Helper function to get a cookie value by name.  Uses a Promise for wider compatibility.
 *
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {Promise<string | null>} - A Promise that resolves with the cookie value or null if not found.
 */
async function getCookie(name) {
  return new Promise((resolve) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return resolve(parts.pop().split(';').shift());
    resolve(null);
  });
}

/**
 * Helper function to get the value of an input element by its name. Uses a Promise.
 *
 * @param {string} name - The name of the input element.
 * @returns {Promise<string | null>} - A Promise that resolves with the input value or null if not found.
 */
async function getInputValueByName(name) {
  return new Promise((resolve) => {
    const element = document.querySelector(`input[name="${name}"]`);
    resolve(element ? element.value : null);
  });
}

/**
 * Prompts the user for a message and sends it, repeatedly until the user enters 'exit'.
 *
 * @returns {Promise<void>} - A Promise that resolves when the user enters 'exit'.
 */
async function startSending() {
  console.log("Starting message sending loop. Type 'exit' to quit.");
  while (true) {
    const customMessage = prompt(
      "Enter the text you want to send (or type 'exit' to quit):"
    );
    if (customMessage === null || customMessage.toLowerCase() === "exit") {
      console.log("Exiting...");
      break; // Use break to exit the loop
    }
    if (customMessage.trim() !== "") { //prevent empty messages
      await sendInstagramRequest(customMessage);
      console.log("-".repeat(20)); // Separator for readability
    }
    else{
      console.log("Empty message, not sending. Please enter a valid text or exit")
    }
  }
  console.log("Message sending loop finished.");
}

// Start the process when the script is loaded.
console.log("Paste this code into your browser's developer console while on Instagram (e.g., on the direct inbox page).");
startSending();

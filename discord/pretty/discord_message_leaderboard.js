let authToken;

// Attempt to extract the auth token.  This method is not officially supported and
// may break if Discord changes their internal structure.
try {
  authToken = window.webpackChunkdiscord_app.push([
    [Math.random()], {},
    (moduleExports) => {
      if (moduleExports.c) {
        for (const module of Object.keys(moduleExports.c)
          .map(key => moduleExports.c[key].exports)
          .filter(exportedModule => exportedModule)) {
          if (module.default && module.default.getToken !== undefined) {
            return module.default.getToken();
          }
          if (module.getToken !== undefined) {
            return module.getToken();
          }
        }
      }
      return null; // Return null if token is not found
    }
  ]);
  window.webpackChunkdiscord_app.pop();
} catch (error) {
  console.error("Failed to extract auth token:", error);
  // It's critical to have the token.  The script cannot proceed without it.
  alert("Failed to obtain Discord authorization token. The script cannot run.  Ensure you are logged into Discord in your browser.");
  throw error; // Stop execution.
}

if (!authToken) {
  alert("Could not retrieve Discord auth token.  Ensure you are logged in.");
  throw new Error("Authentication token is missing.");
}

const channelId = window.location.pathname.split("/")[3];
if (!channelId) {
  alert("Invalid channel ID.  Please run this script in a Discord channel.");
  throw new Error("Channel ID is missing.");
}

/**
 * Fetches the current user's ID and username.
 * @returns {Promise<{id: string, username: string}>} - A promise that resolves to an object containing the user's ID and username.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
function fetchUserInfo() {
  return fetch("https://discord.com/api/v9/users/@me", {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      authorization: authToken,
      "content-type": "application/json"
    },
    method: "GET",
    mode: "cors",
    credentials: "include"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(user => ({
      id: user.id,
      username: user.global_name || user.username // Use global_name if available, otherwise use username
    }))
    .catch(error => {
      console.error("Error fetching user info:", error);
      throw error; // Re-throw the error to be caught by the caller
    });
}

/**
 * Fetches the count of messages for a specific user in the current channel.
 * @param {string} userId - The ID of the user.
 * @param {string} username - The username of the user.
 * @returns {Promise<{username: string, userId: string, messageCount: number}>} - A promise that resolves to an object containing the username, user ID, and message count.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
function fetchMessageCount(userId, username) {
  return fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${userId}`, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      authorization: authToken,
      "content-type": "application/json"
    },
    method: "GET",
    mode: "cors",
    credentials: "include"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch message count for user ${username}: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => ({
      username: username,
      userId: userId,
      messageCount: data.total_results
    }))
    .catch(error => {
      console.error(`Error fetching message count for ${username}:`, error);
      throw error; // Re-throw the error
    });
}

/**
 * Sends a message to the current channel.
 * @param {object} messageOptions - The options for the message to send (e.g., content, tts).
 * @returns {Promise<Response>} - A promise that resolves to the response from the fetch request.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
function sendLeaderboardMessage(messageOptions) {
  return fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      authorization: authToken,
      "content-type": "application/json"
    },
    body: JSON.stringify(messageOptions),
    method: "POST",
    mode: "cors",
    credentials: "include"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
      return response;
    })
    .catch(error => {
      console.error("Error sending message:", error);
      throw error; // Re-throw the error
    });
}

/**
 * Processes the leaderboard data for a direct message channel.
 * @param {object} data - The data returned from the Discord API for the channel.
 * @returns {Promise<Response>} - A promise that resolves to the response from sending the leaderboard message.
 */
function processDirectMessageLeaderboard(data) {
  if (!data || !data.channels || data.channels.length === 0) {
    const errorMessage = "Invalid data structure for direct message channel.";
    console.error(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }

  return fetchUserInfo().then(userInfo => {
    const userId = userInfo.id;
    const username = userInfo.username;

    // Handle the case where recipients is undefined or empty.
    const otherUser = data.channels[0].recipients?.find(user => user.id !== userId);
    if (!otherUser) {
      const noOtherUserMessage = "No other user found in this direct message channel.";
      console.warn(noOtherUserMessage);
      return sendLeaderboardMessage({ content: noOtherUserMessage, tts: false }); // Send a message to Discord
    }

    const totalMessages = data.total_results;

    const messageRequests = [
      fetchMessageCount(userId, username),
      fetchMessageCount(otherUser.id, otherUser.global_name || otherUser.username) // added fallback
    ];

    return Promise.all(messageRequests)
      .then(results => {
        results.sort((a, b) => b.messageCount - a.messageCount);

        // Customizable Leaderboard Message
        let leaderboardText = `**DM with ${otherUser.global_name || otherUser.username}**\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
        results.forEach((result, index) => {
          const percentage = ((result.messageCount / totalMessages) * 100).toFixed(1); // Changed to 1 decimal place
          leaderboardText += `${index + 1}. **${result.username}**: ${result.messageCount} (${percentage}%)\n`;
        });

        const messageOptions = {
          content: leaderboardText,
          tts: false,
        };
        return sendLeaderboardMessage(messageOptions);
      })
      .catch(error => {
        console.error("Error processing DM leaderboard:", error);
        throw error; // Propagate the error
      });
  });
}

/**
 * Processes the leaderboard data for a group message channel.
 * @param {object} data - The data returned from the Discord API for the channel.
 * @returns {Promise<Response>} - A promise that resolves to the response from sending the leaderboard message.
 */
function processGroupMessageLeaderboard(data) {
  if (!data || !data.channels || data.channels.length === 0) {
    const errorMessage = "Invalid data structure for group message channel.";
    console.error(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
  const channelName = data.channels[0].name;
  const totalMessages = data.total_results;
  const recipients = data.channels[0].recipients;

  return fetchUserInfo().then(userInfo => {
    const userId = userInfo.id;
    const username = userInfo.username;
    const messageCounts = [];
    
    // Handle undefined or empty recipients
    const recipientRequests = (recipients || []).map(async recipient => {
      const recipientName = recipient.global_name || recipient.username;
      try {
        const messageData = await fetchMessageCount(recipient.id, recipientName);
        return messageCounts.push(messageData);
      } catch (error) {
        return console.error(`Error fetching message count for ${recipientName}:`, error);
      }
    });

    recipientRequests.push(
      fetchMessageCount(userId, username)
        .then(messageData => messageCounts.push(messageData))
        .catch(error => console.error("Error fetching message count for self:", error))
    );

    return Promise.all(recipientRequests)
      .then(() => {
        // Ensure messageCounts has data before sorting.
        if (messageCounts.length === 0) {
          const noMessagesMessage = "No messages found in this group channel.";
          console.warn(noMessagesMessage);
          return sendLeaderboardMessage({ content: noMessagesMessage, tts: false });
        }
        messageCounts.sort((a, b) => b.messageCount - a.messageCount);

        // Customizable Leaderboard Message
        let leaderboardText = `**Group Name:** ${channelName}\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
        messageCounts.forEach((messageData, index) => {
          const percentage = ((messageData.messageCount / totalMessages) * 100).toFixed(1); // Changed to 1 decimal place
          leaderboardText += `${index + 1}. **${messageData.username}**: ${messageData.messageCount} (${percentage}%)\n`;
        });

        const messageOptions = {
          content: leaderboardText,
          tts: false,
        };
        return sendLeaderboardMessage(messageOptions);
      })
      .catch(error => {
        console.error("Error processing group leaderboard:", error);
        throw error; // Propagate the error
      });
  });
}



fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0`, {
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    authorization: authToken,
    "content-type": "application/json",
    "x-debug-options": "bugReporterEnabled",
    "x-discord-locale": "en-US",
    "x-discord-timezone": "Europe/Paris"
  },
  method: "GET",
  mode: "cors",
  credentials: "include"
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch channel data: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    if (!data || !data.channels || data.channels.length === 0) {
      throw new Error("Invalid or empty channel data received.");
    }
    if (data.channels[0].type === 1) {
      return processDirectMessageLeaderboard(data);
    } else {
      return processGroupMessageLeaderboard(data);
    }
  })
  .catch(error => {
    console.error("Error fetching channel data:", error);
    alert(`An error occurred: ${error.message}.  Please check the console for details.`);
  });

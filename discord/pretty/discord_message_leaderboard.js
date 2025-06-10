(function () {
  // Remove the global jQuery object if it exists (specific to Discord's environment)
  delete window.$;

  // Safely get webpack modules
  let wpRequire;
  try {
    wpRequire = webpackChunkdiscord_app.push([
      [Symbol()], {},
      r => r
    ]);
    webpackChunkdiscord_app.pop(); // Clean up the pushed module
  } catch (e) {
    console.error("Failed to get webpack modules. Ensure you're in Discord.", e);
    alert("An error occurred. Make sure you are in Discord and try again.");
    return; // Exit if webpack is not available
  }

  // Get the Discord API object
  const api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get)?.exports.tn;

  if (!api) {
    console.error("Discord API object not found. The script might be outdated or Discord's structure has changed.");
    alert("Could not find the Discord API. The script may be outdated.");
    return;
  }

  // Extract channel and guild IDs from the URL
  const channelId = window.location.pathname.split("/")[3];
  const guildId = window.location.pathname.split("/")[2];

  // Validate environment
  if (!channelId && !guildId) {
    alert("Invalid channel or guild. Please run this script within a Discord channel or guild.");
    return; // Exit if not in a valid location
  }

  // Warn about guild functionality (currently not supported)
  const isGuild = guildId && !isNaN(guildId);
  if (isGuild) {
    alert("This script is currently designed for Direct Messages and Group Chats. Guild functionality is under development.");
    return; // Exit if in a guild
  } else if (!channelId || isNaN(channelId)) {
    alert("Invalid channel ID. Please run this script in a Discord channel.");
    return; // Exit if channel ID is invalid
  }

  /**
   * Fetches the current user's ID and username from the Discord API.
   * @returns {Promise<{id: string, username: string}>} A promise that resolves to an object containing the user's ID and username.
   */
  async function fetchUserInfo() {
    try {
      const userResponse = await api.get({
        url: `/users/@me`
      });
      return {
        id: userResponse.body.id,
        username: userResponse.body.global_name || userResponse.body.username
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw new Error(`Failed to fetch user information: ${error.message}`);
    }
  }

  /**
   * Fetches the total message count for a specific user within the current channel.
   * @param {string} userId - The Discord ID of the user.
   * @param {string} username - The username of the user.
   * @returns {Promise<{username: string, userId: string, messageCount: number}>} A promise that resolves to an object containing the username, user ID, and message count.
   */
  async function fetchMessageCount(userId, username) {
    try {
      const response = await api.get({
        url: `/channels/${channelId}/messages/search?min_id=0&author_id=${userId}`
      });
      if (!response.ok) {
        throw new Error(`API returned ${response.status} ${response.statusText}`);
      }
      return {
        username: username,
        userId: userId,
        messageCount: response.body.total_results
      };
    } catch (error) {
      console.error(`Error fetching message count for ${username} (${userId}):`, error);
      throw new Error(`Failed to fetch message count for ${username}: ${error.message}`);
    }
  }

  /**
   * Sends a message to the current Discord channel.
   * @param {object} messageOptions - The options for the message to send (e.g., content, tts).
   * @returns {Promise<Response>} A promise that resolves to the response from the API.
   */
  async function sendLeaderboardMessage(messageOptions) {
    try {
      const response = await api.post({
        url: `/channels/${channelId}/messages`,
        body: messageOptions
      });
      if (!response.ok) {
        throw new Error(`API returned ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Processes the leaderboard for Direct Message (DM) channels.
   * @param {object} data - The channel data returned from the Discord API search.
   * @returns {Promise<Response>} A promise that resolves when the leaderboard message is sent.
   */
  async function processDirectMessageLeaderboard(data) {
    if (!data?.channels?.[0]?.recipients) {
      const errorMessage = "Invalid data for DM leaderboard processing.";
      console.error(errorMessage, data);
      throw new Error(errorMessage);
    }

    const userInfo = await fetchUserInfo();
    const otherUser = data.channels[0].recipients.find(user => user.id !== userInfo.id);

    if (!otherUser) {
      const noOtherUserMessage = "No other user found in this direct message channel.";
      console.warn(noOtherUserMessage);
      return sendLeaderboardMessage({
        content: noOtherUserMessage,
        tts: false
      });
    }

    const totalMessages = data.total_results;
    const otherUsername = otherUser.global_name || otherUser.username;

    const [currentUserMessages, otherUserMessages] = await Promise.all([
      fetchMessageCount(userInfo.id, userInfo.username),
      fetchMessageCount(otherUser.id, otherUsername)
    ]);

    const results = [currentUserMessages, otherUserMessages].sort((a, b) => b.messageCount - a.messageCount);

    let otherMessagesCount = totalMessages - (currentUserMessages.messageCount + otherUserMessages.messageCount);

    let leaderboardText = `**DM with ${otherUsername}**\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
    results.forEach((result, index) => {
      const percentage = ((result.messageCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `${index + 1}. **${result.username}**: ${result.messageCount} (${percentage}%)\n`;
    });

    if (otherMessagesCount > 0) {
      const otherPercentage = ((otherMessagesCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `-# Other: ${otherMessagesCount} (${otherPercentage}%)\n`;
    }

    return await sendLeaderboardMessage({
      content: leaderboardText,
      tts: false
    });
  }

  /**
   * Processes the leaderboard for Group Message channels.
   * @param {object} data - The channel data returned from the Discord API search.
   * @returns {Promise<Response>} A promise that resolves when the leaderboard message is sent.
   */
  async function processGroupMessageLeaderboard(data) {
    if (!data?.channels?.[0]?.recipients) {
      const errorMessage = "Invalid data for group message leaderboard processing.";
      console.error(errorMessage, data);
      throw new Error(errorMessage);
    }

    const channelInfo = data.channels[0];
    const channelName = channelInfo.name || "Unnamed Group Chat";
    const totalMessages = data.total_results;
    const recipients = channelInfo.recipients || [];

    const userInfo = await fetchUserInfo();
    const allParticipants = [...recipients.filter(r => r.id !== userInfo.id), userInfo];

    const messageCounts = [];
    await Promise.all(allParticipants.map(async participant => {
      const participantName = participant.global_name || participant.username;
      try {
        const messageData = await fetchMessageCount(participant.id, participantName);
        messageCounts.push(messageData);
      } catch (error) {
        console.warn(`Could not fetch message count for ${participantName}: ${error.message}`);
      }
    }));

    if (messageCounts.length === 0) {
      const noMessagesMessage = "No message data could be retrieved for this group chat.";
      console.warn(noMessagesMessage);
      return sendLeaderboardMessage({
        content: noMessagesMessage,
        tts: false
      });
    }

    messageCounts.sort((a, b) => b.messageCount - a.messageCount);

    let countedMessagesSum = messageCounts.reduce((sum, current) => sum + current.messageCount, 0);
    let otherMessagesCount = totalMessages - countedMessagesSum;

    let leaderboardText = `**Group Name:** ${channelName}\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
    messageCounts.forEach((messageData, index) => {
      const percentage = ((messageData.messageCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `${index + 1}. **${messageData.username}**: ${messageData.messageCount} (${percentage}%)\n`;
    });

    if (otherMessagesCount > 0) {
      const otherPercentage = ((otherMessagesCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `-# Other: ${otherMessagesCount} (${otherPercentage}%)\n`;
    }

    return await sendLeaderboardMessage({
      content: leaderboardText,
      tts: false
    });
  }

  /**
   * Fetches initial channel data and dispatches to the appropriate processing function.
   * @param {string} channelId - The ID of the current Discord channel.
   */
  async function getChannelData(channelId) {
    try {
      const channelData = await api.get({
        url: `/channels/${channelId}/messages/search?min_id=0`
      });

      if (!channelData?.body?.channels?.[0]) {
        throw new Error("Invalid or empty channel data received.");
      }

      // Discord channel types: 1 = DM, 3 = Group DM
      const channelType = channelData.body.channels[0].type;
      if (channelType === 1) { // DM
        return processDirectMessageLeaderboard(channelData.body);
      } else if (channelType === 3) { // Group DM
        return processGroupMessageLeaderboard(channelData.body);
      } else {
        alert("This script supports Direct Messages and Group Chats only.");
        throw new Error(`Unsupported channel type: ${channelType}`);
      }
    } catch (error) {
      console.error("Error fetching or processing channel data:", error);
      alert(`An error occurred: ${error.message}. Please check the console for more details.`);
    }
  }

  // Execute the script
  getChannelData(channelId);
})();
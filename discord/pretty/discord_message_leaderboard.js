delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();
let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;

let authToken = null;
const channelId = window.location.pathname.split("/")[3];
const guildId = window.location.pathname.split("/")[2];

if (!channelId && !guildId) {
  alert("Invalid channel or guild ID. Please run this script in a Discord channel or guild.");
  throw new Error("Channel or Guild ID is missing.");
}

let isGuild = false;
if (guildId && !isNaN(guildId)) {
  isGuild = true;
  alert("This script is currently designed to work in Direct Messages and Group Chats. Functionality for Guilds is under development and will be available soon!");
} else if (!channelId || isNaN(channelId)) {
  alert("Invalid channel ID. Please run this script in a Discord channel.");
  throw new Error("Channel ID is missing.");
}

/**
 * Fetches the current user's ID and username.
 * @returns {Promise<{id: string, username: string}>} - A promise that resolves to an object containing the user's ID and username.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
async function fetchUserInfo() {
  try {
    const userResponse = await api.get({ url: `/users/@me` });
    console.log("User info fetched successfully:", userResponse.body.id);
    return ({
      id: userResponse.body.id,
      username: userResponse.body.global_name || userResponse.body.username
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
}

/**
 * Fetches the count of messages for a specific user in the current channel.
 * @param {string} userId - The ID of the user.
 * @param {string} username - The username of the user.
 * @returns {Promise<{username: string, userId: string, messageCount: number}>} - A promise that resolves to an object containing the username, user ID, and message count.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
async function fetchMessageCount(userId, username) {
  try {
    const response = await api.get({
      url: `/channels/${channelId}/messages/search?min_id=0&author_id=${userId}`
    });
    console.log(`Message count fetched for user ${username}:`, response.body.total_results);
    // const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${userId}`, {
    //   headers: {
    //     accept: "*/*",
    //     "accept-language": "en-US,en;q=0.9",
    //     authorization: authToken,
    //     "content-type": "application/json"
    //   },
    //   method: "GET",
    //   mode: "cors",
    //   credentials: "include"
    // });
    if (!response.ok) {
      throw new Error(`Failed to fetch message count for user ${username}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return ({
      username: username,
      userId: userId,
      messageCount: data.total_results
    });
  } catch (error) {
    console.error(`Error fetching message count for ${username}:`, error);
    throw error;
  }
}

/**
 * Sends a message to the current channel.
 * @param {object} messageOptions - The options for the message to send (e.g., content, tts).
 * @returns {Promise<Response>} - A promise that resolves to the response from the fetch request.
 * @throws {Error} - Throws an error if the fetch request fails.
 */
async function sendLeaderboardMessage(messageOptions) {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
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
    });
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Processes the leaderboard data for a direct message channel.
 * @param {object} data - The data returned from the Discord API for the channel.
 * @returns {Promise<Response>} - A promise that resolves to the response from sending the leaderboard message.
 */
async function processDirectMessageLeaderboard(data) {
  if (!data || !data.channels || data.channels.length === 0) {
    const errorMessage = "Invalid data structure for direct message channel.";
    console.error(errorMessage);
    return Promise.reject(new Error(errorMessage));
  }

  const userInfo = await fetchUserInfo();
  const userId = userInfo.id;
  const username = userInfo.username;
  const otherUser = data.channels[0].recipients?.find(user => user.id !== userId);
  if (!otherUser) {
    const noOtherUserMessage = "No other user found in this direct message channel.";
    console.warn(noOtherUserMessage);
    return sendLeaderboardMessage({ content: noOtherUserMessage, tts: false });
  }
  const totalMessages = data.total_results;
  const messageRequests = [
    fetchMessageCount(userId, username),
    fetchMessageCount(otherUser.id, otherUser.global_name || otherUser.username)
  ];
  try {
    const results = await Promise.all(messageRequests);
    results.sort((a, b) => b.messageCount - a.messageCount);

    let otherMessagesCount = totalMessages;
    results.forEach(result => {
      otherMessagesCount -= result.messageCount;
    });

    let leaderboardText = `**DM with ${otherUser.global_name || otherUser.username}**\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
    results.forEach((result, index) => {
      const percentage = ((result.messageCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `${index + 1}. **${result.username}**: ${result.messageCount} (${percentage}%)\n`;
    });
    if (otherMessagesCount > 0) {
      const otherPercentage = ((otherMessagesCount / totalMessages) * 100).toFixed(1);
      leaderboardText += `-# Other: ${otherMessagesCount} (${otherPercentage}%)\n`;
    }

    const messageOptions_1 = {
      content: leaderboardText,
      tts: false,
    };
    return await sendLeaderboardMessage(messageOptions_1);
  } catch (error) {
    console.error("Error processing DM leaderboard:", error);
    throw error;
  }
}

/**
 * Processes the leaderboard data for a group message channel.
 * @param {object} data - The data returned from the Discord API for the channel.
 * @returns {Promise<Response>} - A promise that resolves to the response from sending the leaderboard message.
 */
async function processGroupMessageLeaderboard(data) {
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
        if (messageCounts.length === 0) {
          const noMessagesMessage = "No messages found in this group channel.";
          console.warn(noMessagesMessage);
          return sendLeaderboardMessage({ content: noMessagesMessage, tts: false });
        }
        messageCounts.sort((a, b) => b.messageCount - a.messageCount);

        let otherMessagesCount = totalMessages;
        messageCounts.forEach(result => {
          otherMessagesCount -= result.messageCount;
        });

        let leaderboardText = `**Group Name:** ${channelName}\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
        messageCounts.forEach((messageData, index) => {
          const percentage = ((messageData.messageCount / totalMessages) * 100).toFixed(1);
          leaderboardText += `${index + 1}. **${messageData.username}**: ${messageData.messageCount} (${percentage}%)\n`;
        });

        if (otherMessagesCount > 0) {
          const otherPercentage = ((otherMessagesCount / totalMessages) * 100).toFixed(1);
          leaderboardText += `-# Other: ${otherMessagesCount} (${otherPercentage}%)\n`;
        }
        const messageOptions = {
          content: leaderboardText,
          tts: false,
        };
        return sendLeaderboardMessage(messageOptions);
      })
      .catch(error => {
        console.error("Error processing group leaderboard:", error);
        throw error;
      });
  });
}

async function getChannelData(channelId) {
  const channelData = await api.get({ url: `/channels/${channelId}/messages/search?min_id=0` });
  console.log("Channel data fetched successfully:", channelData.body.channels);
  if (!channelData || !channelData.body || !channelData.body.channels || channelData.body.channels.length === 0) {
    throw new Error("Invalid or empty channel data received.");
  }
  if (channelData.body.channels[0].type === 1) {
    return processDirectMessageLeaderboard(channelData.body);
  }
  return processGroupMessageLeaderboard(channelData.body);
}

getChannelData(channelId).catch(error => {
  console.error("Error fetching channel data:", error);
  alert(`An error occurred while fetching channel data: ${error.message}. Please check the console for details.`);
});
let authToken;

window.webpackChunkdiscord_app.push([
  [Math.random()], {},
  (moduleExports) => {
    if (moduleExports.c) {
      for (const module of Object.keys(moduleExports.c)
        .map(key => moduleExports.c[key].exports)
        .filter(exportedModule => exportedModule)) {
        if (module.default && module.default.getToken !== undefined) {
          authToken = module.default.getToken();
          return;
        }
        if (module.getToken !== undefined) {
          authToken = module.getToken();
          return;
        }
      }
    }
  }
]);

window.webpackChunkdiscord_app.pop();

const channelId = window.location.pathname.split("/")[3];

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
    .then(response => response.json())
    .then(user => ({
      id: user.id,
      username: user.global_name
    }))
    .catch(error => {
      console.error("Error fetching user info:", error);
      throw error;
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
  .then(response => response.json())
  .then(data => {
    if (data.channels[0].name === undefined) {
      return processDirectMessageLeaderboard(data);
    } else {
      return processGroupMessageLeaderboard(data);
    }
  })
  .catch(error => {
    console.error("Error fetching channel data:", error);
  });

function processDirectMessageLeaderboard(data) {
  return fetchUserInfo().then(userInfo => {
    const userId = userInfo.id;
    const username = userInfo.username;
    const otherUser = data.channels[0].recipients.find(user => user.id !== userId);
    const totalMessages = data.total_results;

    const messageRequests = [
      fetchMessageCount(userId, username),
      fetchMessageCount(otherUser.id, otherUser.global_name)
    ];

    return Promise.all(messageRequests)
      .then(results => {
        results.sort((a, b) => b.messageCount - a.messageCount);

        // Customizable Leaderboard Message
        let leaderboardText = `**DM with ${otherUser.global_name}**\n**Total messages:** ${totalMessages}\n\n**Leaderboard:** 🏆\n`;
        results.forEach((result, index) => {
          const percentage = ((result.messageCount / totalMessages) * 100).toFixed(1); // Changed to 1 decimal place
          leaderboardText += `${index + 1}. **${result.username}**: ${result.messageCount} (${percentage}%)\n`;
        });

        const messageOptions = {
          content: leaderboardText,
          tts: false,
        };
        return sendLeaderboardMessage(messageOptions);
      });
  });
}

function processGroupMessageLeaderboard(data) {
  const channelName = data.channels[0].name;
  const totalMessages = data.total_results;
  const recipients = data.channels[0].recipients;

  return fetchUserInfo().then(userInfo => {
    const userId = userInfo.id;
    const username = userInfo.username;
    const messageCounts = [];

    const recipientRequests = recipients.map(recipient => {
      return fetchMessageCount(recipient.id, recipient.global_name)
        .then(messageData => messageCounts.push(messageData))
        .catch(error => console.error(`Error fetching message count for ${recipient.global_name}:`, error));
    });

    recipientRequests.push(
      fetchMessageCount(userId, username)
        .then(messageData => messageCounts.push(messageData))
        .catch(error => console.error("Error fetching message count for self:", error))
    );

    return Promise.all(recipientRequests)
      .then(() => {
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
      });
  });
}

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
    .then(response => response.json())
    .then(data => ({
      username: username,
      userId: userId,
      messageCount: data.total_results
    }));
}

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
  });
}
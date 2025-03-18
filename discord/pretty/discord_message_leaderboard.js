let authToken;
window
    .webpackChunkdiscord_app
    .push([
        [Math.random()], {},
        e => {
            if (e.c) 
                for (const n of Object.keys(e.c).map((n => e.c[n].exports)).filter((e => e))) {
                    if (n.default && void 0 !== n.default.getToken) 
                        return void(authToken = n.default.getToken());
                    if (void 0 !== n.getToken) 
                        return void(authToken = n.getToken())
                }
            }
    ]),
window
    .webpackChunkdiscord_app
    .pop();
const channelId = window
    .location
    .pathname
    .split("/")[3];
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
        .then((e => e.json()))
        .then((e => ({id: e.id, username: e.username})))
        .catch((e => {
            throw console.error("Error fetching user info:", e),
            e
        }))
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
    .then((e => e.json()))
    .then((e => {
        if (console.log("%cWorked!", "font-size: 50px"), console.log("Total Results:", e.total_results), void 0 === e.channels[0].name) 
            return e.total_results,
            fetchUserInfo().then((n => {
                const t = n.id,
                    s = n.username,
                    o = e
                        .channels[0]
                        .recipients
                        .find((e => e.id !== t)),
                    a = [
                        fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${t}`, {
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
                            .then((e => e.json()))
                            .then((e => ({username: s, userId: t, messageCount: e.total_results}))),
                        fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${o.id}`, {
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
                            .then((e => e.json()))
                            .then((e => ({username: o.username, userId: o.id, messageCount: e.total_results})))
                    ];
                return Promise
                    .all(a)
                    .then((n => {
                        n.sort(((e, n) => n.messageCount - e.messageCount));
                        let t = `**DM with ${o.username}**\n**Total messages:** ${e.total_results}\n\nLeaderboard:\n`;
                        return n.forEach(((e, n) => {
                            t += `${n + 1}. **${e.username}**: ${e.messageCount} messages\n`
                        })),
                        fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                            headers: {
                                accept: "*/*",
                                "accept-language": "en-US,en;q=0.9",
                                authorization: authToken,
                                "content-type": "application/json"
                            },
                            body: JSON.stringify({
                                content: t,
                                tts: !1
                            }),
                            method: "POST",
                            mode: "cors",
                            credentials: "include"
                        })
                    }))
            }));
        
        {
                const n = e.channels[0].name,
                t = e.total_results,
                s = e.channels[0].recipients;
            return fetchUserInfo().then((e => {
                const o = e.id,
                    a = e.username,
                    c = [],
                    r = s.map((e => fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${e.id}`, {
                        headers: {
                            accept: "*/*",
                            "accept-language": "en-US,en;q=0.9",
                            authorization: authToken,
                            "content-type": "application/json"
                        },
                        method: "GET",
                        mode: "cors",
                        credentials: "include"
                    }).then((e => e.json())).then((n => {
                        const t = n.total_results;
                        c.push({username: e.username, userId: e.id, messageCount: t})
                    })).catch((n => {
                        console.error(`Error fetching message count for ${e.username}:`, n)
                    }))));
                return r.push(fetch(`https://discord.com/api/v9/channels/${channelId}/messages/search?min_id=0&author_id=${o}`, {
                    headers: {
                        accept: "*/*",
                        "accept-language": "en-US,en;q=0.9",
                        authorization: authToken,
                        "content-type": "application/json"
                    },
                    method: "GET",
                    mode: "cors",
                    credentials: "include"
                }).then((e => e.json())).then((e => {
                    const n = e.total_results;
                    c.push({username: a, userId: o, messageCount: n})
                })).catch((e => {
                    console.error("Error fetching message count for self:", e)
                }))),
                Promise
                    .all(r)
                    .then((() => {
                        c.sort(((e, n) => n.messageCount - e.messageCount));
                        let e = `**Group Name:** ${n}\n**Total messages:** ${t}\n\nLeaderboard:\n`;
                        return c.forEach(((n, t) => {
                            e += `${t + 1}. **${n.username}**: ${n.messageCount} messages\n`
                        })),
                        fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                            headers: {
                                accept: "*/*",
                                "accept-language": "en-US,en;q=0.9",
                                authorization: authToken,
                                "content-type": "application/json"
                            },
                            body: JSON.stringify({
                                content: e,
                                tts: !1
                            }),
                            method: "POST",
                            mode: "cors",
                            credentials: "include"
                        })
                    }))
            }))
        }
    }))
    .then((e => {
        if (!e.ok) 
            throw new Error("Failed to send message");
        return e.json()
    }))
    .then((e => {
        console.log("Message sent successfully:", e)
    }))
    .catch((e => {
        console.error("Error:", e)
    }));

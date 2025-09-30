import { User } from "../models/user.model.js";

async function generateUserName(fullName, email) {

    let base = fullName
        ? fullName.toLowerCase().replace(/\s+/g, "")
        : email.split("@")[0].toLowerCase();

    const usernames = [];
    let counter = 0;

    while (usernames.length < 2) {
        let candidate;

        if (counter === 0) {
            candidate = base;
        } else if (counter === 1) {
            candidate = `${base}${Math.floor(Math.random() * 1000)}`;
        } else {
            candidate = `${base}${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
        }

        const exists = await User.exists({ username: candidate });

        if (!exists && !usernames.includes(candidate)) {
            usernames.push(candidate);
        }

        counter++;
    }

    return usernames;
}

async function checkAvailableUsernames(username) {
    const exists = await User.exists({ username });

    return {
        username,
        available: !exists,
    };
}

export { generateUserName, checkAvailableUsernames };
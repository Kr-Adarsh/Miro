const CHATGPT_CONVERSATION_URL = "https://chatgpt.com/backend-api/conversation";
const CLAUDE_CONVERSATION_URL_PATTERN = new RegExp('^https://api.claude.ai/api/organizations/[a-f0-9\\-]{36}/chat_conversations/[a-f0-9\\-]{36}/completion\\?rendering_mode=raw$');
const RESPONSE_REQUESTED = "responseRequested";
const RESPONSE_STREAMING = "responseStreaming";
const RESPONSE_COMPLETED = "responseCompleted";
const PLATFORM_CHAT_GPT = "ChatGPT";
const PLATFORM_CLAUDE_AI = "Claude.AI";

const filters = {
    urls: [
        "https://chatgpt.com/*",
        "https://chat.openai.com/*",
        "https://api.claude.ai/*",
        "https://claude.ai/*",
    ],
};

// Sends notification using chrome.notifications API
function sendNotification(details) {
    chrome.notifications.create({
        type: "basic",
        ...details,
    });
}

// Sends message using runtime API
function sendMessage(message) {
    chrome.runtime.sendMessage({ message }, (response) => {
        if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        } else {
        console.log("Response received:", response);
        }
    });
}

// Handling network requests
function webRequestHandler(responseType, details) {
    const url = details.url;

    if (url === CHATGPT_CONVERSATION_URL) {
        messageHandler({ message: responseType, platform: PLATFORM_CHAT_GPT });
    }

    if (CLAUDE_CONVERSATION_URL_PATTERN.test(url)) {
        messageHandler({ message: responseType, platform: PLATFORM_CLAUDE_AI });
    }
}

// Message handler for webRequestHandler and chrome.runtime.onMessage API
function messageHandler(request, sender, sendResponse) {
    const { message, platform } = request;

  // Notify user when response is streaming and completed
    if (message === RESPONSE_STREAMING) {
        console.log(`Miro: Response is being streamed by ${platform}`);
    } else if (message === RESPONSE_COMPLETED) {
        console.log(`Miro: Response is completed by ${platform}`);
        sendNotification({
        iconUrl: "images/icon128.png",
        title: platform,
        message: `${platform} has finished its response.`,
        });
    } else if (message === RESPONSE_REQUESTED) {
        console.log(`Miro: Question asked by user using ${platform}`);
    } else {
        console.error("Miro: Unrecognized message:", message);
    }
}

// Notify when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    sendNotification({
        iconUrl: "images/icon128.png",
        title: "Miro",
        message: "Miro has been installed successfully",
    });
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "responseComplete") {
        console.log("Received ChatGPT message in background script");
        sendResponse({ status: "notification sent" });
    } else if (request.message === "claudeResponseComplete") {
        console.log("Received Claude message in background script");
        chrome.notifications.create({
        type: "basic",
        iconUrl: "images/icon128.png",
        title: "Claude Response Complete",
        message: "Claude has finished its response.",
        });
        sendResponse({ status: "notification sent" });
    } else {
        sendResponse({ status: "unknown message" });
    }
});

// Listening for network requests for conversation
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => webRequestHandler(RESPONSE_REQUESTED, details),
    filters,
    ["requestHeaders"]
);

chrome.webRequest.onResponseStarted.addListener(
    (details) => webRequestHandler(RESPONSE_STREAMING, details),
    filters
);

chrome.webRequest.onCompleted.addListener(
    (details) => webRequestHandler(RESPONSE_COMPLETED, details),
    filters
);

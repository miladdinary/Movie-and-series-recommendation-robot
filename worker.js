// Cloudflare Workers script for a Telegram Movie & Series Bot

const GENRES = {
  Action: 28,
  Comedy: 35,
  Drama: 18,
  Romance: 10749,
  SciFi: 878,
  Thriller: 53,
  Horror: 27,
  Animation: 16,
  Mystery: 9648,
  Adventure: 12,
};

// Simple in-memory session store (keyed by Telegram chat id)
const sessionStore = new Map();

// --- Telegram API helper functions ---
function tgApi(env) {
  const TELEGRAM_API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
  return {
    async sendMessage(chatId, text, options = {}) {
      const body = { chat_id: chatId, text, parse_mode: "Markdown", ...options };
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async sendPhoto(chatId, photoUrl, caption, options = {}) {
      const body = {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "Markdown",
        ...options,
      };
      await fetch(`${TELEGRAM_API}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async editMessageText(chatId, messageId, text, options = {}) {
      const body = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "Markdown",
        ...options,
      };
      await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async answerCallbackQuery(callbackQueryId, text = "") {
      const body = { callback_query_id: callbackQueryId, text };
      await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async deleteMessage(chatId, messageId) {
      const body = { chat_id: chatId, message_id: messageId };
      await fetch(`${TELEGRAM_API}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
  };
}

// --- TMDB API helper functions ---
async function fetchMovieDetails(env, movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?append_to_response=credits`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${env.TMDB_BEARER_TOKEN}`,
      },
    });
    const data = await res.json();
    const casts = (data.credits?.cast || []).slice(0, 5).map((c) => c.name).join(", ") || "N/A";
    const movieGenres = (data.genres || []).map((g) => g.name).join(", ") || "N/A";
    const runtime = data.runtime ? `${data.runtime} minutes` : "N/A";
    const country =
      data.production_countries && data.production_countries.length > 0
        ? data.production_countries[0].name
        : "N/A";
    const releaseDate = data.release_date || "N/A";
    return { casts, genres: movieGenres, runtime, country, releaseDate };
  } catch (e) {
    console.error("Error fetching movie details:", e);
    return { casts: "N/A", genres: "N/A", runtime: "N/A", country: "N/A", releaseDate: "N/A" };
  }
}

async function fetchSeriesDetails(env, seriesId) {
  const url = `https://api.themoviedb.org/3/tv/${seriesId}?append_to_response=credits`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${env.TMDB_BEARER_TOKEN}`,
      },
    });
    const data = await res.json();
    const casts = (data.credits?.cast || []).slice(0, 5).map((c) => c.name).join(", ") || "N/A";
    const seriesGenres = (data.genres || []).map((g) => g.name).join(", ") || "N/A";
    const runtime =
      data.episode_run_time && data.episode_run_time.length > 0
        ? `${data.episode_run_time[0]} minutes`
        : "N/A";
    const country =
      data.production_countries && data.production_countries.length > 0
        ? data.production_countries[0].name
        : "N/A";
    const releaseDate = data.first_air_date || "N/A";
    return { casts, genres: seriesGenres, runtime, country, releaseDate };
  } catch (e) {
    console.error("Error fetching series details:", e);
    return { casts: "N/A", genres: "N/A", runtime: "N/A", country: "N/A", releaseDate: "N/A" };
  }
}

// --- Translation helper (unofficial Google Translate endpoint) ---
async function translator(text, targetLang = "fa") {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url);
    const json = await res.json();
    const translated = json[0].map((item) => item[0]).join("");
    return translated;
  } catch (e) {
    console.error("Error translating text:", e);
    return text;
  }
}

// --- Bot UI functions ---
async function initialMenu(env, chatId, firstName = "User") {
  const { sendMessage } = tgApi(env);
  const text = `Hello ${firstName} Dear😍!\n Welcome to the Movie & Series Bot😊\n\nChoose an option😁👍:`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "🎬Movie", callback_data: "movie" }],
      [{ text: "📺Series", callback_data: "series" }],
      [{ text: "🔍Search", callback_data: "search" }],
    ],
  };
  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function showGenres(env, chatId, firstName = null, messageId = null) {
  const { sendMessage, editMessageText } = tgApi(env);
  const text = "Please select a genre 🎞️:";
  const inline_keyboard = Object.entries(GENRES).map(([genre, id]) => [
    { text: genre, callback_data: String(id) },
  ]);
  const markup = { reply_markup: { inline_keyboard } };

  if (messageId) {
    await editMessageText(chatId, messageId, text, markup);
  } else {
    await sendMessage(chatId, text, markup);
  }
}

// --- Bot functionality handlers ---
async function handleGenreSelection(env, callbackQuery) {
  const { answerCallbackQuery, deleteMessage, sendPhoto, sendMessage } = tgApi(env);

  const data = callbackQuery.data;
  const callbackId = callbackQuery.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const session = sessionStore.get(chatId) || { contentType: "movie" };

  if (data === "back") {
    await answerCallbackQuery(callbackId);
    // Delete the result message (photo/text)
    await deleteMessage(chatId, messageId);
    // Show genres again (as a new message)
    await showGenres(env, chatId, callbackQuery.message.chat.first_name, null);
    return;
  }

  const genreId = data;
  const contentType = session.contentType || "movie";
  const tmdbUrl =
    contentType === "movie"
      ? `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}`
      : `https://api.themoviedb.org/3/discover/tv?with_genres=${genreId}`;

  try {
    const res = await fetch(tmdbUrl, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${env.TMDB_BEARER_TOKEN}`,
      },
    });
    const json = await res.json();
    const results = json.results || [];
    if (!results.length) {
      await answerCallbackQuery(callbackId, "No results found for this genre.");
      return;
    }

    const item = results[Math.floor(Math.random() * results.length)];
    const title = item.title || item.name || "Unknown";
    const overview = item.overview || "No description available.";
    const voteAverage = item.vote_average || "N/A";
    const posterPath = item.poster_path;
    const itemId = item.id;

    const details =
      contentType === "movie"
        ? await fetchMovieDetails(env, itemId)
        : await fetchSeriesDetails(env, itemId);

    const translatedOverview = await translator(overview, "fa");
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;

    const messageText =
      `*🎬 Name:* ${title}\n\n` +
      `_🧐 Overview:_ ${translatedOverview}\n` +
      `_✨ Rating:_ ${voteAverage}\n` +
      `_😎 Casts:_ ${details.casts}\n` +
      `_🎞️ Genres:_ ${details.genres}\n` +
      `_⏳ Runtime:_ ${details.runtime}\n` +
      `_📌 Country:_ ${details.country}\n` +
      `_🗓️ Release Date:_ ${details.releaseDate}`;

    const backKeyboard = { inline_keyboard: [[{ text: "Back", callback_data: "back" }]] };

    await answerCallbackQuery(callbackId);

    // Remove the previous genres menu so it doesn't stick around
    await deleteMessage(chatId, messageId);

    if (posterUrl) {
      await sendPhoto(chatId, posterUrl, messageText, { reply_markup: backKeyboard });
    } else {
      await sendMessage(chatId, `${messageText}\n\n(Image not available.)`, {
        reply_markup: backKeyboard,
      });
    }
  } catch (e) {
    console.error("Error fetching data from TMDB API:", e);
    await answerCallbackQuery(callbackId, "Error fetching data from TMDB. Please try again later.");
  }
}

async function handleSearchMovie(env, message) {
  const { sendMessage, sendPhoto } = tgApi(env);

  const chatId = message.chat.id;
  let userInput = message.text;
  if (userInput.startsWith("/search")) {
    userInput = userInput.split(" ").slice(1).join(" ");
  }
  if (!userInput) {
    await sendMessage(chatId, "Please enter a title.\nExample: /search Titanic");
    return;
  }

  const session = sessionStore.get(chatId) || { contentType: "movie" };
  session.waitingForSearchInput = false;
  sessionStore.set(chatId, session);

  const query = await translator(userInput, "en");
  const contentType = session.contentType || "movie";
  const tmdbUrl =
    contentType === "movie"
      ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}`
      : `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(tmdbUrl, {
      headers: { accept: "application/json", Authorization: `Bearer ${env.TMDB_BEARER_TOKEN}` },
    });
    const json = await res.json();
    const results = json.results || [];
    if (!results.length) {
      await sendMessage(chatId, "Sorry, the requested content could not be found. Apologies.");
      return;
    }
    const item = results[0];
    const title = item.title || item.name || "Unknown";
    const overview = item.overview || "No description available.";
    const voteAverage = item.vote_average || "N/A";
    const posterPath = item.poster_path;
    const itemId = item.id;

    const details =
      contentType === "movie"
        ? await fetchMovieDetails(env, itemId)
        : await fetchSeriesDetails(env, itemId);

    const translatedOverview = await translator(overview, "fa");
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    const messageText =
      `*🎬 Name:* ${title}\n\n` +
      `_🧐 Overview:_ ${translatedOverview}\n` +
      `_✨ Rating:_ ${voteAverage}\n` +
      `_😎 Casts:_ ${details.casts}\n` +
      `_🎞️ Genres:_ ${details.genres}\n` +
      `_⏳ Runtime:_ ${details.runtime}\n` +
      `_📌 Country:_ ${details.country}\n` +
      `_🗓️ Release Date:_ ${details.releaseDate}`;

    if (posterUrl) {
      await sendPhoto(chatId, posterUrl, messageText);
    } else {
      await sendMessage(chatId, `${messageText}\n\n(Image not available.)`);
    }
  } catch (e) {
    console.error("Error fetching data from TMDB API:", e);
    await sendMessage(chatId, "Error fetching data from TMDB. Please try again later.");
  }
}

// --- Update Router ---
async function handleUpdate(env, update) {
  const { sendMessage, editMessageText, answerCallbackQuery } = tgApi(env);

  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const session =
      sessionStore.get(chatId) || { contentType: "movie", waitingForSearchInput: false };
    sessionStore.set(chatId, session);

    const text = message.text || "";
    if (text.startsWith("/start")) {
      await initialMenu(env, chatId, message.chat.first_name);
    } else if (text.startsWith("/search")) {
      session.waitingForSearchInput = true;
      sessionStore.set(chatId, session);
      await sendMessage(chatId, "Please enter the movie/series name you want to search for:");
    } else if (session.waitingForSearchInput) {
      await handleSearchMovie(env, message);
    }
  } else if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const msgId = cq.message.message_id;
    const session =
      sessionStore.get(chatId) || { contentType: "movie", waitingForSearchInput: false };
    sessionStore.set(chatId, session);
    const data = cq.data;

    if (data === "movie" || data === "series") {
      session.contentType = data;
      sessionStore.set(chatId, session);
      await answerCallbackQuery(cq.id);
      await showGenres(env, chatId, cq.message.chat.first_name, msgId); // edit in-place
      return;
    }

    if (data === "search") {
      await answerCallbackQuery(cq.id);
      session.waitingForSearchInput = true;
      sessionStore.set(chatId, session);
      await editMessageText(chatId, msgId, "Please enter the movie/series name you want to search for:");
      return;
    }

    // Otherwise it's a genre id or "back"
    await handleGenreSelection(env, cq);
  }
}

// --- Cloudflare Worker fetch handler ---
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Special route to set the webhook
      if (url.pathname === "/setWebhook") {
        const webhook = env.WEBHOOK_URL || `${url.origin}/`;
        const setWebhookUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
          webhook
        )}`;
        const resp = await fetch(setWebhookUrl, { method: "GET" });
        const body = await resp.text();
        return new Response(body, { status: 200 });
      }

      // Process POST requests as Telegram updates
      if (request.method !== "POST") {
        return new Response("This endpoint is the Telegram bot webhook.", { status: 200 });
      }

      const update = await request.json();
      await handleUpdate(env, update);
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Error processing request:", err);
      return new Response("OK", { status: 200 });
    }
  },
};

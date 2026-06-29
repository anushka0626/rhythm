//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region spotify.js
var require_spotify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	async function playTrack(accessToken, trackUri, deviceId = null, startPositionMs = 0) {
		try {
			let playUrl = "https://api.spotify.com/v1/me/player/play";
			if (deviceId) playUrl += `?device_id=${deviceId}`;
			const response = await fetch(playUrl, {
				method: "PUT",
				headers: {
					"Authorization": `Bearer ${accessToken}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					uris: [trackUri],
					position_ms: startPositionMs
				})
			});
			console.log("Track URI:", trackUri);
			console.log("Device ID:", deviceId);
			console.log("Status:", response.status);
			const body = await response.text();
			console.log("response:", body);
			if (response.status === 204) {
				console.log(`Track command sent successfully: ${trackUri}`);
				return true;
			}
			console.error(`Playback rejection status: ${response.status}`);
			return false;
		} catch (error) {
			console.error("Error executing playTrack:", error);
			return false;
		}
	}
	async function pausePlayback(accessToken, deviceId = null) {
		try {
			let pauseUrl = "https://api.spotify.com/v1/me/player/pause";
			if (deviceId) pauseUrl += `?device_id=${deviceId}`;
			const response = await fetch(pauseUrl, {
				method: "PUT",
				headers: { "Authorization": `Bearer ${accessToken}` }
			});
			console.log("Pause Status:", response.status);
			return response.ok || response.status === 204;
		} catch (error) {
			console.error("Error executing pausePlayback:", error);
			return false;
		}
	}
	async function seekToPosition(accessToken, positionMs, deviceId) {
		try {
			const seekUrl = `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`;
			const response = await fetch(seekUrl, {
				method: "PUT",
				headers: { "Authorization": `Bearer ${accessToken}` }
			});
			console.log("Seek Status:", response.status);
			const responseText = await response.text();
			console.log("Seek Response:", responseText);
			if (response.ok) {
				console.log(`Hook jump successful: ${(positionMs / 1e3).toFixed(2)}s`);
				return true;
			}
			console.error("Failed to execute position seek:", response.status);
			return false;
		} catch (error) {
			console.error("Error executing seekToPosition:", error);
			return false;
		}
	}
	async function getPlaylistTracks(accessToken, playlistId) {
		const items = [];
		let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;
		console.log("Playlist ID:", playlistId);
		console.log("Token exists:", !!accessToken);
		while (url) {
			const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
			console.log("Playlist status:", response.status);
			const text = await response.text();
			console.log("playlist response:", text);
			if (!text) return null;
			const page = JSON.parse(text);
			if (!response.ok) {
				const error = /* @__PURE__ */ new Error(`Spotify playlist request failed with ${response.status}`);
				error.status = response.status;
				error.body = page;
				throw error;
			}
			items.push(...Array.isArray(page.items) ? page.items : []);
			url = page.next || null;
		}
		return { items };
	}
	async function getAudioFeatures(accessToken, trackIds) {
		const ids = [...new Set((trackIds || []).filter(Boolean))];
		const audioFeatures = [];
		for (let i = 0; i < ids.length; i += 100) {
			const batch = ids.slice(i, i + 100);
			const url = `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(batch.join(","))}`;
			const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
			const text = await response.text();
			if (!response.ok) {
				const error = /* @__PURE__ */ new Error(`Spotify audio features request failed with ${response.status}`);
				error.status = response.status;
				error.body = text;
				throw error;
			}
			const data = text ? JSON.parse(text) : {};
			audioFeatures.push(...Array.isArray(data.audio_features) ? data.audio_features : []);
		}
		return audioFeatures;
	}
	async function getArtists(accessToken, artistIds) {
		const ids = [...new Set((artistIds || []).filter(Boolean))];
		const artists = [];
		for (let i = 0; i < ids.length; i += 50) {
			const batch = ids.slice(i, i + 50);
			const url = `https://api.spotify.com/v1/artists?ids=${encodeURIComponent(batch.join(","))}`;
			const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
			const text = await response.text();
			if (!response.ok) {
				const error = /* @__PURE__ */ new Error(`Spotify artist metadata request failed with ${response.status}`);
				error.status = response.status;
				error.body = text;
				throw error;
			}
			const data = text ? JSON.parse(text) : {};
			artists.push(...Array.isArray(data.artists) ? data.artists : []);
		}
		return artists;
	}
	async function getAudioAnalysis(accessToken, trackId) {
		try {
			const url = `https://api.spotify.com/v1/audio-analysis/${trackId}`;
			const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
			if (!response.ok) throw new Error(`Spotify audio analysis failed with status ${response.status}`);
			const text = await response.text();
			return text ? JSON.parse(text) : null;
		} catch (error) {
			console.error("error executing getAudioAnalysis: ", error);
			throw error;
		}
	}
	module.exports = {
		playTrack,
		pausePlayback,
		seekToPosition,
		getPlaylistTracks,
		getAudioFeatures,
		getArtists,
		getAudioAnalysis
	};
}));
//#endregion
//#region node_modules/dotenv/lib/main.js
var require_main = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$1 = require("fs");
	var path$1 = require("path");
	var os = require("os");
	var crypto = require("crypto");
	var TIPS = [
		"◈ encrypted .env [www.dotenvx.com]",
		"◈ secrets for agents [www.dotenvx.com]",
		"⌁ auth for agents [www.vestauth.com]",
		"⌘ custom filepath { path: '/custom/path/.env' }",
		"⌘ enable debugging { debug: true }",
		"⌘ override existing { override: true }",
		"⌘ suppress logs { quiet: true }",
		"⌘ multiple files { path: ['.env.local', '.env'] }"
	];
	function _getRandomTip() {
		return TIPS[Math.floor(Math.random() * TIPS.length)];
	}
	function parseBoolean(value) {
		if (typeof value === "string") return ![
			"false",
			"0",
			"no",
			"off",
			""
		].includes(value.toLowerCase());
		return Boolean(value);
	}
	function supportsAnsi() {
		return process.stdout.isTTY;
	}
	function dim(text) {
		return supportsAnsi() ? `\x1b[2m${text}\x1b[0m` : text;
	}
	var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;
	function parse(src) {
		const obj = {};
		let lines = src.toString();
		lines = lines.replace(/\r\n?/gm, "\n");
		let match;
		while ((match = LINE.exec(lines)) != null) {
			const key = match[1];
			let value = match[2] || "";
			value = value.trim();
			const maybeQuote = value[0];
			value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
			if (maybeQuote === "\"") {
				value = value.replace(/\\n/g, "\n");
				value = value.replace(/\\r/g, "\r");
			}
			obj[key] = value;
		}
		return obj;
	}
	function _parseVault(options) {
		options = options || {};
		const vaultPath = _vaultPath(options);
		options.path = vaultPath;
		const result = DotenvModule.configDotenv(options);
		if (!result.parsed) {
			const err = /* @__PURE__ */ new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
			err.code = "MISSING_DATA";
			throw err;
		}
		const keys = _dotenvKey(options).split(",");
		const length = keys.length;
		let decrypted;
		for (let i = 0; i < length; i++) try {
			const attrs = _instructions(result, keys[i].trim());
			decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
			break;
		} catch (error) {
			if (i + 1 >= length) throw error;
		}
		return DotenvModule.parse(decrypted);
	}
	function _warn(message) {
		console.error(`⚠ ${message}`);
	}
	function _debug(message) {
		console.log(`┆ ${message}`);
	}
	function _log(message) {
		console.log(`◇ ${message}`);
	}
	function _dotenvKey(options) {
		if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) return options.DOTENV_KEY;
		if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) return process.env.DOTENV_KEY;
		return "";
	}
	function _instructions(result, dotenvKey) {
		let uri;
		try {
			uri = new URL(dotenvKey);
		} catch (error) {
			if (error.code === "ERR_INVALID_URL") {
				const err = /* @__PURE__ */ new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
				err.code = "INVALID_DOTENV_KEY";
				throw err;
			}
			throw error;
		}
		const key = uri.password;
		if (!key) {
			const err = /* @__PURE__ */ new Error("INVALID_DOTENV_KEY: Missing key part");
			err.code = "INVALID_DOTENV_KEY";
			throw err;
		}
		const environment = uri.searchParams.get("environment");
		if (!environment) {
			const err = /* @__PURE__ */ new Error("INVALID_DOTENV_KEY: Missing environment part");
			err.code = "INVALID_DOTENV_KEY";
			throw err;
		}
		const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
		const ciphertext = result.parsed[environmentKey];
		if (!ciphertext) {
			const err = /* @__PURE__ */ new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
			err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
			throw err;
		}
		return {
			ciphertext,
			key
		};
	}
	function _vaultPath(options) {
		let possibleVaultPath = null;
		if (options && options.path && options.path.length > 0) if (Array.isArray(options.path)) {
			for (const filepath of options.path) if (fs$1.existsSync(filepath)) possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
		} else possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
		else possibleVaultPath = path$1.resolve(process.cwd(), ".env.vault");
		if (fs$1.existsSync(possibleVaultPath)) return possibleVaultPath;
		return null;
	}
	function _resolveHome(envPath) {
		return envPath[0] === "~" ? path$1.join(os.homedir(), envPath.slice(1)) : envPath;
	}
	function _configVault(options) {
		const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
		const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
		if (debug || !quiet) _log("loading env from encrypted .env.vault");
		const parsed = DotenvModule._parseVault(options);
		let processEnv = process.env;
		if (options && options.processEnv != null) processEnv = options.processEnv;
		DotenvModule.populate(processEnv, parsed, options);
		return { parsed };
	}
	function configDotenv(options) {
		const dotenvPath = path$1.resolve(process.cwd(), ".env");
		let encoding = "utf8";
		let processEnv = process.env;
		if (options && options.processEnv != null) processEnv = options.processEnv;
		let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
		let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
		if (options && options.encoding) encoding = options.encoding;
		else if (debug) _debug("no encoding is specified (UTF-8 is used by default)");
		let optionPaths = [dotenvPath];
		if (options && options.path) if (!Array.isArray(options.path)) optionPaths = [_resolveHome(options.path)];
		else {
			optionPaths = [];
			for (const filepath of options.path) optionPaths.push(_resolveHome(filepath));
		}
		let lastError;
		const parsedAll = {};
		for (const path of optionPaths) try {
			const parsed = DotenvModule.parse(fs$1.readFileSync(path, { encoding }));
			DotenvModule.populate(parsedAll, parsed, options);
		} catch (e) {
			if (debug) _debug(`failed to load ${path} ${e.message}`);
			lastError = e;
		}
		const populated = DotenvModule.populate(processEnv, parsedAll, options);
		debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
		quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
		if (debug || !quiet) {
			const keysCount = Object.keys(populated).length;
			const shortPaths = [];
			for (const filePath of optionPaths) try {
				const relative = path$1.relative(process.cwd(), filePath);
				shortPaths.push(relative);
			} catch (e) {
				if (debug) _debug(`failed to load ${filePath} ${e.message}`);
				lastError = e;
			}
			_log(`injected env (${keysCount}) from ${shortPaths.join(",")} ${dim(`// tip: ${_getRandomTip()}`)}`);
		}
		if (lastError) return {
			parsed: parsedAll,
			error: lastError
		};
		else return { parsed: parsedAll };
	}
	function config(options) {
		if (_dotenvKey(options).length === 0) return DotenvModule.configDotenv(options);
		const vaultPath = _vaultPath(options);
		if (!vaultPath) {
			_warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`);
			return DotenvModule.configDotenv(options);
		}
		return DotenvModule._configVault(options);
	}
	function decrypt(encrypted, keyStr) {
		const key = Buffer.from(keyStr.slice(-64), "hex");
		let ciphertext = Buffer.from(encrypted, "base64");
		const nonce = ciphertext.subarray(0, 12);
		const authTag = ciphertext.subarray(-16);
		ciphertext = ciphertext.subarray(12, -16);
		try {
			const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
			aesgcm.setAuthTag(authTag);
			return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
		} catch (error) {
			const isRange = error instanceof RangeError;
			const invalidKeyLength = error.message === "Invalid key length";
			const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
			if (isRange || invalidKeyLength) {
				const err = /* @__PURE__ */ new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
				err.code = "INVALID_DOTENV_KEY";
				throw err;
			} else if (decryptionFailed) {
				const err = /* @__PURE__ */ new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
				err.code = "DECRYPTION_FAILED";
				throw err;
			} else throw error;
		}
	}
	function populate(processEnv, parsed, options = {}) {
		const debug = Boolean(options && options.debug);
		const override = Boolean(options && options.override);
		const populated = {};
		if (typeof parsed !== "object") {
			const err = /* @__PURE__ */ new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
			err.code = "OBJECT_REQUIRED";
			throw err;
		}
		for (const key of Object.keys(parsed)) if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
			if (override === true) {
				processEnv[key] = parsed[key];
				populated[key] = parsed[key];
			}
			if (debug) if (override === true) _debug(`"${key}" is already defined and WAS overwritten`);
			else _debug(`"${key}" is already defined and was NOT overwritten`);
		} else {
			processEnv[key] = parsed[key];
			populated[key] = parsed[key];
		}
		return populated;
	}
	var DotenvModule = {
		configDotenv,
		_configVault,
		_parseVault,
		config,
		decrypt,
		parse,
		populate
	};
	module.exports.configDotenv = DotenvModule.configDotenv;
	module.exports._configVault = DotenvModule._configVault;
	module.exports._parseVault = DotenvModule._parseVault;
	module.exports.config = DotenvModule.config;
	module.exports.decrypt = DotenvModule.decrypt;
	module.exports.parse = DotenvModule.parse;
	module.exports.populate = DotenvModule.populate;
	module.exports = DotenvModule;
}));
//#endregion
//#region main.js
var { BrowserWindow, app, ipcMain, dialog } = require("electron");
var fs = require("fs");
var path = require("path");
var spotifyController = require_spotify();
if (process.platform === "linux") {
	app.commandLine.appendSwitch("disable-gpu-rasterization");
	app.commandLine.appendSwitch("disable-software-rasterizer");
}
require_main().config({ path: path.join(__dirname, ".env") });
process.env.CLIENT_ID;
process.env.CLIENT_SECRET;
var mainWindow;
var STORE_VERSION = 1;
var DEFAULT_HOOK_LENGTH = 30 * 1e3;
function createEmptyStore() {
	return {
		version: STORE_VERSION,
		hookDb: {},
		sessions: {},
		activeSession: {
			name: "Untitled Session",
			queue: [],
			updatedAt: null
		}
	};
}
function getStorePath() {
	return path.join(app.getPath("userData"), "rhythm-store.json");
}
function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeHookEnd(value, start) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > start ? parsed : start + DEFAULT_HOOK_LENGTH;
}
function normalizeHookDb(rawHookDb = {}) {
	const hookDb = {};
	Object.entries(rawHookDb || {}).forEach(([uri, hook]) => {
		if (!uri) return;
		if (typeof hook === "number") {
			hookDb[uri] = {
				start: toNumber(hook),
				end: toNumber(hook) + DEFAULT_HOOK_LENGTH
			};
			return;
		}
		const start = toNumber(hook && hook.start);
		hookDb[uri] = {
			start,
			end: normalizeHookEnd(hook && hook.end, start)
		};
	});
	return hookDb;
}
function normalizeQueue(queue = []) {
	if (!Array.isArray(queue)) return [];
	return queue.filter((track) => track && track.uri).map((track) => {
		const hookStart = toNumber(track.hookStart);
		return {
			id: track.id ? String(track.id) : "",
			uri: String(track.uri),
			name: String(track.name || "Untitled Track"),
			artist: track.artist ? String(track.artist) : "",
			artistIds: Array.isArray(track.artistIds) ? track.artistIds.map(String) : [],
			genres: Array.isArray(track.genres) ? track.genres.map(String) : [],
			albumName: track.albumName ? String(track.albumName) : "",
			releaseDate: track.releaseDate ? String(track.releaseDate) : "",
			durationMs: toNumber(track.durationMs),
			popularity: toNumber(track.popularity),
			hookStart,
			hookEnd: normalizeHookEnd(track.hookEnd, hookStart),
			analysis: track.analysis && typeof track.analysis === "object" ? track.analysis : null,
			transition: track.transition && typeof track.transition === "object" ? track.transition : null
		};
	});
}
function normalizeSession(rawSession = {}) {
	rawSession = rawSession || {};
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		name: String(rawSession.name || "Untitled Session").trim() || "Untitled Session",
		moodKey: rawSession.moodKey ? String(rawSession.moodKey) : "balanced",
		queue: normalizeQueue(rawSession.queue || rawSession.sessionQueue),
		createdAt: rawSession.createdAt || now,
		updatedAt: rawSession.updatedAt || now
	};
}
function normalizeSessions(rawSessions = {}) {
	const sessions = {};
	Object.entries(rawSessions || {}).forEach(([key, rawSession]) => {
		const session = normalizeSession({
			name: rawSession && rawSession.name ? rawSession.name : key,
			...rawSession
		});
		sessions[session.name] = session;
	});
	return sessions;
}
function normalizeStore(rawStore = {}) {
	const emptyStore = createEmptyStore();
	const activeSession = normalizeSession(rawStore.activeSession || emptyStore.activeSession);
	return {
		version: STORE_VERSION,
		hookDb: normalizeHookDb(rawStore.hookDb),
		sessions: normalizeSessions(rawStore.sessions),
		activeSession
	};
}
function getImportSessionPayload(rawPayload = {}) {
	if (rawPayload.session) return rawPayload.session;
	if (rawPayload.activeSession) return rawPayload.activeSession;
	if (rawPayload.queue || rawPayload.sessionQueue) return rawPayload;
	if (rawPayload.sessions && typeof rawPayload.sessions === "object") {
		const firstSession = Object.values(rawPayload.sessions)[0];
		if (firstSession) return firstSession;
	}
	return null;
}
function safeFileName(value) {
	return String(value || "rhythm-session").replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "rhythm-session";
}
async function readStore() {
	try {
		const raw = await fs.promises.readFile(getStorePath(), "utf8");
		return normalizeStore(JSON.parse(raw));
	} catch (error) {
		if (error.code !== "ENOENT") console.error("Could not read Rhythm store:", error);
		return createEmptyStore();
	}
}
async function writeStore(store) {
	const normalizedStore = normalizeStore(store);
	const storePath = getStorePath();
	await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
	await fs.promises.writeFile(storePath, JSON.stringify(normalizedStore, null, 2), "utf8");
	return normalizedStore;
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getPlaybackDevice(preferredDeviceId = null) {
	if (!global.spotifyAccessToken) throw new Error("Spotify is not connected.");
	const devicesData = await (await fetch("https://api.spotify.com/v1/me/player/devices", { headers: { Authorization: `Bearer ${global.spotifyAccessToken}` } })).json();
	const devices = Array.isArray(devicesData.devices) ? devicesData.devices : [];
	if (!devices.length) return null;
	return devices.find((device) => device.id === preferredDeviceId) || devices.find((device) => device.is_active) || devices[0];
}
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			partition: "trusted" + Date.now(),
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js")
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWinow.webContents.openDevTools();
	} else mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
}
app.whenReady().then(() => {
	createWindow();
});
ipcMain.handle("store-load", async () => {
	return readStore();
});
ipcMain.handle("store-save", async (event, storePatch) => {
	return writeStore({
		...await readStore(),
		...storePatch || {}
	});
});
ipcMain.handle("export-session", async (event, payload) => {
	const session = normalizeSession(payload && (payload.session || payload.activeSession) || payload);
	const hookDb = normalizeHookDb(payload && payload.hookDb);
	const exportPayload = {
		version: STORE_VERSION,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		session,
		hookDb
	};
	const result = await dialog.showSaveDialog(mainWindow, {
		title: "Export Rhythm Session",
		defaultPath: `${safeFileName(session.name)}.rhythm-session.json`,
		filters: [{
			name: "Rhythm Session",
			extensions: ["json"]
		}, {
			name: "All Files",
			extensions: ["*"]
		}]
	});
	if (result.canceled || !result.filePath) return { canceled: true };
	await fs.promises.writeFile(result.filePath, JSON.stringify(exportPayload, null, 2), "utf8");
	return {
		canceled: false,
		filePath: result.filePath
	};
});
ipcMain.handle("import-session", async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		title: "Import Rhythm Session",
		properties: ["openFile"],
		filters: [{
			name: "Rhythm Session",
			extensions: ["json"]
		}, {
			name: "All Files",
			extensions: ["*"]
		}]
	});
	if (result.canceled || !result.filePaths.length) return { canceled: true };
	const raw = await fs.promises.readFile(result.filePaths[0], "utf8");
	const parsed = JSON.parse(raw);
	const importedSession = getImportSessionPayload(parsed);
	if (!importedSession) throw new Error("The selected file does not contain a Rhythm session.");
	return {
		canceled: false,
		filePath: result.filePaths[0],
		session: normalizeSession(importedSession),
		hookDb: normalizeHookDb(parsed.hookDb)
	};
});
ipcMain.handle("analyze-track-structure", async (event, previewUrl) => {
	return new Promise(async (resolve) => {
		try {
			const { execFile } = require("child_process");
			const os = require("os");
			const crypto = require("crypto");
			if (!previewUrl || !previewUrl.startsWith("http")) return resolve({
				ok: false,
				error: "No valid 30-second preview URL hosted on Spotify CDN."
			});
			const tempFileName = `rhythm-${crypto.randomBytes(6).toString("hex")}.mp3`;
			const tempFilePath = path.join(os.tmpdir(), tempFileName);
			console.log(`Downloading stream fragment for intelligence parsing: ${previewUrl}`);
			const response = await fetch(previewUrl);
			if (!response.ok) throw new Error("Failed downloading segment from audio stream provider.");
			const buffer = Buffer.from(await response.arrayBuffer());
			await fs.promises.writeFile(tempFilePath, buffer);
			execFile("python3", [path.join(app.getAppPath(), "analyzer.py"), tempFilePath], async (error, stdout, stderr) => {
				try {
					await fs.promises.unlink(tempFilePath);
				} catch (e) {}
				if (error) {
					console.error("Python DSP pipeline crash:", stderr || error.message);
					return resolve({
						ok: false,
						error: "Audio engine execution failed"
					});
				}
				try {
					resolve(JSON.parse(stdout.trim()));
				} catch (parseError) {
					console.error("Malformed child engine output:", stdout);
					resolve({
						ok: false,
						error: "Failed to read engine output matrix"
					});
				}
			});
		} catch (error) {
			console.error("IPC analysis execution crash:", error);
			resolve({
				ok: false,
				error: error.message
			});
		}
	});
});
ipcMain.on("spotify-login-trigger", () => {
	const CLIENT_ID = process.env.CLIENT_ID;
	const REDIRECT_URI = process.env.REDIRECT_URI;
	const SCOPES = [
		"user-modify-playback-state",
		"user-read-playback-state",
		"user-read-currently-playing",
		"playlist-read-private",
		"playlist-read-collaborative"
	].join(" ");
	const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
	const authWindow = new BrowserWindow({
		width: 600,
		height: 800,
		show: true,
		alwaysOnTop: true,
		autoHideMenuBar: true
	});
	authWindow.loadURL(authUrl);
	authWindow.webContents.on("will-navigate", (event, url) => {
		handleCallbackUrl(url, authWindow);
	});
	authWindow.webContents.on("did-redirect-navigation", (event, url) => {
		handleCallbackUrl(url, authWindow);
	});
});
ipcMain.handle("fetch-playlist", async (event, playlistId) => {
	try {
		return await spotifyController.getPlaylistTracks(global.spotifyAccessToken, playlistId);
	} catch (err) {
		console.error(err);
		return null;
	}
});
ipcMain.handle("analyze-tracks", async (event, payload) => {
	const trackIds = Array.isArray(payload) ? payload : payload && Array.isArray(payload.trackIds) ? payload.trackIds : [];
	const artistIds = payload && Array.isArray(payload.artistIds) ? payload.artistIds : [];
	let features = [];
	let artists = [];
	let featureError = null;
	let artistError = null;
	try {
		features = await spotifyController.getAudioFeatures(global.spotifyAccessToken, trackIds);
	} catch (error) {
		featureError = error;
		console.error("Audio features unavailable:", error);
	}
	try {
		artists = await spotifyController.getArtists(global.spotifyAccessToken, artistIds);
	} catch (error) {
		artistError = error;
		console.error("Artist metadata unavailable:", error);
	}
	return {
		ok: !featureError || !artistError,
		features,
		artists,
		featureError: featureError ? {
			status: featureError.status || null,
			message: featureError.message
		} : null,
		artistError: artistError ? {
			status: artistError.status || null,
			message: artistError.message
		} : null
	};
});
ipcMain.handle("play-hook", async (event, trackUri, hookTime, preferredDeviceId = null) => {
	try {
		const hookPositionMs = Math.max(0, toNumber(hookTime));
		const device = await getPlaybackDevice(preferredDeviceId);
		if (!device) return {
			ok: false,
			error: "No Spotify devices found."
		};
		if (!await spotifyController.playTrack(global.spotifyAccessToken, trackUri, device.id, hookPositionMs)) return {
			ok: false,
			error: "Spotify rejected playback."
		};
		await delay(500);
		return {
			ok: await spotifyController.seekToPosition(global.spotifyAccessToken, hookPositionMs, device.id),
			deviceId: device.id,
			deviceName: device.name
		};
	} catch (error) {
		console.error("Could not play hook:", error);
		return {
			ok: false,
			error: error.message || "Could not play hook."
		};
	}
});
ipcMain.handle("pause-playback", async (event, preferredDeviceId = null) => {
	try {
		const device = await getPlaybackDevice(preferredDeviceId);
		if (!device) return {
			ok: false,
			error: "No Spotify devices found."
		};
		return {
			ok: await spotifyController.pausePlayback(global.spotifyAccessToken, device.id),
			deviceId: device.id,
			deviceName: device.name
		};
	} catch (error) {
		console.error("Could not pause playback:", error);
		return {
			ok: false,
			error: error.message || "Could not pause playback."
		};
	}
});
async function handleCallbackUrl(url, authWindow) {
	if (url.includes("/callback")) {
		const code = new URL(url).searchParams.get("code");
		if (code) {
			console.log("SUCCESS! Captured raw authentication code.");
			await exchangeCodeForTokens(code);
			authWindow.close();
		}
	}
}
async function exchangeCodeForTokens(code) {
	const CLIENT_ID = process.env.CLIENT_ID;
	const CLIENT_SECRET = process.env.CLIENT_SECRET;
	const REDIRECT_URI = process.env.REDIRECT_URI;
	try {
		const tokenUrl = "https://accounts.spotify.com/api/token";
		const credentialsBase64 = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": `Basic ${credentialsBase64}`
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI
			}).toString()
		});
		const data = await response.json();
		if (response.ok) {
			console.log("\nSPOTIFY TOKENS ACQUIRED SUCCESSFULLY!\n------------------");
			global.spotifyAccessToken = data.access_token;
			if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("spotify-connected", { expiresIn: data.expires_in });
		} else console.error("Spotify API Refused Token Swap:", data);
	} catch (error) {
		console.error("Network Error during Token Exchange Execution:", error);
	}
}
//#endregion

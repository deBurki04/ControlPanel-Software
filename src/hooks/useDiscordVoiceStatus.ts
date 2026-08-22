import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { config } from "../config/config";
import { getDiscordBotToken } from "../config/runtimeSettings";
import type {
  DiscordChannel,
  DiscordGatewayHello,
  DiscordGatewayPayload,
  DiscordGuildCreateEvent,
  DiscordGuildMember,
  DiscordReadyEvent,
  DiscordVoiceState,
} from "../services/discord/types";

const DISCORD_GATEWAY_OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

const DISCORD_INTENTS = {
  GUILDS: 1 << 0,
  GUILD_VOICE_STATES: 1 << 7,
} as const;

interface DiscordBotSelf {
  id: string;
  username: string;
  bot?: boolean;
}

interface DiscordGuildInfo {
  id: string;
  name: string;
}

export type DiscordConnectionStatus =
  | "disabled"
  | "missing-token"
  | "checking"
  | "connecting"
  | "connected"
  | "ready"
  | "not-in-voice"
  | "voice"
  | "reconnecting"
  | "error";

export interface DiscordVoiceMember {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
  muted: boolean;
  deafened: boolean;
  streaming: boolean;
  video: boolean;
  suppress: boolean;
}

export interface DiscordVoiceStatus {
  status: DiscordConnectionStatus;
  error: string | null;
  guildName: string | null;
  channelName: string | null;
  me: DiscordVoiceMember | null;
  members: DiscordVoiceMember[];
  totalMembers: number;
  lastUpdated: number | null;
}

export function useDiscordVoiceStatus(): DiscordVoiceStatus {
  const [status, setStatus] = useState<DiscordConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [channelsById, setChannelsById] = useState<Record<string, DiscordChannel>>({});
  const [voiceStatesByUser, setVoiceStatesByUser] = useState<
    Record<string, DiscordVoiceState>
  >({});
  const [membersByUser, setMembersByUser] = useState<Record<string, DiscordGuildMember>>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const requestedMemberIdsRef = useRef<Set<string>>(new Set());

  const botToken = useMemo(() => getDiscordBotToken(), []);

  useEffect(() => {
    if (!config.discord.enabled) {
      setStatus("disabled");
      return;
    }

    if (!botToken) {
      setStatus("missing-token");
      setError("Discord Bot Token fehlt in den Einstellungen");
      return;
    }

    let websocket: WebSocket | null = null;
    let heartbeatTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let sequence: number | null = null;
    let closedByEffect = false;
    let reconnectAttempt = 0;

    console.info("Discord Start:", {
      guildId: config.discord.guildId,
      userId: config.discord.userId,
      tokenConfigured: botToken.length > 20,
    });

    async function validateAndConnect() {
      try {
        setStatus("checking");
        setError(null);

        const bot = await fetchDiscordBotSelf(botToken);
        console.info("Discord REST Bot:", {
          id: bot.id,
          username: bot.username,
          bot: bot.bot,
        });

        const guild = await fetchDiscordGuild(config.discord.guildId, botToken);
        console.info("Discord REST Guild:", {
          id: guild.id,
          name: guild.name,
        });

        setGuildName(guild.name);

        if (!closedByEffect) connect();
      } catch (caughtError) {
        const message = formatError(caughtError);
        console.error("Discord REST Check fehlgeschlagen:", message);

        setStatus("error");
        setError(
          `Discord REST Check fehlgeschlagen: ${message}. Token prÃ¼fen oder Bot in Server einladen.`,
        );
      }
    }

    function connect() {
      reconnectAttempt += 1;

      setStatus((previous) =>
        previous === "connected" || previous === "ready" || previous === "voice"
          ? "reconnecting"
          : "connecting",
      );

      console.info(`Discord Gateway Verbindung #${reconnectAttempt} wird geÃ¶ffnetâ€¦`);

      websocket = new WebSocket(config.discord.gatewayUrl);

      websocket.addEventListener("open", () => {
        console.info("Discord Gateway geÃ¶ffnet");
        setStatus("connected");
      });

      websocket.addEventListener("message", (event) => {
        const payload = parsePayload(event.data);
        if (!payload) return;

        if (typeof payload.s === "number") {
          sequence = payload.s;
        }

        if (payload.op === DISCORD_GATEWAY_OP.HELLO) {
          const hello = payload.d as DiscordGatewayHello;
          console.info("Discord Gateway HELLO:", {
            heartbeatInterval: hello.heartbeat_interval,
          });

          heartbeatTimer = window.setInterval(() => {
            if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

            websocket.send(
              JSON.stringify({
                op: DISCORD_GATEWAY_OP.HEARTBEAT,
                d: sequence,
              }),
            );
          }, hello.heartbeat_interval);

          identify(websocket);
          return;
        }

        if (payload.op === DISCORD_GATEWAY_OP.RECONNECT) {
          console.warn("Discord Gateway fordert Reconnect an.");
          reconnect();
          return;
        }

        if (payload.op === DISCORD_GATEWAY_OP.INVALID_SESSION) {
          console.warn("Discord Gateway INVALID_SESSION:", payload.d);
          reconnect();
          return;
        }

        if (payload.op !== DISCORD_GATEWAY_OP.DISPATCH) return;

        handleDispatch(payload);
      });

      websocket.addEventListener("error", (event) => {
        console.error("Discord Gateway WebSocket Fehler:", event);
        setError("Discord Gateway WebSocket Fehler. Close-Code prÃ¼fen.");
      });

      websocket.addEventListener("close", (event) => {
        if (heartbeatTimer !== null) {
          window.clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        const message = `Discord Gateway geschlossen: Code ${event.code}${
          event.reason ? ` Â· ${event.reason}` : ""
        } Â· ${explainDiscordCloseCode(event.code)}`;

        console.warn(message, event);

        if (!closedByEffect) {
          setError(message);
          setStatus("reconnecting");
          reconnectTimer = window.setTimeout(connect, config.discord.reconnectSeconds * 1000);
        }
      });
    }

    function identify(socket: WebSocket | null) {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      const identifyPayload = {
        op: DISCORD_GATEWAY_OP.IDENTIFY,
        d: {
          token: botToken,
          intents: DISCORD_INTENTS.GUILDS | DISCORD_INTENTS.GUILD_VOICE_STATES,
          properties: {
            os: "windows",
            browser: "gc8-companion",
            device: "gc8-companion",
          },
        },
      };

      console.info("Discord Gateway IDENTIFY wird gesendet:", {
        intents: identifyPayload.d.intents,
      });

      socket.send(JSON.stringify(identifyPayload));
    }

    function handleDispatch(payload: DiscordGatewayPayload) {
      if (payload.t === "READY") {
        const ready = payload.d as DiscordReadyEvent;
        console.info("Discord Gateway READY:", {
          botId: ready.user.id,
          username: ready.user.username,
        });

        setStatus("ready");
        setError(null);
        setLastUpdated(Date.now());
        return;
      }

      if (payload.t === "GUILD_CREATE") {
        const guild = payload.d as DiscordGuildCreateEvent;
        if (guild.id !== config.discord.guildId) return;

        console.info("Discord GUILD_CREATE:", {
          id: guild.id,
          name: guild.name,
          channels: guild.channels?.length ?? 0,
          voiceStates: guild.voice_states?.length ?? 0,
        });

        setGuildName(guild.name);

        if (guild.channels) {
          const nextChannels: Record<string, DiscordChannel> = {};

          for (const channel of guild.channels) {
            nextChannels[channel.id] = channel;
          }

          setChannelsById(nextChannels);
        }

        if (guild.voice_states) {
          const nextVoiceStates: Record<string, DiscordVoiceState> = {};

          for (const voiceState of guild.voice_states) {
            nextVoiceStates[voiceState.user_id] = voiceState;

            if (voiceState.member) {
              setMembersByUser((current) => ({
                ...current,
                [voiceState.user_id]: voiceState.member!,
              }));
            }
          }

          setVoiceStatesByUser(nextVoiceStates);
          setLastUpdated(Date.now());
        }

        setStatus("ready");
        setError(null);
        return;
      }

      if (payload.t === "VOICE_STATE_UPDATE") {
        const voiceState = payload.d as DiscordVoiceState;

        if (voiceState.guild_id !== config.discord.guildId) return;

        console.info("Discord VOICE_STATE_UPDATE:", {
          userId: voiceState.user_id,
          channelId: voiceState.channel_id,
          isConfiguredUser: voiceState.user_id === config.discord.userId,
        });

        if (voiceState.member) {
          setMembersByUser((current) => ({
            ...current,
            [voiceState.user_id]: voiceState.member!,
          }));
        }

        setVoiceStatesByUser((current) => {
          const next = { ...current };

          if (voiceState.channel_id) {
            next[voiceState.user_id] = voiceState;
          } else {
            delete next[voiceState.user_id];
          }

          return next;
        });

        setError(null);
        setLastUpdated(Date.now());
      }

      if (payload.t === "CHANNEL_CREATE" || payload.t === "CHANNEL_UPDATE") {
        const channel = payload.d as DiscordChannel;
        setChannelsById((current) => ({
          ...current,
          [channel.id]: channel,
        }));
      }
    }

    function reconnect() {
      try {
        websocket?.close();
      } catch {
        // Ignore close errors.
      }

      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }

      reconnectTimer = window.setTimeout(connect, config.discord.reconnectSeconds * 1000);
    }

    validateAndConnect();

    return () => {
      closedByEffect = true;

      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);

      try {
        websocket?.close();
      } catch {
        // Ignore close errors.
      }
    };
  }, [botToken]);

  const myVoiceState = voiceStatesByUser[config.discord.userId] ?? null;
  const myChannelId = myVoiceState?.channel_id ?? null;
  const channelName = myChannelId ? channelsById[myChannelId]?.name ?? "Voice Channel" : null;

  const membersInChannel = useMemo(() => {
    if (!myChannelId) return [];

    return Object.values(voiceStatesByUser)
      .filter((voiceState) => voiceState.channel_id === myChannelId)
      .map((voiceState) => {
        const member = voiceState.member ?? membersByUser[voiceState.user_id];
        return toVoiceMember(voiceState, member);
      })
      .sort((a, b) => {
        if (a.isSelf) return -1;
        if (b.isSelf) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [membersByUser, myChannelId, voiceStatesByUser]);

  useEffect(() => {
    if (!botToken || !myChannelId) return;

    const missingUserIds = Object.values(voiceStatesByUser)
      .filter((voiceState) => voiceState.channel_id === myChannelId)
      .map((voiceState) => voiceState.user_id)
      .filter((userId) => !membersByUser[userId])
      .filter((userId) => !requestedMemberIdsRef.current.has(userId));

    for (const userId of missingUserIds.slice(0, config.discord.maxVisibleMembers)) {
      requestedMemberIdsRef.current.add(userId);
      fetchDiscordMember(config.discord.guildId, userId, botToken)
        .then((member) => {
          if (!member) return;

          setMembersByUser((current) => ({
            ...current,
            [userId]: member,
          }));
        })
        .catch((caughtError) => {
          console.warn("Discord Member konnte nicht geladen werden:", caughtError);
        });
    }
  }, [botToken, membersByUser, myChannelId, voiceStatesByUser]);

  const derivedStatus: DiscordConnectionStatus = !config.discord.enabled
    ? "disabled"
    : !botToken
      ? "missing-token"
      : status === "error" ||
          status === "checking" ||
          status === "connecting" ||
          status === "reconnecting"
        ? status
        : myChannelId
          ? "voice"
          : "not-in-voice";

  return {
    status: derivedStatus,
    error,
    guildName,
    channelName,
    me: membersInChannel.find((member) => member.isSelf) ?? null,
    members: membersInChannel.slice(0, config.discord.maxVisibleMembers),
    totalMembers: membersInChannel.length,
    lastUpdated,
  };
}

function parsePayload(raw: unknown): DiscordGatewayPayload | null {
  try {
    return JSON.parse(String(raw)) as DiscordGatewayPayload;
  } catch (error) {
    console.warn("Discord Gateway Payload konnte nicht gelesen werden:", error);
    return null;
  }
}

function toVoiceMember(
  voiceState: DiscordVoiceState,
  member?: DiscordGuildMember,
): DiscordVoiceMember {
  const user = member?.user ?? voiceState.member?.user;
  const name =
    member?.nick ??
    voiceState.member?.nick ??
    user?.global_name ??
    user?.username ??
    shortUserId(voiceState.user_id);

  return {
    userId: voiceState.user_id,
    name,
    avatarUrl: user?.avatar ? getDiscordAvatarUrl(user.id, user.avatar) : null,
    isSelf: voiceState.user_id === config.discord.userId,
    muted: Boolean(voiceState.self_mute || voiceState.mute),
    deafened: Boolean(voiceState.self_deaf || voiceState.deaf),
    streaming: Boolean(voiceState.self_stream),
    video: Boolean(voiceState.self_video),
    suppress: Boolean(voiceState.suppress),
  };
}

async function fetchDiscordBotSelf(token: string): Promise<DiscordBotSelf> {
  const url = `${config.discord.restBaseUrl}/users/@me`;
  const text = await invoke<string>("fetch_discord_text", { url, token });
  return JSON.parse(text) as DiscordBotSelf;
}

async function fetchDiscordGuild(
  guildId: string,
  token: string,
): Promise<DiscordGuildInfo> {
  const url = `${config.discord.restBaseUrl}/guilds/${guildId}`;
  const text = await invoke<string>("fetch_discord_text", { url, token });
  return JSON.parse(text) as DiscordGuildInfo;
}

async function fetchDiscordMember(
  guildId: string,
  userId: string,
  token: string,
): Promise<DiscordGuildMember | null> {
  const url = `${config.discord.restBaseUrl}/guilds/${guildId}/members/${userId}`;
  const text = await invoke<string>("fetch_discord_text", { url, token });
  return JSON.parse(text) as DiscordGuildMember;
}

function getDiscordAvatarUrl(userId: string, avatarHash: string) {
  const extension = avatarHash.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=96`;
}

function shortUserId(userId: string) {
  return `User ${userId.slice(-4)}`;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unbekannter Fehler";
}

function explainDiscordCloseCode(code: number) {
  const explanations: Record<number, string> = {
    1000: "Normal geschlossen",
    1001: "Endpoint geht weg",
    1006: "Abnormal geschlossen / Netzwerk / Discord hat ohne Close-Frame getrennt",
    4000: "Unbekannter Discord Gateway Fehler",
    4001: "Unbekannter Opcode",
    4002: "UngÃ¼ltiger Payload",
    4003: "Nicht authentifiziert",
    4004: "Authentifizierung fehlgeschlagen, Bot-Token prÃ¼fen",
    4005: "Bereits authentifiziert",
    4007: "UngÃ¼ltige Sequence",
    4008: "Rate Limit",
    4009: "Session Timeout",
    4010: "UngÃ¼ltiger Shard",
    4011: "Sharding erforderlich",
    4012: "UngÃ¼ltige API-Version",
    4013: "UngÃ¼ltige Intents",
    4014: "Nicht erlaubte Intents",
  };

  return explanations[code] ?? "Unbekannter Close-Code";
}



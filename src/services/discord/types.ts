export interface DiscordGatewayPayload<T = unknown> {
  op: number;
  d: T;
  s?: number | null;
  t?: string | null;
}

export interface DiscordGatewayHello {
  heartbeat_interval: number;
}

export interface DiscordReadyEvent {
  session_id: string;
  user: {
    id: string;
    username: string;
    global_name?: string | null;
  };
}

export interface DiscordGuildCreateEvent {
  id: string;
  name: string;
  channels?: DiscordChannel[];
  voice_states?: DiscordVoiceState[];
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  position?: number;
}

export interface DiscordUser {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordGuildMember {
  nick?: string | null;
  user?: DiscordUser;
}

export interface DiscordVoiceState {
  guild_id?: string;
  channel_id: string | null;
  user_id: string;
  member?: DiscordGuildMember;
  deaf?: boolean;
  mute?: boolean;
  self_deaf?: boolean;
  self_mute?: boolean;
  self_stream?: boolean;
  self_video?: boolean;
  suppress?: boolean;
}

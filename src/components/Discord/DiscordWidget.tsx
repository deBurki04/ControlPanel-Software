import {
  AlertTriangle,
  Headphones,
  Mic,
  MicOff,
  Radio,
  RefreshCcw,
  Search,
  Users,
  Video,
  VolumeX,
  Wifi,
} from "lucide-react";
import { config } from "../../config/config";
import {
  type DiscordConnectionStatus,
  type DiscordVoiceMember,
  useDiscordVoiceStatus,
} from "../../hooks/useDiscordVoiceStatus";
import "./DiscordWidget.css";

export function DiscordWidget() {
  const {
    status,
    error,
    guildName,
    channelName,
    me,
    members,
    totalMembers,
    lastUpdated,
  } = useDiscordVoiceStatus();

  const visibleMembers = members.slice(0, config.discord.maxVisibleMembers);
  const hiddenCount = Math.max(0, totalMembers - visibleMembers.length);

  return (
    <div className="discord-widget">
      <header className="discord-widget__header">
        <div>
          <span>Voice Overlay</span>
          <h2>{config.discord.title}</h2>
          <p>{getStatusText(status, error, guildName, lastUpdated)}</p>
        </div>

        <div className={`discord-widget__state discord-widget__state--${status}`}>
          {getStateIcon(status)}
          <strong>{getStateLabel(status)}</strong>
        </div>
      </header>

      <section className="discord-widget__channel">
        <div className="discord-widget__channelIcon">
          <Headphones size={30} />
        </div>

        <div className="discord-widget__channelText">
          <span>Aktueller Channel</span>
          <h3>{channelName ?? "Nicht in Voice"}</h3>
          <small>{totalMembers > 0 ? `${totalMembers} verbunden` : "Warte auf Voice"}</small>
        </div>
      </section>

      {me ? <SelfStatus member={me} /> : <EmptySelfStatus />}

      <section className="discord-widget__members">
        {visibleMembers.length === 0 ? (
          <div className="discord-widget__empty">
            <Radio size={24} />
            <span>Du bist gerade in keinem Voice-Channel.</span>
          </div>
        ) : (
          visibleMembers.map((member) => (
            <MemberPill member={member} key={member.userId} />
          ))
        )}

        {hiddenCount > 0 ? (
          <div className="discord-widget__more">+{hiddenCount}</div>
        ) : null}
      </section>
    </div>
  );
}

function SelfStatus({ member }: { member: DiscordVoiceMember }) {
  return (
    <section className="discord-widget__self">
      <Avatar member={member} large />

      <div className="discord-widget__selfText">
        <strong>{member.name}</strong>
        <span>Dein Voice-Status</span>
      </div>

      <div className="discord-widget__badges">
        <StatusBadge active={!member.muted} label={member.muted ? "Muted" : "Mic"}>
          {member.muted ? <MicOff size={16} /> : <Mic size={16} />}
        </StatusBadge>

        <StatusBadge active={!member.deafened} label={member.deafened ? "Deaf" : "Sound"}>
          {member.deafened ? <VolumeX size={16} /> : <Headphones size={16} />}
        </StatusBadge>

        {member.streaming ? (
          <StatusBadge active label="Stream">
            <Wifi size={16} />
          </StatusBadge>
        ) : null}

        {member.video ? (
          <StatusBadge active label="Cam">
            <Video size={16} />
          </StatusBadge>
        ) : null}
      </div>
    </section>
  );
}

function EmptySelfStatus() {
  return (
    <section className="discord-widget__self discord-widget__self--empty">
      <div className="discord-widget__pulse" />
      <div className="discord-widget__selfText">
        <strong>Standby</strong>
        <span>Voice-Status erscheint hier</span>
      </div>
    </section>
  );
}

function MemberPill({ member }: { member: DiscordVoiceMember }) {
  return (
    <article className={`discord-widget__member ${member.isSelf ? "is-self" : ""}`}>
      <Avatar member={member} />

      <div className="discord-widget__memberText">
        <strong>{member.name}</strong>
        <span>{member.isSelf ? "Du" : getMemberFlags(member)}</span>
      </div>

      <div className="discord-widget__memberIcons">
        {member.muted ? <MicOff size={15} /> : null}
        {member.deafened ? <VolumeX size={15} /> : null}
        {member.streaming ? <Wifi size={15} /> : null}
        {member.video ? <Video size={15} /> : null}
      </div>
    </article>
  );
}

function Avatar({
  member,
  large = false,
}: {
  member: DiscordVoiceMember;
  large?: boolean;
}) {
  return (
    <div className={`discord-widget__avatar ${large ? "is-large" : ""}`}>
      {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : getInitial(member.name)}
      <span className={member.muted ? "is-muted" : "is-live"} />
    </div>
  );
}

function StatusBadge({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`discord-widget__badge ${active ? "is-active" : "is-muted"}`}>
      {children}
      <span>{label}</span>
    </div>
  );
}

function getStatusText(
  status: DiscordConnectionStatus,
  error: string | null,
  guildName: string | null,
  lastUpdated: number | null,
) {
  if (status === "missing-token") return "Bot-Token fehlt in config.local.ts";
  if (status === "disabled") return "Discord ist deaktiviert";
  if (status === "checking") return "Prüfe Bot und Server…";
  if (status === "connecting") return "Verbinde mit Discord Gateway…";
  if (status === "reconnecting") return error ?? "Discord verbindet neu…";
  if (status === "error") return error ?? "Discord Fehler";

  if (lastUpdated) {
    return (
      <>
        <RefreshCcw size={14} />
        {guildName ? `${guildName} · ` : ""}Live {formatTime(lastUpdated)}
      </>
    );
  }

  return guildName ?? "Discord verbunden";
}

function getStateIcon(status: DiscordConnectionStatus) {
  if (status === "voice") return <Users size={20} />;
  if (status === "checking") return <Search size={20} />;
  if (status === "error" || status === "missing-token") return <AlertTriangle size={20} />;
  return <Radio size={20} />;
}

function getStateLabel(status: DiscordConnectionStatus) {
  if (status === "voice") return "Im Voice";
  if (status === "not-in-voice") return "Standby";
  if (status === "checking") return "Prüfe";
  if (status === "connecting") return "Verbinde";
  if (status === "reconnecting") return "Reconnect";
  if (status === "missing-token") return "Token fehlt";
  if (status === "error") return "Fehler";
  if (status === "disabled") return "Aus";
  return "Bereit";
}

function getMemberFlags(member: DiscordVoiceMember) {
  const flags = [];

  if (member.muted) flags.push("Muted");
  if (member.deafened) flags.push("Deaf");
  if (member.streaming) flags.push("Stream");
  if (member.video) flags.push("Cam");

  return flags.length > 0 ? flags.join(" · ") : "Verbunden";
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

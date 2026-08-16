import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Headphones,
  Mic,
  MicOff,
  Radio,
  RefreshCcw,
  Search,
  Smartphone,
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
import {
  getDismissedPhoneNotification,
  usePhoneNotification,
} from "../../hooks/usePhoneNotification";
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

  const phoneNotification = usePhoneNotification();

  const [dismissedNotificationId, setDismissedNotificationId] = useState<string | null>(
    null,
  );

  const visiblePhoneNotification = useMemo(() => {
    if (
      phoneNotification.isAvailable &&
      phoneNotification.id === dismissedNotificationId
    ) {
      return getDismissedPhoneNotification();
    }

    return phoneNotification;
  }, [dismissedNotificationId, phoneNotification]);

  const visibleMembers = members.slice(0, config.discord.maxVisibleMembers);
  const hiddenCount = Math.max(0, totalMembers - visibleMembers.length);
  const isInVoice = status === "voice";

  return (
    <div className="discord-widget">
      <header className="discord-widget__header">
        <div>
          <span>{isInVoice ? "Voice Overlay" : "Standby"}</span>
          <h2>{isInVoice ? config.discord.title : "Handy"}</h2>
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
          <small>{totalMembers > 0 ? `${totalMembers} verbunden` : "Voice Standby"}</small>
        </div>
      </section>

      {me ? <SelfStatus member={me} /> : <PhoneStatus />}

      <section className="discord-widget__members">
        {isInVoice && visibleMembers.length > 0 ? (
          <>
            {visibleMembers.map((member) => (
              <MemberPill member={member} key={member.userId} />
            ))}

            {hiddenCount > 0 ? (
              <div className="discord-widget__more">+{hiddenCount}</div>
            ) : null}
          </>
        ) : (
          <PhoneNotificationCard
            app={visiblePhoneNotification.app}
            title={visiblePhoneNotification.title}
            text={visiblePhoneNotification.text}
            timeLabel={visiblePhoneNotification.timeLabel}
            isAvailable={visiblePhoneNotification.isAvailable}
            onDismiss={() => {
              if (phoneNotification.isAvailable) {
                setDismissedNotificationId(phoneNotification.id);
              }
            }}
          />
        )}
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

function PhoneStatus() {
  return (
    <section className="discord-widget__self discord-widget__self--phone">
      <div className="discord-widget__phoneIcon">
        <Smartphone size={26} />
      </div>

      <div className="discord-widget__selfText">
        <strong>S25 Remote</strong>
        <span>Benachrichtigungen aktiv</span>
      </div>

      <div className="discord-widget__badges">
        <StatusBadge active label="Android">
          <Smartphone size={16} />
        </StatusBadge>

        <StatusBadge active label="HA Sensor">
          <Bell size={16} />
        </StatusBadge>
      </div>
    </section>
  );
}

function PhoneNotificationCard({
  app,
  title,
  text,
  timeLabel,
  isAvailable,
  onDismiss,
}: {
  app: string;
  title: string;
  text: string;
  timeLabel: string;
  isAvailable: boolean;
  onDismiss: () => void;
}) {
  return (
    <article
      className={`discord-widget__notification ${
        isAvailable ? "is-clickable" : "is-empty"
      }`}
      role={isAvailable ? "button" : undefined}
      tabIndex={isAvailable ? 0 : undefined}
      title={isAvailable ? "Klicken zum Ausblenden" : undefined}
      onClick={isAvailable ? onDismiss : undefined}
      onKeyDown={(event) => {
        if (!isAvailable) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onDismiss();
        }
      }}
    >
      <div className="discord-widget__notificationIcon">
        <Bell size={24} />
      </div>

      <div className="discord-widget__notificationText">
        <span>{isAvailable ? app : "Android"}</span>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      {timeLabel ? <time>{timeLabel}</time> : null}
    </article>
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
  children: ReactNode;
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

  if (status === "not-in-voice") {
    return "Discord Standby · letzte Handy-Benachrichtigung";
  }

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
  if (status === "not-in-voice") return <Smartphone size={20} />;
  if (status === "checking") return <Search size={20} />;
  if (status === "error" || status === "missing-token") return <AlertTriangle size={20} />;
  return <Radio size={20} />;
}

function getStateLabel(status: DiscordConnectionStatus) {
  if (status === "voice") return "Im Voice";
  if (status === "not-in-voice") return "Handy";
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

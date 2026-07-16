export type MemberJson = {
  id: string;
  username: string;
  displayName: string;
};

export type LobbyJson = {
  id: string;
  status: "open" | "live" | "full" | "closed";
  game: {
    slug: string;
    name: string;
    emoji: string;
    colorA: string;
    colorB: string;
    coverUrl: string | null;
  };
  mode: string | null;
  platform: string | null;
  region: string | null;
  skillLevel: string | null;
  micRequired: boolean;
  size: number; // cap
  minSize: number; // voice channel opens at this many players
  note: string | null;
  host: MemberJson;
  members: MemberJson[];
  voice: { channelName: string; url: string | null; appUrl: string | null } | null;
  inviteUrl: string | null;
  isMember: boolean;
  isHost: boolean;
  createdAt: string;
  expiresAt: string;
};

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
};

/** Dados públicos de um usuário (sem e-mail), embutidos em posts/comentários/projetos. */
export type Author = {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type RegisterPayload = {
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }

  if (!res.ok) {
    let detail = "Algo deu errado. Tente novamente.";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        detail = data.detail[0].msg;
      }
    } catch {
      /* corpo não-JSON: mantém mensagem padrão */
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

export function register(payload: RegisterPayload) {
  return postJson<AuthResponse>("/auth/register", payload);
}

export function login(payload: LoginPayload) {
  return postJson<AuthResponse>("/auth/login", payload);
}

// --- Projetos / Categorias ---

export type Category = {
  id: number;
  description: string;
};

export type Project = {
  project_id: number;
  name: string;
  description: string | null;
  template: string | null;
  status: string;
  visibility: boolean;
  category_id: number | null;
  created_at: string;
  category: Category | null;
  owner_id: number | null;
  owner: Author | null;
  cover_url: string | null;
  logo_url: string | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export type ProjectPayload = {
  name: string;
  description?: string;
  status?: string;
  visibility?: boolean;
  category_id?: number | null;
  cover_url?: string | null;
  logo_url?: string | null;
};

/** Prefixa o host da API em caminhos de imagem salvos como /uploads/xxx. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: authHeader(),
      body: form,
    });
  } catch {
    throw new Error("Não foi possível enviar a imagem.");
  }
  if (!res.ok) {
    let detail = "Não foi possível enviar a imagem.";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      /* mantém padrão */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: authHeader() });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!res.ok) throw new Error("Não foi possível carregar os dados.");
  return res.json() as Promise<T>;
}

async function deleteRequest(path: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: authHeader() });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!res.ok) throw new Error("Não foi possível excluir.");
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers: authHeader() });
  if (!res.ok) throw new Error("Não foi possível concluir a ação.");
  return res.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!res.ok) {
    let detail = "Não foi possível salvar.";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      /* mantém mensagem padrão */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export function listProjects() {
  return getJson<Project[]>("/projects");
}

export function getProject(id: number) {
  return getJson<Project>(`/projects/${id}`);
}

export function createProject(payload: ProjectPayload) {
  return postJson<Project>("/projects", payload);
}

export function updateProject(id: number, payload: Partial<ProjectPayload>) {
  return patchJson<Project>(`/projects/${id}`, payload);
}

export function deleteProject(id: number) {
  return deleteRequest(`/projects/${id}`);
}

export function listCategories() {
  return getJson<Category[]>("/categories");
}

// --- Likes / Comentários ---

export type LikeStatus = { liked: boolean; likes_count: number };

export type Comment = {
  comment_id: number;
  content: string;
  created_at: string;
  user_id: number;
  author: Author | null;
};

export function likeProject(id: number) {
  return postJson<LikeStatus>(`/projects/${id}/like`, {});
}

export function unlikeProject(id: number) {
  return deleteJson<LikeStatus>(`/projects/${id}/like`);
}

export function listComments(projectId: number) {
  return getJson<Comment[]>(`/projects/${projectId}/comments`);
}

export function createComment(projectId: number, content: string) {
  return postJson<Comment>(`/projects/${projectId}/comments`, { content });
}

export function deleteComment(projectId: number, commentId: number) {
  return deleteRequest(`/projects/${projectId}/comments/${commentId}`);
}

// --- Equipes ---

export type ProjectRef = { project_id: number; name: string };

export type Team = {
  team_id: number;
  team_name: string;
  purpose: string | null;
  created_at: string;
  project_id: number;
  leader_id: number | null;
  project: ProjectRef | null;
  leader: Author | null;
  members: Author[];
};

export type TeamPayload = {
  team_name: string;
  purpose?: string | null;
  project_id: number;
};

export function listTeams(projectId?: number) {
  const qs = projectId ? `?project_id=${projectId}` : "";
  return getJson<Team[]>(`/teams${qs}`);
}

export function getTeam(id: number) {
  return getJson<Team>(`/teams/${id}`);
}

export function createTeam(payload: TeamPayload) {
  return postJson<Team>("/teams", payload);
}

export function updateTeam(id: number, payload: Partial<TeamPayload>) {
  return patchJson<Team>(`/teams/${id}`, payload);
}

export function deleteTeam(id: number) {
  return deleteRequest(`/teams/${id}`);
}

export function addTeamMember(teamId: number, userId: number) {
  return postJson<Team>(`/teams/${teamId}/members`, { user_id: userId });
}

export function removeTeamMember(teamId: number, userId: number) {
  return deleteJson<Team>(`/teams/${teamId}/members/${userId}`);
}

// --- Usuários ---

export type UserUpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string;
  email?: string;
  avatar_url?: string | null;
};

export function listUsers() {
  return getJson<User[]>("/users");
}

export function getUser(id: number) {
  return getJson<User>(`/users/${id}`);
}

export function updateUser(id: number, payload: UserUpdatePayload) {
  return patchJson<User>(`/users/${id}`, payload);
}

// --- Publicações (feed) ---

export type Post = {
  post_id: number;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: number;
  author: Author | null;
  project: ProjectRef | null;
};

export type PostPayload = {
  content: string;
  project_id?: number | null;
  image_url?: string | null;
};

export function listPosts(userId?: number) {
  const qs = userId ? `?user_id=${userId}` : "";
  return getJson<Post[]>(`/posts${qs}`);
}

export function createPost(payload: PostPayload) {
  return postJson<Post>("/posts", payload);
}

export function deletePost(id: number) {
  return deleteRequest(`/posts/${id}`);
}

const TOKEN_KEY = "capmar_token";
const USER_KEY = "capmar_user";

export function saveSession(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

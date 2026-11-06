export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type User = {
  role: "user" | "admin";
  is_active: boolean;
  mfa_enabled: boolean;
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

// O JWT viaja num cookie HttpOnly emitido pelo backend (US-026) — o JS não lê
// nem envia o token à mão. Por isso todo fetch daqui usa `credentials: "include"`,
// que manda o cookie mesmo em requisições cross-origin (o CORS do backend está
// com `allow_credentials=True` e origens explícitas).

export type AuthResponse = {
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
  otp?: string;
  email: string;
  password: string;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function validationMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail) || !detail[0]) return fallback;
  const issue = detail[0];
  const labels: Record<string, string> = { username: "Nome de usuário", email: "E-mail", password: "Senha", first_name: "Nome", last_name: "Sobrenome", content: "Texto", name: "Nome", otp: "Código do autenticador" };
  const field = labels[String(issue.loc?.at(-1))] ?? "Campo";
  if (issue.type === "string_too_long") return `${field}: use no máximo ${issue.ctx?.max_length} caracteres.`;
  if (issue.type === "string_too_short") return `${field}: use pelo menos ${issue.ctx?.min_length} caracteres.`;
  if (issue.type === "missing") return `${field} é obrigatório.`;
  if (issue.type === "string_pattern_mismatch") return `${field} está em um formato inválido.`;
  if (String(issue.msg).startsWith("Value error, ")) return String(issue.msg).slice(13);
  return `${field} inválido. Confira o preenchimento e tente novamente.`;
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== "undefined") localStorage.removeItem(LEGACY_TOKEN_KEY);
  const response = await fetch(input, { ...init, credentials: "include", cache: "no-store" });
  if (response.status === 401 && String(input) !== `${API_URL}/auth/login`) {
    clearStoredUser();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("capmar-session-expired"));
    throw new ApiError("Sessão inválida ou expirada. Entre novamente.", 401);
  }
  return response;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }

  if (!res.ok) {
    let detail = "Algo deu errado. Tente novamente.";
    try {
      const data = await res.json();
      detail = validationMessage(data?.detail, detail);
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

export type PortfolioItem = { kind: "image" | "pdf" | "video"; title: string; description: string; url: string };
export type Partner = { name: string; description: string; url: string | null };
export type Project = {
  accent: "roxo" | "laranja" | "azul";
  portfolio: PortfolioItem[];
  partners: Partner[];
  authorship?: "individual" | "group";
  responsible_names?: string | null;
  funding_url?: string | null;
  funding_description?: string | null;

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
  keywords: { keyword_id: number; word: string }[];
};

export type ProjectPayload = {
  template?: "classico" | "criativo" | "minimalista";
  accent?: "roxo" | "laranja" | "azul";
  portfolio?: PortfolioItem[];
  partners?: Partner[];
  authorship?: "individual" | "group";
  responsible_names?: string | null;
  funding_url?: string | null;
  funding_description?: string | null;

  name: string;
  description?: string | null;
  status?: string;
  visibility?: boolean;
  category_id?: number | null;
  cover_url?: string | null;
  logo_url?: string | null;
  keywords?: string[];
};

/** Prefixa o host da API em caminhos de imagem salvos como /uploads/xxx. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export async function uploadImage(file: File, document = false): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await apiFetch(`${API_URL}/upload${document ? "/document" : ""}`, {
      method: "POST",
      headers: { "X-CSRF-Protection": "1" },
      credentials: "include",
      body: form,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
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

export async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(`${API_URL}${path}`, { credentials: "include" });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!res.ok) throw await responseError(res, "Não foi possível carregar os dados.");
  return res.json() as Promise<T>;
}

async function deleteRequest(path: string): Promise<void> {
  let res: Response;
  try {
    res = await apiFetch(`${API_URL}${path}`, { method: "DELETE", headers: { "X-CSRF-Protection": "1" }, credentials: "include" });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Não foi possível conectar ao servidor. Tente novamente.");
  }
  if (!res.ok) throw await responseError(res, "Não foi possível excluir.");
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await apiFetch(`${API_URL}${path}`, { method: "DELETE", headers: { "X-CSRF-Protection": "1" }, credentials: "include" });
  if (!res.ok) throw await responseError(res, "Não foi possível concluir a ação.");
  return res.json() as Promise<T>;
}

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Protection": "1" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
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

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return new ApiError(validationMessage(body?.detail, fallback), response.status);
}

export type ProjectPage = { items: Project[]; total: number; skip: number; limit: number };
export type ProjectSearch = { q?: string; category_id?: number; skip?: number; limit?: number; public_only?: boolean; owner_id?: number; writable_only?: boolean; sort?: "recent" | "likes" };

export function searchProjects(filters: ProjectSearch = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return getJson<ProjectPage>("/projects/search?" + query);
}

export async function getOptionalMe() {
  try { return await getMe(); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
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

export function listComments(projectId: number, skip = 0) {
  return getJson<Comment[]>(`/projects/${projectId}/comments?skip=${skip}&limit=20`);
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
  return getJson<Author[]>("/users");
}

export function getUser(id: number) {
  return getJson<Author>(`/users/${id}`);
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

// --- Sessão ---
//
// A sessão vive no cookie HttpOnly emitido pelo backend. O `localStorage` só
// guarda uma cópia dos dados do usuário, para a primeira pintura da tela não
// esperar a rede — NUNCA como fonte de autorização. Quem decide se a sessão é
// válida é o servidor, via `getMe()`.

const USER_KEY = "capmar_user";
/** Chave usada antes do US-026, quando o JWT ficava no localStorage. */
const LEGACY_TOKEN_KEY = "capmar_token";

/** Sessão do usuário autenticado, confirmada pelo servidor. 401 vira erro. */
export function getMe() {
  return getJson<User>("/auth/me");
}

export function saveSession(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  saveUser(auth.user);
}

export function saveUser(user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("capmar-user-changed"));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Descarta o cache local do usuário. Não encerra a sessão no servidor. */
export function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.dispatchEvent(new Event("capmar-user-changed"));
}

/**
 * Encerra a sessão: limpa o cache local e pede ao backend que apague o cookie
 * (só o servidor consegue, já que o cookie é HttpOnly).
 */
export async function clearSession() {
  await postJson<{ detail: string }>("/auth/logout", {});
  clearStoredUser();
}

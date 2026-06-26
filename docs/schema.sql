-- =============================================================================
-- CapMar — Projeto lógico do banco de dados (PostgreSQL 16)
-- Equivalente SQL ao schema gerado por SQLAlchemy (backend/app/models.py).
-- Ordem de criação respeita as dependências de chave estrangeira.
-- =============================================================================

CREATE TABLE category (
    id          SERIAL PRIMARY KEY,
    description TEXT NOT NULL
);

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(20)  NOT NULL UNIQUE,
    first_name    VARCHAR(20),
    last_name     VARCHAR(100),
    email         VARCHAR(50)  NOT NULL UNIQUE,
    user_password VARCHAR(255) NOT NULL,
    avatar_url    VARCHAR(255)
);

CREATE TABLE keywords (
    keyword_id SERIAL PRIMARY KEY,
    word       VARCHAR(20) NOT NULL UNIQUE,
    popularity INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE project (
    project_id  SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    template    VARCHAR(100),
    status      VARCHAR(15)  NOT NULL DEFAULT 'rascunho',
    visibility  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATE         NOT NULL DEFAULT CURRENT_DATE,
    category_id INTEGER      REFERENCES category(id)   ON DELETE SET NULL,
    owner_id    INTEGER      REFERENCES users(user_id) ON DELETE SET NULL,
    cover_url   VARCHAR(255),
    logo_url    VARCHAR(255)
);

CREATE TABLE team (
    team_id    SERIAL PRIMARY KEY,
    team_name  VARCHAR(255) NOT NULL,
    purpose    TEXT,
    created_at DATE         NOT NULL DEFAULT CURRENT_DATE,
    project_id INTEGER      NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    leader_id  INTEGER      REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE post (
    post_id    SERIAL PRIMARY KEY,
    content    TEXT NOT NULL,
    image_url  VARCHAR(255),
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id    INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
    project_id INTEGER          REFERENCES project(project_id) ON DELETE SET NULL
);

CREATE TABLE project_comments (
    comment_id SERIAL PRIMARY KEY,
    content    TEXT NOT NULL,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Tabelas associativas (N:N) e curtidas — chave primária composta
-- ---------------------------------------------------------------------------

CREATE TABLE project_likes (
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_users (
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE team_users (
    team_id INTEGER NOT NULL REFERENCES team(team_id)  ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE projects_keywords (
    project_id INTEGER NOT NULL REFERENCES project(project_id)  ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(keyword_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, keyword_id)
);

CREATE TABLE team_keywords (
    team_id    INTEGER NOT NULL REFERENCES team(team_id)         ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(keyword_id)  ON DELETE CASCADE,
    PRIMARY KEY (team_id, keyword_id)
);

CREATE TABLE user_keywords (
    user_id    INTEGER NOT NULL REFERENCES users(user_id)        ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(keyword_id)  ON DELETE CASCADE,
    PRIMARY KEY (user_id, keyword_id)
);

-- Categorias-padrão semeadas pelo backend no startup (app/main.py).
INSERT INTO category (description) VALUES
    ('Gastronomia'), ('Artesanato'), ('Tecnologia'), ('Turismo'),
    ('Moda'), ('Serviços'), ('Educação'), ('Sustentabilidade');

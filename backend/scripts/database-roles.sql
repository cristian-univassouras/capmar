-- Executar como administrador conectado ao banco da aplicação.
-- Provisionamento inicial; não contém senhas. Use \password no psql ou secret manager.
CREATE ROLE capmar_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE capmar_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO capmar_migrator;
GRANT USAGE ON SCHEMA public TO capmar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE capmar_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO capmar_app;
ALTER DEFAULT PRIVILEGES FOR ROLE capmar_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO capmar_app;
-- Após migrar (também para tabelas legadas), execute:
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO capmar_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO capmar_app;
-- Após criar alembic_version, retire DML dela:
-- REVOKE INSERT, UPDATE, DELETE ON alembic_version FROM capmar_app;
-- Banco legado: antes de migrar, transfira ownership das tabelas/sequências
-- da aplicação para capmar_migrator. Não use REASSIGN OWNED de um superusuário
-- indiscriminadamente; revise o inventário em docs/seguranca-integridade.md.

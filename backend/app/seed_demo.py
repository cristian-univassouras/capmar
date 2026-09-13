"""Dados fictícios locais. Executar: python -m app.seed_demo. Pode ser repetido."""
import os
from datetime import date, timedelta

from sqlalchemy import func, select

from . import crud, models, schemas
from .config import settings
from .database import SessionLocal
from .security import verify_password

PEOPLE = [
    ("ana", "Ana", "Martins"),
    ("bruno", "Bruno", "Souza"),
    ("camila", "Camila", "Lima"),
    ("diego", "Diego", "Alves"),
    ("elisa", "Elisa", "Costa"),
]
PROJECTS = [
    ("Feira Criativa de Maricá", "Artesanato", 0, True,
     "Uma feira para divulgar artesãos locais, trocar experiências e aproximar a comunidade.",
     ("Já estamos organizando as primeiras oficinas da Feira Criativa. Qual técnica você gostaria de aprender?",
      "A programação terá cerâmica, bordado e peças feitas com materiais reaproveitados.")),
    ("Horta da Comunidade", "Sustentabilidade", 1, True,
     "Cultivo coletivo de hortaliças e oficinas sobre compostagem e alimentação sustentável.",
     ("Começamos a preparar os canteiros da horta comunitária. Venha participar do próximo mutirão!",
      "Nossa oficina de compostagem vai mostrar como transformar resíduos orgânicos em adubo.")),
    ("Conecta Bairro", "Tecnologia", 2, True,
     "Oficinas de inclusão digital e apoio a pequenos negócios que querem começar na internet.",
     ("Abrimos uma turma introdutória de ferramentas digitais para pequenos empreendedores.",
      "Na próxima oficina vamos aprender a montar um catálogo digital simples e acessível.")),
    ("Sabores da Lagoa", "Gastronomia", 3, True,
     "Valorização de receitas tradicionais e de quem produz alimentos na região da lagoa.",
     ("Estamos reunindo receitas que fazem parte da memória gastronômica de Maricá.",
      "O primeiro encontro terá troca de receitas e uma conversa sobre aproveitamento integral dos alimentos.")),
    ("Oficina Reuso", "Educação", 4, True,
     "Encontros educativos para consertar objetos, reutilizar materiais e reduzir desperdício.",
     ("Uma cadeira antiga pode ganhar uma nova história. Nosso encontro de reparos está sendo preparado!",
      "Estamos separando materiais para a oficina de reaproveitamento. Compartilhe suas ideias.")),
    ("Planejamento interno — demonstração", "Serviços", 0, False,
     "Projeto privado para testar permissões. Ana é proprietária; Bruno lidera a equipe e Camila é membro. Diego e Elisa não têm acesso.",
     ("Discussão interna: vamos revisar a organização das próximas atividades antes de publicar o calendário.",
      "Atualização privada: o planejamento está disponível apenas para as pessoas autorizadas.")),
]


def seed():
    if settings.environment != "development":
        raise RuntimeError("Dados de demonstração permitidos apenas em ENVIRONMENT=development")
    password = os.environ.get("DEMO_PASSWORD", "Capmar@123")
    with SessionLocal.begin() as db:
        users = []
        for slug, first, last in PEOPLE:
            email, username = f"{slug}.demo@example.com", f"demo_{slug}"
            user = crud.get_user_by_email(db, email)
            if user is None:
                if crud.get_user_by_username(db, username):
                    raise RuntimeError(f"Nome de demonstração já utilizado: {username}")
                user = crud.create_user(db, schemas.UserCreate(
                    email=email, username=username, first_name=first, last_name=last, password=password))
            elif user.username != username or not verify_password(password, user.user_password):
                raise RuntimeError(f"Conta existente não corresponde à demonstração: {email}")
            users.append(user)

        for index, (name, category, owner_index, public, description, contents) in enumerate(PROJECTS):
            owner = users[owner_index]
            project = db.scalar(select(models.Project).where(
                models.Project.name == name, models.Project.owner_id == owner.user_id))
            if project is None:
                category_record = db.scalar(select(models.Category).where(models.Category.description == category))
                if category_record is None:
                    raise RuntimeError("Categorias ausentes: execute alembic upgrade head")
                project = crud.create_project(db, schemas.ProjectCreate(
                    name=name, description="Dados fictícios para testes. " + description,
                    visibility=public, status="ativo" if public else "rascunho",
                    category_id=category_record.id), owner_id=owner.user_id)
                project.created_at = date.today() - timedelta(days=12 - index)
            leader = owner if public else users[1]
            team_name = f"Equipe — {name}"
            team = db.scalar(select(models.Team).where(
                models.Team.project_id == project.project_id, models.Team.team_name == team_name))
            if team is None:
                team = crud.create_team(db, schemas.TeamCreate(
                    team_name=team_name, purpose="Organização das atividades de demonstração.",
                    project_id=project.project_id), leader_id=leader.user_id)
            members = [owner, users[(owner_index + 1) % 5], users[(owner_index + 2) % 5]] if public else users[:3]
            for member in members:
                crud.add_team_member(db, team, member)
            for n, content in enumerate(contents):
                author = owner if public or n == 0 else leader
                existing = db.scalar(select(models.Post.post_id).where(
                    models.Post.project_id == project.project_id, models.Post.content == content))
                if existing is None:
                    post = crud.create_post(db, schemas.PostCreate(
                        content=content, project_id=project.project_id), user_id=author.user_id)
                    post.created_at = date.today() - timedelta(days=3 - n)
            participants = [u for u in users if u.user_id != owner.user_id] if public else users[:3]
            for participant in participants:
                crud.add_like(db, project.project_id, participant.user_id)
            comments = (
                ("Gostei da proposta! Posso ajudar a organizar a próxima atividade.", members[1]),
                ("Vamos combinar os próximos passos com a equipe. A ideia está ficando ótima.", members[2]),
            )
            for content, author in comments:
                existing = db.scalar(select(models.ProjectComment.comment_id).where(
                    models.ProjectComment.project_id == project.project_id,
                    models.ProjectComment.user_id == author.user_id,
                    models.ProjectComment.content == content))
                if existing is None:
                    crud.create_comment(db, project.project_id, author.user_id, content)

        for index, content in enumerate((
            "Olá, comunidade! Este perfil faz parte dos dados de demonstração do CapMar.",
            "Quais iniciativas vocês gostariam de ver no bairro? Vamos trocar ideias por aqui.",
            "Conheça os projetos da comunidade e deixe um comentário com sua sugestão.",
        )):
            if db.scalar(select(models.Post.post_id).where(
                    models.Post.user_id == users[index].user_id, models.Post.content == content,
                    models.Post.project_id.is_(None))) is None:
                crud.create_post(db, schemas.PostCreate(content=content), user_id=users[index].user_id)
        db.flush()
        totals = {label: db.scalar(select(func.count()).select_from(model)) for label, model in (
            ("contas", models.User), ("projetos", models.Project), ("equipes", models.Team),
            ("posts", models.Post), ("comentarios", models.ProjectComment), ("likes", models.ProjectLike),
        )}
    print(totals)
    print("Dados fictícios locais prontos; nenhum cadastro existente foi sobrescrito.")


if __name__ == "__main__":
    seed()

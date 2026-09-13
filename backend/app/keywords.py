import unicodedata

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from . import models

MAX_KEYWORDS = 8


def normalize_keywords(words: list[str]) -> list[str]:
    if len(words) > MAX_KEYWORDS:
        raise ValueError("Use no máximo 8 palavras-chave")
    normalized = []
    for raw in words:
        word = " ".join(unicodedata.normalize("NFKC", raw).casefold().split())
        if not 1 <= len(word) <= 20:
            raise ValueError("Cada palavra-chave deve ter de 1 a 20 caracteres; não será truncada")
        if any(unicodedata.category(char).startswith("C") for char in word):
            raise ValueError("Palavra-chave contém caracteres inválidos")
        if word not in normalized:
            normalized.append(word)
    return sorted(normalized)


def set_project_keywords(db, project, words):
    # A ordem global de aquisição dos locks evita deadlocks entre conjuntos de tags.
    normalized = normalize_keywords(words)
    for word in normalized:
        db.execute(insert(models.Keyword).values(word=word, popularity=0)
                   .on_conflict_do_nothing(index_elements=[models.Keyword.word]))
    db.expire(project, ["keywords"])
    project.keywords = list(db.scalars(select(models.Keyword)
                                      .where(models.Keyword.word.in_(normalized))
                                      .order_by(models.Keyword.word))) if normalized else []
    db.flush()

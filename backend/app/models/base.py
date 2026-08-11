import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel, Field
from app.database.supabase import _in_memory_db, get_supabase_client, is_supabase_configured

logger = logging.getLogger(__name__)

T = TypeVar("T", bound="SupabaseModel")


class FilterOp(str, Enum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    LIKE = "like"
    ILIKE = "ilike"
    IN_ = "in_"
    IS = "is_"


class FilterExpression:
    def __init__(self, field_name: str, op: FilterOp, value: Any):
        self.field_name = field_name
        self.op = op
        if isinstance(value, Enum):
            self.value = value.value
        else:
            self.value = value

    def matches_dict(self, doc: Dict[str, Any]) -> bool:
        doc_val = doc.get(self.field_name)
        if isinstance(doc_val, Enum):
            doc_val = doc_val.value
        val = self.value
        if isinstance(val, Enum):
            val = val.value

        if self.op == FilterOp.EQ:
            return doc_val == val
        elif self.op == FilterOp.NEQ:
            return doc_val != val
        elif self.op == FilterOp.GT:
            return doc_val is not None and doc_val > val
        elif self.op == FilterOp.GTE:
            return doc_val is not None and doc_val >= val
        elif self.op == FilterOp.LT:
            return doc_val is not None and doc_val < val
        elif self.op == FilterOp.LTE:
            return doc_val is not None and doc_val <= val
        elif self.op == FilterOp.IN_:
            return doc_val in (val or [])
        elif self.op == FilterOp.LIKE or self.op == FilterOp.ILIKE:
            return str(val).lower() in str(doc_val or "").lower()
        return True


class SortExpression:
    def __init__(self, field_name: str, ascending: bool = True):
        self.field_name = field_name
        self.ascending = ascending


class ModelField:
    def __init__(self, field_name: str):
        self.field_name = field_name

    @property
    def id(self) -> "ModelField":
        return self

    def __eq__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.EQ, other)

    def __ne__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.NEQ, other)

    def __gt__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.GT, other)

    def __ge__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.GTE, other)

    def __lt__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.LT, other)

    def __le__(self, other: Any) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.LTE, other)

    def __neg__(self) -> SortExpression:
        return SortExpression(self.field_name, ascending=False)

    def desc(self) -> SortExpression:
        return SortExpression(self.field_name, ascending=False)

    def asc(self) -> SortExpression:
        return SortExpression(self.field_name, ascending=True)

    def in_(self, values: List[Any]) -> FilterExpression:
        return FilterExpression(self.field_name, FilterOp.IN_, values)


class ModelMeta(type(BaseModel)):
    def __getattr__(cls, name: str) -> Any:
        if name.startswith("_") or hasattr(type(BaseModel), name):
            raise AttributeError(f"type object '{cls.__name__}' has no attribute '{name}'")
        if name in cls.__dict__:
            return cls.__dict__[name]
        return ModelField(name)


class QueryBuilder(Generic[T]):
    def __init__(self, model_cls: Type[T], initial_filters: Optional[List[Any]] = None):
        self.model_cls = model_cls
        self.table_name = getattr(model_cls, "__table_name__", model_cls.__name__.lower() + "s")
        self.filters: List[FilterExpression] = []
        self.sort_clauses: List[SortExpression] = []
        self._limit_count: Optional[int] = None
        self._offset_count: Optional[int] = None

        if initial_filters:
            for f in initial_filters:
                self._add_filter(f)

    def _add_filter(self, f: Any):
        if isinstance(f, FilterExpression):
            self.filters.append(f)
        elif isinstance(f, dict):
            for k, v in f.items():
                if k == "$or" and isinstance(v, list):
                    for sub in v:
                        if isinstance(sub, dict):
                            for sk, sv in sub.items():
                                clean_k = sk.split(".")[0].replace("$id", "id")
                                self.filters.append(FilterExpression(clean_k, FilterOp.EQ, sv))
                elif isinstance(v, dict):
                    if "$in" in v:
                        clean_k = k.split(".")[0].replace("$id", "id")
                        self.filters.append(FilterExpression(clean_k, FilterOp.IN_, v["$in"]))
                    elif "$gte" in v:
                        clean_k = k.split(".")[0].replace("$id", "id")
                        self.filters.append(FilterExpression(clean_k, FilterOp.GTE, v["$gte"]))
                    elif "$lte" in v:
                        clean_k = k.split(".")[0].replace("$id", "id")
                        self.filters.append(FilterExpression(clean_k, FilterOp.LTE, v["$lte"]))
                else:
                    clean_k = k.split(".")[0].replace("$id", "id")
                    self.filters.append(FilterExpression(clean_k, FilterOp.EQ, v))

    def filter(self, *expressions: Any, **kwargs: Any) -> "QueryBuilder[T]":
        for expr in expressions:
            self._add_filter(expr)
        for k, v in kwargs.items():
            self.filters.append(FilterExpression(k, FilterOp.EQ, v))
        return self

    def sort(self, *sort_exprs: Any) -> "QueryBuilder[T]":
        for s in sort_exprs:
            if isinstance(s, SortExpression):
                self.sort_clauses.append(s)
            elif isinstance(s, str):
                if s.startswith("-"):
                    self.sort_clauses.append(SortExpression(s[1:], ascending=False))
                elif s.startswith("+"):
                    self.sort_clauses.append(SortExpression(s[1:], ascending=True))
                else:
                    self.sort_clauses.append(SortExpression(s, ascending=True))
            elif isinstance(s, ModelField):
                self.sort_clauses.append(SortExpression(s.field_name, ascending=True))
        return self

    def limit(self, count: int) -> "QueryBuilder[T]":
        self._limit_count = count
        return self

    def offset(self, count: int) -> "QueryBuilder[T]":
        self._offset_count = count
        return self

    async def count(self) -> int:
        client = get_supabase_client()
        if client:
            try:
                query = client.table(self.table_name).select("id", count="exact")
                for f in self.filters:
                    if f.op == FilterOp.EQ:
                        query = query.eq(f.field_name, f.value)
                    elif f.op == FilterOp.IN_:
                        query = query.in_(f.field_name, f.value)
                    elif f.op == FilterOp.GT:
                        query = query.gt(f.field_name, f.value)
                    elif f.op == FilterOp.GTE:
                        query = query.gte(f.field_name, f.value)
                    elif f.op == FilterOp.LT:
                        query = query.lt(f.field_name, f.value)
                    elif f.op == FilterOp.LTE:
                        query = query.lte(f.field_name, f.value)
                res = query.execute()
                return res.count or len(res.data or [])
            except Exception as e:
                logger.error(f"Supabase count error on {self.table_name}: {e}")

        # In-memory fallback
        docs = list(_in_memory_db.get(self.table_name, {}).values())
        for f in self.filters:
            docs = [d for d in docs if f.matches_dict(d)]
        return len(docs)

    async def to_list(self) -> List[T]:
        client = get_supabase_client()
        if client:
            try:
                query = client.table(self.table_name).select("*")
                for f in self.filters:
                    if f.op == FilterOp.EQ:
                        query = query.eq(f.field_name, f.value)
                    elif f.op == FilterOp.IN_:
                        query = query.in_(f.field_name, f.value)
                    elif f.op == FilterOp.GT:
                        query = query.gt(f.field_name, f.value)
                    elif f.op == FilterOp.GTE:
                        query = query.gte(f.field_name, f.value)
                    elif f.op == FilterOp.LT:
                        query = query.lt(f.field_name, f.value)
                    elif f.op == FilterOp.LTE:
                        query = query.lte(f.field_name, f.value)

                for s in self.sort_clauses:
                    query = query.order(s.field_name, desc=not s.ascending)

                if self._limit_count is not None:
                    query = query.limit(self._limit_count)
                if self._offset_count is not None:
                    query = query.offset(self._offset_count)

                res = query.execute()
                return [self.model_cls.from_db_dict(row) for row in (res.data or [])]
            except Exception as e:
                logger.error(f"Supabase query error on {self.table_name}: {e}")

        # In-memory fallback
        docs = list(_in_memory_db.get(self.table_name, {}).values())
        for f in self.filters:
            docs = [d for d in docs if f.matches_dict(d)]

        for s in reversed(self.sort_clauses):
            docs.sort(key=lambda d: d.get(s.field_name) or "", reverse=not s.ascending)

        if self._offset_count:
            docs = docs[self._offset_count:]
        if self._limit_count:
            docs = docs[:self._limit_count]

        return [self.model_cls.from_db_dict(doc) for doc in docs]

    async def first_or_none(self) -> Optional[T]:
        self.limit(1)
        res = await self.to_list()
        return res[0] if res else None


class SupabaseModel(BaseModel, metaclass=ModelMeta):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    __table_name__: str = "models"

    def to_db_dict(self) -> Dict[str, Any]:
        """Convert model to a PostgreSQL/Supabase JSON-compatible dict."""
        data = self.model_dump()
        for k, v in list(data.items()):
            if isinstance(v, datetime):
                data[k] = v.isoformat()
            elif isinstance(v, Enum):
                data[k] = v.value
            elif isinstance(v, uuid.UUID):
                data[k] = str(v)
            elif isinstance(v, SupabaseModel):
                data[k] = str(v.id)
            elif isinstance(v, ModelField):
                data[k] = str(uuid.uuid4()) if k == "id" else ""
        return data

    @classmethod
    def from_db_dict(cls: Type[T], row: Dict[str, Any]) -> T:
        """Hydrate model from Supabase row dictionary."""
        if not row:
            return None
        cleaned = dict(row)
        if "id" in cleaned:
            cleaned["id"] = str(cleaned["id"])
        # Parse ISO timestamps to datetime
        for k, v in cleaned.items():
            if isinstance(v, str) and ("_at" in k or k == "created_at" or k == "updated_at" or k == "applied_at"):
                try:
                    cleaned[k] = datetime.fromisoformat(v.replace("Z", "+00:00"))
                except Exception:
                    pass
        return cls(**cleaned)

    @classmethod
    async def get(cls: Type[T], doc_id: Union[str, Any]) -> Optional[T]:
        if not doc_id:
            return None
        doc_id_str = str(getattr(doc_id, "id", doc_id))
        table_name = getattr(cls, "__table_name__", cls.__name__.lower() + "s")

        client = get_supabase_client()
        if client:
            try:
                res = client.table(table_name).select("*").eq("id", doc_id_str).execute()
                if res.data and len(res.data) > 0:
                    return cls.from_db_dict(res.data[0])
            except Exception as e:
                logger.error(f"Supabase get error on {table_name}: {e}")

        # In-memory fallback
        doc = _in_memory_db.get(table_name, {}).get(doc_id_str)
        if doc:
            return cls.from_db_dict(doc)
        return None

    @classmethod
    def find(cls: Type[T], *expressions: Any, **kwargs: Any) -> QueryBuilder[T]:
        builder = QueryBuilder(cls, list(expressions))
        if kwargs:
            builder.filter(**kwargs)
        return builder

    @classmethod
    async def find_one(cls: Type[T], *expressions: Any, **kwargs: Any) -> Optional[T]:
        builder = cls.find(*expressions, **kwargs).limit(1)
        return await builder.first_or_none()

    @classmethod
    async def count(cls: Type[T]) -> int:
        return await cls.find().count()

    async def insert(self: T) -> T:
        table_name = getattr(self.__class__, "__table_name__", self.__class__.__name__.lower() + "s")
        if not self.id or isinstance(self.id, ModelField):
            self.id = str(uuid.uuid4())
        data = self.to_db_dict()
        data["id"] = str(self.id)

        client = get_supabase_client()
        if client:
            try:
                res = client.table(table_name).insert(data).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    self.id = str(row.get("id", self.id))
            except Exception as e:
                logger.error(f"Supabase insert error on {table_name}: {e}")

        _in_memory_db.setdefault(table_name, {})[str(self.id)] = data
        return self

    async def save(self: T) -> T:
        table_name = getattr(self.__class__, "__table_name__", self.__class__.__name__.lower() + "s")
        if not self.id or isinstance(self.id, ModelField):
            self.id = str(uuid.uuid4())
        if hasattr(self, "updated_at"):
            setattr(self, "updated_at", datetime.now(timezone.utc))
        data = self.to_db_dict()
        data["id"] = str(self.id)

        client = get_supabase_client()
        if client:
            try:
                res = client.table(table_name).upsert(data).execute()
                if res.data and len(res.data) > 0:
                    row = res.data[0]
                    self.id = str(row.get("id", self.id))
            except Exception as e:
                logger.error(f"Supabase upsert error on {table_name}: {e}")

        _in_memory_db.setdefault(table_name, {})[str(self.id)] = data
        return self

    async def delete(self: T) -> bool:
        table_name = getattr(self.__class__, "__table_name__", self.__class__.__name__.lower() + "s")
        doc_id = str(self.id)
        client = get_supabase_client()
        if client:
            try:
                client.table(table_name).delete().eq("id", doc_id).execute()
            except Exception as e:
                logger.error(f"Supabase delete error on {table_name}: {e}")

        if table_name in _in_memory_db and doc_id in _in_memory_db[table_name]:
            del _in_memory_db[table_name][doc_id]
        return True

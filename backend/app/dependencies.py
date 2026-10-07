from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import get_repository
from app.models import UserPublic
from app.repository import CRMRepository
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def to_public_user(user: dict) -> UserPublic:
    return UserPublic.model_validate({key: value for key, value in user.items() if key != 'password_hash'})


def get_repo() -> CRMRepository:
    return get_repository()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    repo: CRMRepository = Depends(get_repo),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Authentication is required')
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token') from exc
    user = repo.get_user(payload['sub'])
    return user


def require_roles(*roles: str) -> Callable[[dict], dict]:
    def validator(user: dict = Depends(get_current_user)) -> dict:
        if roles and user['role'] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You do not have access to this resource')
        return user

    return validator

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_repo, require_roles, to_public_user
from app.models import UserPublic, UserUpdate
from app.repository import CRMRepository

router = APIRouter(prefix='/users', tags=['Users'])


@router.get('', response_model=list[UserPublic], dependencies=[Depends(require_roles('admin', 'manager'))])
def list_users(repo: CRMRepository = Depends(get_repo)) -> list[UserPublic]:
    return [to_public_user(user) for user in repo.list_users()]


@router.put('/me', response_model=UserPublic)
def update_profile(
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
    repo: CRMRepository = Depends(get_repo),
) -> UserPublic:
    return to_public_user(repo.update_user(current_user['id'], payload))

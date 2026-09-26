from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, get_repo, require_roles
from app.models import ActivityCreate, ActivityPublic, ActivityUpdate
from app.repository import CRMNotFoundError, CRMRepository

router = APIRouter(prefix='/activities', tags=['Activities'])


@router.get('', response_model=list[ActivityPublic])
def list_activities(
    activity_type: str | None = None,
    assigned_to_id: str | None = None,
    repo: CRMRepository = Depends(get_repo),
    _: dict = Depends(get_current_user),
) -> list[ActivityPublic]:
    return [ActivityPublic.model_validate(item) for item in repo.list_activities(activity_type=activity_type, assigned_to_id=assigned_to_id)]


@router.post('', response_model=ActivityPublic, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> ActivityPublic:
    return ActivityPublic.model_validate(repo.create_activity(payload))


@router.get('/{activity_id}', response_model=ActivityPublic)
def get_activity(activity_id: str, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> ActivityPublic:
    try:
        return ActivityPublic.model_validate(repo.get_activity(activity_id))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put('/{activity_id}', response_model=ActivityPublic)
def update_activity(
    activity_id: str,
    payload: ActivityUpdate,
    repo: CRMRepository = Depends(get_repo),
    current_user: dict = Depends(get_current_user),
) -> ActivityPublic:
    try:
        existing_activity = repo.get_activity(activity_id)
        if current_user['role'] not in {'admin', 'manager'} and existing_activity['assigned_to_id'] != current_user['id']:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You do not have access to this resource')
        return ActivityPublic.model_validate(repo.update_activity(activity_id, payload))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete('/{activity_id}', status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles('admin', 'manager'))])
def delete_activity(activity_id: str, repo: CRMRepository = Depends(get_repo)) -> None:
    try:
        repo.delete_activity(activity_id)
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

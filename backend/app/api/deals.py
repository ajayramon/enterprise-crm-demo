from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, get_repo, require_roles
from app.models import DealCreate, DealPublic, DealUpdate, PipelineStageSummary
from app.repository import CRMNotFoundError, CRMRepository

router = APIRouter(prefix='/deals', tags=['Deals'])


@router.get('', response_model=list[DealPublic])
def list_deals(
    stage: str | None = None,
    owner_id: str | None = None,
    repo: CRMRepository = Depends(get_repo),
    _: dict = Depends(get_current_user),
) -> list[DealPublic]:
    return [DealPublic.model_validate(item) for item in repo.list_deals(stage=stage, owner_id=owner_id)]


@router.post('', response_model=DealPublic, status_code=status.HTTP_201_CREATED)
def create_deal(payload: DealCreate, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> DealPublic:
    return DealPublic.model_validate(repo.create_deal(payload))


@router.get('/pipeline', response_model=list[PipelineStageSummary])
def pipeline_summary(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> list[PipelineStageSummary]:
    return repo.get_pipeline_summary()


@router.get('/{deal_id}', response_model=DealPublic)
def get_deal(deal_id: str, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> DealPublic:
    try:
        return DealPublic.model_validate(repo.get_deal(deal_id))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put('/{deal_id}', response_model=DealPublic)
def update_deal(deal_id: str, payload: DealUpdate, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> DealPublic:
    try:
        return DealPublic.model_validate(repo.update_deal(deal_id, payload))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete('/{deal_id}', status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles('admin', 'manager'))])
def delete_deal(deal_id: str, repo: CRMRepository = Depends(get_repo)) -> None:
    try:
        repo.delete_deal(deal_id)
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status

from app.dependencies import get_current_user, get_repo, require_roles
from app.models import CustomerCreate, CustomerPublic, CustomerUpdate
from app.repository import CRMNotFoundError, CRMRepository

router = APIRouter(prefix='/customers', tags=['Customers'])


@router.get('', response_model=list[CustomerPublic])
def list_customers(
    industry: str | None = None,
    status: str | None = Query(default=None),
    repo: CRMRepository = Depends(get_repo),
    _: dict = Depends(get_current_user),
) -> list[CustomerPublic]:
    return [CustomerPublic.model_validate(item) for item in repo.list_customers(industry=industry, status=status)]


@router.post('', response_model=CustomerPublic, status_code=http_status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    current_user: dict = Depends(get_current_user),
    repo: CRMRepository = Depends(get_repo),
) -> CustomerPublic:
    return CustomerPublic.model_validate(repo.create_customer(payload, current_user['id'], current_user['name']))


@router.get('/{customer_id}', response_model=CustomerPublic)
def get_customer(customer_id: str, repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> CustomerPublic:
    try:
        return CustomerPublic.model_validate(repo.get_customer(customer_id))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put('/{customer_id}', response_model=CustomerPublic)
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    repo: CRMRepository = Depends(get_repo),
    _: dict = Depends(get_current_user),
) -> CustomerPublic:
    try:
        return CustomerPublic.model_validate(repo.update_customer(customer_id, payload))
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete('/{customer_id}', status_code=http_status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles('admin', 'manager'))])
def delete_customer(customer_id: str, repo: CRMRepository = Depends(get_repo)) -> None:
    try:
        repo.delete_customer(customer_id)
    except CRMNotFoundError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

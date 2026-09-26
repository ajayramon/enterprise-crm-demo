from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, get_repo, to_public_user
from app.models import LoginRequest, TokenResponse, UserCreate, UserPublic
from app.repository import CRMConflictError, CRMRepository
from app.security import create_access_token

router = APIRouter(prefix='/auth', tags=['Authentication'])


@router.post('/login', response_model=TokenResponse)
def login(payload: LoginRequest, repo: CRMRepository = Depends(get_repo)) -> TokenResponse:
    user = repo.authenticate(str(payload.email), payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid email or password')
    public_user = to_public_user(user)
    return TokenResponse(access_token=create_access_token(public_user.id, public_user.role), user=public_user)


@router.post('/register', response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, repo: CRMRepository = Depends(get_repo)) -> UserPublic:
    try:
        user = repo.create_user(payload.model_copy(update={'role': 'sales_rep'}))
    except CRMConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return to_public_user(user)


@router.get('/me', response_model=UserPublic)
def me(current_user: dict = Depends(get_current_user)) -> UserPublic:
    return to_public_user(current_user)

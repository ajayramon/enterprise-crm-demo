from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, get_repo
from app.models import AcquisitionMetric, ActivityReportSummary, DashboardMetrics, PipelineStageSummary, RevenueForecastPoint
from app.repository import CRMRepository

router = APIRouter(prefix='/analytics', tags=['Analytics'])


@router.get('/dashboard', response_model=DashboardMetrics)
def dashboard(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> DashboardMetrics:
    return repo.get_dashboard_metrics()


@router.get('/pipeline', response_model=list[PipelineStageSummary])
def pipeline(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> list[PipelineStageSummary]:
    return repo.get_pipeline_summary()


@router.get('/forecast', response_model=list[RevenueForecastPoint])
def forecast(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> list[RevenueForecastPoint]:
    return repo.get_revenue_forecast()


@router.get('/acquisition', response_model=list[AcquisitionMetric])
def acquisition(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> list[AcquisitionMetric]:
    return repo.get_acquisition_metrics()


@router.get('/activity-report', response_model=list[ActivityReportSummary])
def activity_report(repo: CRMRepository = Depends(get_repo), _: dict = Depends(get_current_user)) -> list[ActivityReportSummary]:
    return repo.get_activity_report()

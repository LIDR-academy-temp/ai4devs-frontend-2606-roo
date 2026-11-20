const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3010';

export type InterviewStep = {
    id: number;
    name: string;
    orderIndex: number;
};

export type PositionApplication = {
    id: number;
    applicationId: number;
    fullName: string;
    averageScore: number;
    currentInterviewStep: string;
};

type InterviewFlowResponse = {
    interviewFlow: {
        positionName: string;
        interviewFlow: { interviewSteps: InterviewStep[] };
    };
};

export type PositionBoard = {
    positionName: string;
    steps: InterviewStep[];
    applications: PositionApplication[];
};

async function request<T>(path: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, options);
    if (!response.ok) {
        throw new Error(`${options.method || 'GET'} ${path} (${response.status})`);
    }
    return response.json();
}

export async function getPositionApplications(positionId: number, signal: AbortSignal) {
    const applications = await request<PositionApplication[]>(`/position/${positionId}/candidates`, {
        signal,
        cache: 'no-store',
    });
    if (!Array.isArray(applications)) throw new Error('Invalid applications response');
    return applications;
}

export async function getPositionBoard(positionId: number, signal: AbortSignal): Promise<PositionBoard> {
    const [flow, applications] = await Promise.all([
        request<InterviewFlowResponse>(`/position/${positionId}/interviewflow`, { signal, cache: 'no-store' }),
        getPositionApplications(positionId, signal),
    ]);
    const { positionName, interviewFlow } = flow.interviewFlow;

    return {
        positionName,
        steps: [...interviewFlow.interviewSteps].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id),
        applications,
    };
}

export async function updateApplicationStep(
    positionId: number,
    application: PositionApplication,
    stepId: number,
    signal: AbortSignal,
) {
    const { data } = await request<{
        data?: { id: number; candidateId: number; positionId: number; currentInterviewStep: number };
    }>(`/candidates/${application.id}`, {
        method: 'PUT',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.applicationId, currentInterviewStep: stepId }),
    });

    return data?.id === application.applicationId
        && data.candidateId === application.id
        && data.positionId === positionId
        && data.currentInterviewStep === stepId;
}

// Cliente de los tres endpoints que usa la vista "position". Contratos reales del backend de este repositorio
// (puerto 3010): la ruta es /position (singular), el flujo viene envuelto en { interviewFlow: ... } y la
// actualización de fase es PUT /candidates/:id (no /candidates/:id/stage).
const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3010';

export interface InterviewStep {
    id: number;
    interviewFlowId: number;
    interviewTypeId: number;
    name: string;
    orderIndex: number;
}

export interface InterviewFlowResponse {
    interviewFlow: {
        positionName: string;
        interviewFlow: {
            id: number;
            description: string;
            interviewSteps: InterviewStep[];
        };
    };
}

export interface PositionCandidate {
    id: number; // identificador del candidato (el PUT lo usa en la URL)
    applicationId: number;
    fullName: string;
    currentInterviewStep: string; // nombre de la fase
    averageScore: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, options);
    } catch {
        throw new Error('No se pudo conectar con el servidor.');
    }
    if (!response.ok) {
        throw new Error(`Error ${response.status} del servidor.`);
    }
    return (await response.json()) as T;
}

export const getInterviewFlow = (positionId: string) =>
    request<InterviewFlowResponse>(`/position/${positionId}/interviewflow`);

export const getPositionCandidates = (positionId: string) =>
    request<PositionCandidate[]>(`/position/${positionId}/candidates`);

export const updateCandidateStage = (candidateId: number, applicationId: number, stepId: number) =>
    request<{ message: string }>(`/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: String(applicationId), currentInterviewStep: String(stepId) }),
    });

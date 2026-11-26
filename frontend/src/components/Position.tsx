import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Card, Container, Spinner } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import { useNavigate, useParams } from 'react-router-dom';
import {
    InterviewStep,
    PositionCandidate,
    getInterviewFlow,
    getPositionCandidates,
    updateCandidateStage,
} from '../services/positionService';
import './Position.css';

// Orden de fases: por orderIndex y, si empatan (en los datos de ejemplo hay dos fases con orderIndex 2), por id.
const sortSteps = (steps: InterviewStep[]) => [...steps].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);

const formatScore = (value: number) => String(Math.round(Number(value) * 10) / 10);

const Position: React.FC = () => {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [positionName, setPositionName] = useState('');
    const [steps, setSteps] = useState<InterviewStep[]>([]);
    const [candidates, setCandidates] = useState<PositionCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragOverStep, setDragOverStep] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([getInterviewFlow(id), getPositionCandidates(id)])
            .then(([flow, list]) => {
                if (cancelled) return;
                setPositionName(flow.interviewFlow.positionName);
                setSteps(sortSteps(flow.interviewFlow.interviewFlow.interviewSteps));
                setCandidates(list);
            })
            .catch((e: Error) => !cancelled && setError(e.message))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [id]);

    // Mueve la tarjeta de forma optimista y, si el servidor falla, la devuelve a su fase anterior.
    const moveCandidate = useCallback(
        async (applicationId: number, step: InterviewStep) => {
            const current = candidates.find((c) => c.applicationId === applicationId);
            if (!current || current.currentInterviewStep === step.name) return;
            const previous = current.currentInterviewStep;
            const setStep = (name: string) =>
                setCandidates((list) =>
                    list.map((c) => (c.applicationId === applicationId ? { ...c, currentInterviewStep: name } : c)),
                );
            setError(null);
            setStep(step.name);
            try {
                await updateCandidateStage(current.id, applicationId, step.id);
            } catch (e) {
                setStep(previous);
                setError(`No se pudo actualizar la fase de ${current.fullName}. ${(e as Error).message}`);
            }
        },
        [candidates],
    );

    const handleDrop = (event: React.DragEvent, step: InterviewStep) => {
        event.preventDefault();
        setDragOverStep(null);
        const applicationId = Number(event.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(applicationId)) moveCandidate(applicationId, step);
    };

    return (
        <Container className="mt-4 position-page">
            <div className="d-flex align-items-center mb-4">
                <button
                    type="button"
                    className="btn btn-link text-dark p-0 me-3"
                    aria-label="Volver al listado de posiciones"
                    onClick={() => navigate('/positions')}
                >
                    <ArrowLeft size={28} />
                </button>
                <h2 className="mb-0" data-testid="position-title">
                    {positionName || 'Posición'}
                </h2>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {loading && <Spinner animation="border" role="status" aria-label="Cargando" />}

            {!loading && (
                <div className="kanban">
                    {steps.map((step) => {
                        const cards = candidates.filter((c) => c.currentInterviewStep === step.name);
                        return (
                            <section
                                key={step.id}
                                className={`kanban-column${dragOverStep === step.id ? ' kanban-column-over' : ''}`}
                                aria-label={step.name}
                                data-testid={`column-${step.id}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOverStep(step.id);
                                }}
                                onDragLeave={() => setDragOverStep((s) => (s === step.id ? null : s))}
                                onDrop={(e) => handleDrop(e, step)}
                            >
                                <h5 className="kanban-column-title">
                                    {step.name} <span className="badge bg-secondary">{cards.length}</span>
                                </h5>
                                {cards.map((c) => (
                                    <Card
                                        key={c.applicationId}
                                        className="kanban-card shadow-sm mb-2"
                                        draggable
                                        data-testid={`card-${c.applicationId}`}
                                        onDragStart={(e: React.DragEvent) => {
                                            e.dataTransfer.setData('text/plain', String(c.applicationId));
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                    >
                                        <Card.Body className="py-2">
                                            <div className="fw-bold">{c.fullName}</div>
                                            <div className="text-muted" title="Puntuación media">
                                                ★ {formatScore(c.averageScore)}
                                            </div>
                                            {/* Alternativa accesible y táctil al arrastre */}
                                            <select
                                                className="form-select form-select-sm mt-2"
                                                aria-label={`Mover a ${c.fullName} a otra fase`}
                                                value={step.id}
                                                onChange={(e) => {
                                                    const target = steps.find((s) => s.id === Number(e.target.value));
                                                    if (target) moveCandidate(c.applicationId, target);
                                                }}
                                            >
                                                {steps.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </section>
                        );
                    })}
                </div>
            )}
        </Container>
    );
};

export default Position;

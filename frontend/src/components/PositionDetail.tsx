import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, GripVertical } from 'react-bootstrap-icons';
import { Link, useParams } from 'react-router-dom';
import {
    getPositionApplications,
    getPositionBoard,
    InterviewStep,
    PositionApplication,
    PositionBoard,
    updateApplicationStep,
} from '../services/positionService';
import { useApplicationDrag } from './useApplicationDrag';
import './PositionDetail.css';

function PositionKanban({ positionId }: { positionId: number }) {
    const [board, setBoard] = useState<PositionBoard>();
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState('');
    const [announcement, setAnnouncement] = useState('');
    const [pendingId, setPendingId] = useState<number>();
    const [requiresRefresh, setRequiresRefresh] = useState(false);
    const busy = useRef(false);
    const controller = useRef<AbortController>();

    useEffect(() => {
        const request = new AbortController();
        controller.current = request;
        getPositionBoard(positionId, request.signal)
            .then((result) => {
                if (!request.signal.aborted) setBoard(result);
            })
            .catch(() => {
                if (!request.signal.aborted) setAlert('No se pudo consultar el tablero.');
            })
            .finally(() => {
                if (!request.signal.aborted) setLoading(false);
            });
        return () => request.abort();
    }, [positionId]);

    const stepCounts = new Map<string, number>();
    for (const step of board?.steps ?? []) {
        stepCounts.set(step.name, (stepCounts.get(step.name) ?? 0) + 1);
    }
    const unassigned = board?.applications.filter(({ currentInterviewStep }) =>
        stepCounts.get(currentInterviewStep) !== 1,
    ) ?? [];
    const inconsistent = unassigned.length > 0 || Array.from(stepCounts.values()).some((count) => count > 1);

    async function refreshBoard() {
        const signal = controller.current?.signal;
        if (!signal || signal.aborted || busy.current) return;
        busy.current = true;
        setLoading(true);
        setAnnouncement('');
        try {
            const result = await getPositionBoard(positionId, signal);
            if (signal.aborted) return;
            setBoard(result);
            setAlert('');
            setRequiresRefresh(false);
        } catch {
            if (signal.aborted) return;
            setAlert('No se pudo consultar el tablero.');
            setRequiresRefresh(true);
        } finally {
            busy.current = false;
            if (!signal.aborted) setLoading(false);
        }
    }

    async function moveApplication(application: PositionApplication, stepId: number) {
        const signal = controller.current?.signal;
        const target = board?.steps.find(({ id }) => id === stepId);
        if (!board || !signal || signal.aborted || busy.current || loading || requiresRefresh || !target
            || application.currentInterviewStep === target.name
            || stepCounts.get(application.currentInterviewStep) !== 1 || stepCounts.get(target.name) !== 1) return;

        busy.current = true;
        setPendingId(application.applicationId);
        setAnnouncement('');
        setAlert('');
        let writeConfirmed = false;
        try {
            writeConfirmed = await updateApplicationStep(positionId, application, target.id, signal);
        } catch {
            // Even after a failed response, the server may have saved the move.
        }

        try {
            if (signal.aborted) return;
            const applications = await getPositionApplications(positionId, signal);
            if (signal.aborted) return;
            setBoard({ ...board, applications });
            const readConfirmed = applications.some(({ applicationId, id, currentInterviewStep }) =>
                applicationId === application.applicationId && id === application.id && currentInterviewStep === target.name,
            );
            if (writeConfirmed && readConfirmed) {
                setAnnouncement(`${application.fullName} se movió a ${target.name}.`);
            } else {
                setAlert('No se pudo confirmar el movimiento. El tablero muestra la última consulta.');
            }
        } catch {
            if (signal.aborted) return;
            setRequiresRefresh(true);
            setAlert('No se pudo confirmar el movimiento ni volver a consultar las candidaturas.');
        } finally {
            busy.current = false;
            if (!signal.aborted) setPendingId(undefined);
        }
    }

    const { boardRef, targetId, selectedId, draggedId, startDrag, moveDrag, endDrag, cancelDrag } = useApplicationDrag(moveApplication);
    const controlsDisabled = loading || requiresRefresh || pendingId !== undefined;

    function renderApplication(application: PositionApplication, step?: InterviewStep) {
        const targets = board?.steps.filter(({ name }) => name !== step?.name && stepCounts.get(name) === 1) ?? [];
        const canMove = Boolean(step && targets.length);
        const canDrag = canMove && !controlsDisabled;
        const cardClasses = [
            'card position-kanban-card',
            canDrag && 'position-kanban-draggable',
            selectedId === application.applicationId && 'position-kanban-selected',
            draggedId === application.applicationId && 'position-kanban-dragging',
        ].filter(Boolean).join(' ');

        return (
            <li
                key={application.applicationId}
                className={cardClasses}
                onPointerDown={(event) => {
                    const source = event.target;
                    if (!canDrag || !(source instanceof Element) || source.closest('select')) return;
                    if (event.pointerType === 'touch' && !source.closest('.position-kanban-handle')) return;
                    startDrag(event, application);
                }}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onLostPointerCapture={cancelDrag}
                onPointerCancel={cancelDrag}
            >
                <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                        <h3 className="h6 mb-2 text-break">{application.fullName}</h3>
                        {canMove && (
                            <span
                                className="position-kanban-handle text-secondary"
                                aria-hidden="true"
                                title="Arrastrar candidatura"
                            >
                                <GripVertical size={20} />
                            </span>
                        )}
                    </div>
                    <p className="small mb-2 text-secondary">Media de entrevistas <strong>{application.averageScore}</strong></p>
                    {pendingId === application.applicationId && <p className="small mb-0" role="status">Guardando movimiento…</p>}
                    {canMove && (
                        <select
                            className="form-select form-select-sm"
                            aria-label={`Mover a otra fase · ${application.fullName}`}
                            value=""
                            disabled={controlsDisabled}
                            onChange={(event) => void moveApplication(application, Number(event.target.value))}
                        >
                            <option value="" disabled>Mover a…</option>
                            {targets.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}
                        </select>
                    )}
                </div>
            </li>
        );
    }

    return (
        <main className="container-fluid px-3 px-md-4 py-4 position-kanban">
            <header className="d-flex gap-3 align-items-center mb-4">
                <Link className="btn btn-outline-secondary d-inline-flex p-2" to="/positions" aria-label="Volver a posiciones">
                    <ArrowLeft size={22} aria-hidden="true" />
                </Link>
                <h1 className="h2 mb-0 text-break">{board?.positionName ?? 'Detalle de posición'}</h1>
            </header>
            {loading && <p role="status">Consultando el tablero…</p>}
            <p className="visually-hidden" role="status">{announcement}</p>
            {alert && <p className="alert alert-warning" role="alert">{alert}</p>}
            {inconsistent && (
                <p className="alert alert-warning" role="alert">
                    Hay nombres de fase repetidos o sin correspondencia. Las candidaturas sin fase identificable y los destinos ambiguos tienen el movimiento deshabilitado.
                </p>
            )}
            {(alert || inconsistent) && (
                <button type="button" className="btn btn-outline-primary mb-3" disabled={loading || pendingId !== undefined} onClick={refreshBoard}>
                    Volver a consultar
                </button>
            )}
            {board?.steps.length === 0 && <p>El flujo de entrevistas no tiene fases.</p>}
            <div ref={boardRef} className="position-kanban-scroll">
                <div className="row g-0 gap-3 mx-0 flex-md-nowrap">
                    {board?.steps.map((step) => {
                        const unique = stepCounts.get(step.name) === 1;
                        const applications = unique ? board.applications.filter(({ currentInterviewStep }) => currentInterviewStep === step.name) : [];
                        return (
                            <section className="col-12 col-md position-kanban-column px-0" key={step.id} aria-labelledby={`step-${step.id}`}>
                                <div
                                    className={`position-kanban-stage rounded border p-3 ${targetId === step.id ? 'position-kanban-target' : 'bg-light'}`}
                                    data-step-id={unique ? step.id : undefined}
                                >
                                    <h2 className="h5 mb-3 text-break" id={`step-${step.id}`}>{step.name}</h2>
                                    {applications.length > 0 ? (
                                        <ul className="list-unstyled d-grid gap-2 mb-0">
                                            {applications.map((application) => renderApplication(application, step))}
                                        </ul>
                                    ) : <p className="small text-secondary mb-0">{unique ? 'Sin candidaturas' : 'Fase ambigua'}</p>}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
            {unassigned.length > 0 && (
                <section className="mt-4" aria-labelledby="unassigned-applications">
                    <h2 id="unassigned-applications" className="h5">Candidaturas con fase sin identificar</h2>
                    <ul className="list-unstyled d-grid gap-2 mb-0">
                        {unassigned.map((application) => renderApplication(application))}
                    </ul>
                </section>
            )}
        </main>
    );
}

export default function PositionDetail() {
    const { id } = useParams();
    const positionId = Number(id);

    if (!id || !/^\d+$/.test(id) || !Number.isSafeInteger(positionId) || positionId <= 0) {
        return (
            <main className="container mt-4">
                <h1 className="h2">Posición inválida</h1>
                <Link to="/positions">Volver a posiciones</Link>
            </main>
        );
    }

    return <PositionKanban key={positionId} positionId={positionId} />;
}

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { PositionApplication } from '../services/positionService';

type Point = { x: number; y: number };
type Drag = Point & {
    application: PositionApplication;
    pointerId: number;
    origin: Point;
    source: HTMLElement;
    offset: Point;
    preview?: HTMLElement;
    frame?: number;
};

const edgeSize = 48;

function scrollDelta(point: number, start: number, end: number) {
    if (point < start + edgeSize) return -Math.min(14, Math.ceil((start + edgeSize - point) / 4));
    if (point > end - edgeSize) return Math.min(14, Math.ceil((point - end + edgeSize) / 4));
    return 0;
}

function createPreview(source: HTMLElement) {
    const preview = document.createElement('ul');
    preview.className = 'position-kanban-drag-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.setAttribute('inert', '');
    preview.style.width = `${source.getBoundingClientRect().width}px`;

    const card = source.cloneNode(true) as HTMLElement;
    card.classList.add('position-kanban-selected');
    const sourceSelect = source.querySelector('select');
    const previewSelect = card.querySelector('select');
    if (sourceSelect && previewSelect) previewSelect.selectedIndex = sourceSelect.selectedIndex;
    preview.append(card);
    document.body.append(preview);
    return preview;
}

function clearDrag(drag?: Drag) {
    if (drag?.frame !== undefined) cancelAnimationFrame(drag.frame);
    drag?.preview?.remove();
}

export function useApplicationDrag(onDrop: (application: PositionApplication, stepId: number) => void) {
    const boardRef = useRef<HTMLDivElement>(null);
    const drag = useRef<Drag>();
    const [targetId, setTargetId] = useState<number>();
    const [selectedId, setSelectedId] = useState<number>();
    const [draggedId, setDraggedId] = useState<number>();

    useEffect(() => () => clearDrag(drag.current), []);

    function getTarget({ x, y }: Point) {
        const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-step-id]');
        if (target && boardRef.current?.contains(target)) return Number(target.dataset.stepId);
    }

    function scrollWhileDragging() {
        const current = drag.current;
        const board = boardRef.current;
        if (!current || !board || !current.preview) return;

        current.preview.style.transform = `translate3d(${current.x - current.offset.x}px, ${current.y - current.offset.y}px, 0)`;
        const { left, right } = board.getBoundingClientRect();
        if (board.scrollWidth > board.clientWidth) board.scrollLeft += scrollDelta(current.x, left, right);
        const vertical = scrollDelta(current.y, 0, window.innerHeight);
        if (vertical) window.scrollBy(0, vertical);
        setTargetId(getTarget(current));
        current.frame = requestAnimationFrame(scrollWhileDragging);
    }

    function startDrag(event: PointerEvent<HTMLElement>, application: PositionApplication) {
        if (drag.current || !event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        const origin = { x: event.clientX, y: event.clientY };
        const source = event.currentTarget;
        const { left, top } = source.getBoundingClientRect();
        source.setPointerCapture(event.pointerId);
        drag.current = {
            ...origin,
            origin,
            source,
            offset: { x: origin.x - left, y: origin.y - top },
            pointerId: event.pointerId,
            application,
        };
        setSelectedId(application.applicationId);
    }

    function moveDrag(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (!current || event.pointerId !== current.pointerId) return;
        current.x = event.clientX;
        current.y = event.clientY;
        if (current.frame !== undefined || Math.hypot(current.x - current.origin.x, current.y - current.origin.y) < 6) return;

        current.preview = createPreview(current.source);
        setDraggedId(current.application.applicationId);
        scrollWhileDragging();
    }

    function cancelDrag(event: PointerEvent<HTMLElement>) {
        if (drag.current?.pointerId !== event.pointerId) return;
        clearDrag(drag.current);
        drag.current = undefined;
        setTargetId(undefined);
        setSelectedId(undefined);
        setDraggedId(undefined);
    }

    function endDrag(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (!current || event.pointerId !== current.pointerId) return;
        const target = current.frame === undefined ? undefined : getTarget({ x: event.clientX, y: event.clientY });
        cancelDrag(event);
        if (target !== undefined) onDrop(current.application, target);
    }

    return { boardRef, targetId, selectedId, draggedId, startDrag, moveDrag, endDrag, cancelDrag };
}
